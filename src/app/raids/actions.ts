"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  buyRaidSlot,
  launchRaid,
  resolveRaid,
  type LaunchRaidResult,
  type ResolveRaidResult,
} from "@/db/queries";

export type RaidSlotResult = { ok: boolean; error?: "auth" | "max" | "coins" | "db" };

// Buy the next raider slot with coins. Open to everyone since phase 2 (the raids
// window itself is public now).
export async function buyRaidSlotAction(): Promise<RaidSlotResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await buyRaidSlot(session.id);
  if (res.ok) revalidatePath("/raids");
  return res;
}

// Launch a raid vs a bot OR a real player: costs 1 feather, locks the party
// (status "raiding") for the mission duration. All validation (party ownership,
// one raid in flight, feather balance, and — for real targets — shield/cooldown/
// eligibility) is server-side in launchRaid. `targetId` is a bot id or a "u:<id>"
// token; the raw victim id is never exposed to the client.
export async function launchRaidAction(
  targetId: string,
  partyIds: string[],
): Promise<LaunchRaidResult | { ok: false; reason: "auth" }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "auth" };
  const res = await launchRaid(session.id, targetId, partyIds);
  if (res.ok) {
    revalidatePath("/raids");
    revalidatePath("/collection");
  }
  return res;
}

// Collect a finished raid: rolls the outcome, pays the loot, applies the HP cost
// and returns the party to "active".
export async function collectRaidAction(
  raidId: string,
): Promise<ResolveRaidResult | { ok: false; reason: "auth" }> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "auth" };
  const res = await resolveRaid(raidId, session.id);
  if (res.ok) {
    revalidatePath("/raids");
    revalidatePath("/collection");
  }
  return res;
}
