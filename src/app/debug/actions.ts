"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { grantCoins, grantResource, backfillCosmetics, damageRoostr } from "@/db/queries";

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

// DEV faucet — admin-only grant of Science to self (for testing the synth-gene
// shop / lab sinks). Same guard + ledger row (kind = admin_grant) as coins.
export async function grantSelfSciAction(
  amount: number,
): Promise<{ ok: boolean; sci?: number }> {
  const session = await getSession();
  if (!session || !isAdmin(session.id)) return { ok: false };
  const sci = await grantResource(session.id, "sci", amount, "admin_grant");
  revalidatePath("/debug");
  return { ok: sci !== null, sci: sci ?? undefined };
}

// DEV ONLY (admin) — knock 2 HP off one of your birds (→ max−2) so the Hospital
// has a quick patient to heal (real damage will come from raids/battles).
export async function debugDamageRoostrAction(
  roostrId: string,
): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session || !isAdmin(session.id)) return { ok: false };
  const ok = await damageRoostr(roostrId, session.id, 2);
  if (ok) revalidatePath(`/collection/${roostrId}`);
  return { ok };
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
