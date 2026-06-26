"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { acceptGift, declineGift, getPendingGiftForRoostr } from "@/db/queries";

export type GiftDecision = { ok: boolean };

// Accept the pending gift for this bird → ownership moves to me. Recipient-guarded
// inside acceptGift (CAS on the pending row addressed to the session user).
export async function acceptGiftAction(roostrId: string): Promise<GiftDecision> {
  const session = await getSession();
  if (!session) return { ok: false };
  const gift = await getPendingGiftForRoostr(roostrId);
  if (!gift || gift.toUserId !== session.id) return { ok: false };

  const res = await acceptGift(gift.id, session.id);
  if (!res.ok) return { ok: false };

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
