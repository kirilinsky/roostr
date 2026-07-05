"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { buyRaidSlot } from "@/db/queries";

export type RaidSlotResult = { ok: boolean; error?: "auth" | "max" | "coins" | "db" };

// Buy the next raider slot with coins. ADMIN-ONLY during dev — raids aren't open to
// everyone yet (the page itself is admin-gated).
export async function buyRaidSlotAction(): Promise<RaidSlotResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.id)) return { ok: false, error: "auth" };
  const res = await buyRaidSlot(session.id);
  if (res.ok) revalidatePath("/raids");
  return res;
}
