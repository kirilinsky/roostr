"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  canUpgradeGene,
  geneLevelOf,
  geneUpgradeCost,
  upgradeGeneLevel,
} from "@/lib/roostr";
import { validateText, NICKNAME_RULE } from "@/lib/validation";
import {
  getRoostr,
  setGeneLevels,
  setNickname,
  spendCoins,
  grantCoins,
  createGift,
} from "@/db/queries";

export type UpgradeResult =
  | { ok: true; level: number; coins: number }
  | {
      ok: false;
      error:
        | "auth"
        | "notfound"
        | "owner"
        | "locked"
        | "gene"
        | "max"
        | "coins"
        | "save";
    };

// Upgrade one gene by a level: owner-guarded, spend coins atomically, bump the
// gene's level and persist it. Cost depends on the gene's current level. Refunds
// the coins if the level write fails (best-effort consistency without a tx).
export async function upgradeGeneAction(
  roostrId: string,
  geneId: string,
): Promise<UpgradeResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const row = await getRoostr(roostrId);
  if (!row) return { ok: false, error: "notfound" };
  if (row.ownerId !== session.id) return { ok: false, error: "owner" };
  // A listed / sold / recycled bird is locked — no upgrades while on the market.
  if (row.status !== "active") return { ok: false, error: "locked" };
  if (!row.geneIds.includes(geneId)) return { ok: false, error: "gene" };

  const levels = row.geneLevels ?? {};
  const level = geneLevelOf(levels, geneId);
  if (!canUpgradeGene(level)) return { ok: false, error: "max" };

  const cost = geneUpgradeCost(level);
  const coins = await spendCoins(session.id, cost, "upgrade", roostrId);
  if (coins === null) return { ok: false, error: "coins" };

  const saved = await setGeneLevels(
    roostrId,
    session.id,
    upgradeGeneLevel(levels, geneId),
  );
  if (!saved) {
    await grantCoins(session.id, cost, "refund", roostrId); // spend bought nothing
    return { ok: false, error: "save" };
  }

  revalidatePath(`/collection/${roostrId}`);
  return { ok: true, level: level + 1, coins };
}

export type RenameResult =
  | { ok: true; nickname: string | null }
  | {
      ok: false;
      error: "auth" | "notfound" | "owner" | "invalid" | "save";
    };

// Set (or clear) a roostr's custom nickname: owner-guarded, validated server-side
// via the SHARED rule (NICKNAME_RULE) so the client can't bypass it. Renaming is a
// cosmetic edit, allowed at any status. Empty input clears back to the breed name.
export async function renameRoostrAction(
  roostrId: string,
  raw: string,
): Promise<RenameResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const row = await getRoostr(roostrId);
  if (!row) return { ok: false, error: "notfound" };
  if (row.ownerId !== session.id) return { ok: false, error: "owner" };

  const v = validateText(raw, NICKNAME_RULE);
  if (!v.ok) return { ok: false, error: "invalid" };

  const saved = await setNickname(roostrId, session.id, v.value);
  if (!saved) return { ok: false, error: "save" };

  revalidatePath(`/collection/${roostrId}`);
  return { ok: true, nickname: v.value };
}

// Clear a roostr's nickname back to the breed-name default. Separate from rename
// so saving can require a non-empty name while deletion stays a deliberate action.
export async function clearNicknameAction(
  roostrId: string,
): Promise<RenameResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const row = await getRoostr(roostrId);
  if (!row) return { ok: false, error: "notfound" };
  if (row.ownerId !== session.id) return { ok: false, error: "owner" };

  const saved = await setNickname(roostrId, session.id, null);
  if (!saved) return { ok: false, error: "save" };

  revalidatePath(`/collection/${roostrId}`);
  return { ok: true, nickname: null };
}

export type GiftResult =
  | { ok: true }
  | { ok: false; error: string };

// Gift an active bird to a friend: owner + friendship + status all server-checked
// in createGift (CAS lock to "gifting"). The recipient then accepts/declines.
export async function giftRoostrAction(
  roostrId: string,
  toUserId: number,
): Promise<GiftResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const res = await createGift(roostrId, session.id, toUserId);
  if (!res.ok) return { ok: false, error: res.reason ?? "error" };

  revalidatePath(`/collection/${roostrId}`);
  revalidatePath("/collection");
  revalidatePath("/notifications");
  return { ok: true };
}
