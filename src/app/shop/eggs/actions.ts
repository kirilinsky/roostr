"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { buyShopEgg } from "@/db/queries";

export type BuyEggResult =
  | { ok: true; coins: number; price: number }
  | { ok: false; reason: string; price?: number };

// Buy one egg from the system shop at the current escalating price. Price is
// computed + charged server-side (buyShopEgg); the client value is display only.
export async function buyEggAction(): Promise<BuyEggResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "auth" };

  const res = await buyShopEgg(session.id);
  if (!res.ok) return { ok: false, reason: res.reason ?? "error", price: res.price };

  revalidatePath("/shop/eggs");
  return { ok: true, coins: res.coins ?? 0, price: res.price ?? 0 };
}
