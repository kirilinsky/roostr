"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  acceptGift,
  declineGift,
  getPendingGiftForRoostr,
  syncProfileAchievements,
} from "@/db/queries";

export type GiftDecision = { ok: boolean; reason?: string; unlocked?: string[] };

// Accept the pending gift for this bird → pay the tax, ownership moves to me.
// Recipient-guarded inside acceptGift (CAS on the pending row addressed to me).
export async function acceptGiftAction(roostrId: string): Promise<GiftDecision> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "auth" };
  const gift = await getPendingGiftForRoostr(roostrId);
  if (!gift || gift.toUserId !== session.id) return { ok: false, reason: "unavailable" };

  const res = await acceptGift(gift.id, session.id);
  if (!res.ok) return { ok: false, reason: res.reason };

  // Owning a new bird can cross a gift-count profile achievement — persist now so
  // it unlocks at accept, not only on the next profile open. (The bird's breed is
  // added to the Roostrdex inside acceptGift.)
  const unlocked = await syncProfileAchievements(session.id);

  revalidatePath("/collection");
  revalidatePath(`/collection/${roostrId}`);
  revalidatePath("/notifications");
  revalidatePath("/roostrdex");
  revalidatePath("/achievements");
  return { ok: true, unlocked };
}

// Decline the pending gift → the bird returns to the sender (owner unchanged).
export async function declineGiftAction(roostrId: string): Promise<GiftDecision> {
  const session = await getSession();
  if (!session) return { ok: false };
  const gift = await getPendingGiftForRoostr(roostrId);
  if (!gift || gift.toUserId !== session.id) return { ok: false };

  const res = await declineGift(gift.id, session.id);
  if (!res.ok) return { ok: false };

  revalidatePath("/notifications");
  return { ok: true };
}
