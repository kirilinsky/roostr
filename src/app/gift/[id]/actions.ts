"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { acceptGift, declineGift, getPendingGiftForRoostr } from "@/db/queries";

export type GiftDecision = { ok: boolean; reason?: string };

// Accept the pending gift for this bird → pay the tax, ownership moves to me.
// Recipient-guarded inside acceptGift (CAS on the pending row addressed to me).
export async function acceptGiftAction(roostrId: string): Promise<GiftDecision> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "auth" };
  const gift = await getPendingGiftForRoostr(roostrId);
  if (!gift || gift.toUserId !== session.id) return { ok: false, reason: "unavailable" };

  const res = await acceptGift(gift.id, session.id);
  if (!res.ok) return { ok: false, reason: res.reason };

  revalidatePath("/collection");
  revalidatePath(`/collection/${roostrId}`);
  revalidatePath("/notifications");
  return { ok: true };
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
