"use server";

import { getSession } from "@/lib/auth";
import { markNotificationsSeen } from "@/db/queries";

// Mark the feed read for the signed-in user (clears the HUD bell badge). Called
// from the client AFTER the page actually mounts — not during render — so a Link
// prefetch / double render of the page can't clear the badge prematurely.
export async function markNotificationsSeenAction(): Promise<void> {
  const session = await getSession();
  if (session) await markNotificationsSeen(session.id);
}
