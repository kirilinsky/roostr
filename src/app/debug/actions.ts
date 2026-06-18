"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { grantCoins } from "@/db/queries";

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
