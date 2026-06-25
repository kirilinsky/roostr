"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { claimQuest } from "@/db/queries";

// Claim a quest reward. Server-validated (the quest must be READY) + claim-once.
// Revalidates the surfaces that show quest state / balances.
export async function claimQuestAction(
  questId: string,
): Promise<{ ok: boolean; resource?: string; amount?: number }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const res = await claimQuest(session.id, questId);
  if (res.ok) {
    revalidatePath(`/${session.id}`);
    revalidatePath("/notifications");
  }
  return res;
}
