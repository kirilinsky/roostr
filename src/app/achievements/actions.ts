"use server";

import { getSession } from "@/lib/auth";
import { syncProfileAchievements } from "@/db/queries";

// Evaluate the caller's profile achievements, persist any newly satisfied, and
// return the NEWLY-unlocked ids. Call right after an earn action (lab/farm claim,
// etc.) so an unlock toasts at that moment — not only when the player next opens
// their profile. Idempotent (recordAchievementUnlocks → onConflictDoNothing), so
// repeated calls return [] once persisted.
export async function syncProfileAchievementsAction(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];
  return syncProfileAchievements(session.id);
}
