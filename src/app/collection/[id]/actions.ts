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
      error: "auth" | "notfound" | "owner" | "locked" | "invalid" | "save";
    };

// Set (or clear) a roostr's custom nickname: owner-guarded, active-only, validated
// server-side via the SHARED rule (NICKNAME_RULE) so the client can't bypass it.
// Empty input clears the nickname back to the breed-name default.
export async function renameRoostrAction(
  roostrId: string,
  raw: string,
): Promise<RenameResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  const row = await getRoostr(roostrId);
  if (!row) return { ok: false, error: "notfound" };
  if (row.ownerId !== session.id) return { ok: false, error: "owner" };
  // A listed / sold / recycled bird is locked — no edits while off the roster.
  if (row.status !== "active") return { ok: false, error: "locked" };

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
  if (row.status !== "active") return { ok: false, error: "locked" };

  const saved = await setNickname(roostrId, session.id, null);
  if (!saved) return { ok: false, error: "save" };

  revalidatePath(`/collection/${roostrId}`);
  return { ok: true, nickname: null };
}
