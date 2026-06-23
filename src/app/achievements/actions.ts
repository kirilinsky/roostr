"use server";

import { getSession } from "@/lib/auth";
import { getProfileMetrics, recordAchievementUnlocks } from "@/db/queries";
import { PROFILE_ACHIEVEMENTS, evaluate } from "@/lib/achievements";

// Evaluate the caller's profile achievements, persist any newly satisfied, and
// return the NEWLY-unlocked ids. Call right after an earn action (lab/farm claim,
// etc.) so an unlock toasts at that moment — not only when the player next opens
// their profile. Idempotent (recordAchievementUnlocks → onConflictDoNothing), so
// repeated calls return [] once persisted.
export async function syncProfileAchievementsAction(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];
  const metrics = await getProfileMetrics(session.id);
  const satisfied = evaluate(PROFILE_ACHIEVEMENTS, metrics)
    .filter((s) => s.unlocked)
    .map((s) => s.def.id);
  if (!satisfied.length) return [];
  return recordAchievementUnlocks(session.id, satisfied);
}
