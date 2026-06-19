"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  canUpgradeGene,
  geneLevelOf,
  geneUpgradeCost,
  upgradeGeneLevel,
} from "@/lib/roostr";
import {
  getRoostr,
  setGeneLevels,
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
