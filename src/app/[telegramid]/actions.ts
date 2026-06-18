"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { addFriend, removeFriend } from "@/db/queries";

export async function addFriendAction(targetId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === targetId) return;
  await addFriend(session.id, targetId);
  revalidatePath(`/${targetId}`);
}

export async function removeFriendAction(targetId: number): Promise<void> {
  const session = await getSession();
  if (!session || session.id === targetId) return;
  await removeFriend(session.id, targetId);
  revalidatePath(`/${targetId}`);
}
