"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  removeFriend,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  markNotificationsSeen,
} from "@/db/queries";

// Send a friend request to the target (no instant friendship). If the target had
// already requested the viewer, sendFriendRequest accepts it → instant friends.
export async function addFriendAction(targetId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === targetId) return;
  await sendFriendRequest(session.id, targetId);
  revalidatePath(`/${targetId}`);
}

export async function removeFriendAction(targetId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === targetId) return;
  await removeFriend(session.id, targetId);
  revalidatePath(`/${targetId}`);
}

// Accept an incoming request from `fromId` (the viewer is the recipient).
export async function acceptFriendRequestAction(fromId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === fromId) return;
  await acceptFriendRequest(session.id, fromId);
  // The accepter already "saw" this — bump their cursor so the new friendship
  // doesn't show up as an unread "new friend" notification for them. The other
  // side (the requester) keeps an older cursor → they DO get notified.
  await markNotificationsSeen(session.id);
  revalidatePath("/notifications");
  revalidatePath(`/${fromId}`);
}

// Decline an incoming request from `fromId`.
export async function declineFriendRequestAction(fromId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === fromId) return;
  await declineFriendRequest(session.id, fromId);
  revalidatePath("/notifications");
}

// Cancel a request the VIEWER sent to `targetId` (delete the from-me→target row).
export async function cancelFriendRequestAction(targetId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === targetId) return;
  await declineFriendRequest(targetId, session.id);
  revalidatePath(`/${targetId}`);
}
