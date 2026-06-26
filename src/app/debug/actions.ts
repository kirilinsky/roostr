"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { grantCoins, backfillCosmetics } from "@/db/queries";

// DEV faucet — admin-only grant of Corn Coins to self (for testing upgrades/
// economy until battle/farm rewards are wired). Guarded server-side; writes a
// ledger row (kind = admin_grant).
export async function grantSelfCoinsAction(
  amount: number,
): Promise<{ ok: boolean; coins?: number }> {
  const session = await getSession();
  if (!session || !isAdmin(session.id)) return { ok: false };
  const coins = await grantCoins(session.id, amount, "admin_grant");
  revalidatePath("/debug");
  return { ok: coins !== null, coins: coins ?? undefined };
}

// Bake the V2 avatar look (`meta.cosmetic`) onto existing roostrs that lack it.
// Admin-only, idempotent. Run once after deploying the V2 cosmetic model.
export async function backfillCosmeticsAction(): Promise<{
  ok: boolean;
  updated?: number;
  total?: number;
}> {
  const session = await getSession();
  if (!session || !isAdmin(session.id)) return { ok: false };
  const res = await backfillCosmetics();
  return { ok: true, ...res };
}
