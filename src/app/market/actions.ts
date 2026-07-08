"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  createListing,
  buyListing,
  cancelListing,
  syncProfileAchievements,
} from "@/db/queries";

export type ListResult =
  | { ok: true; listingId?: string }
  | { ok: false; error: string };

// List a bird for sale. All guards (owner, active status, server-side price
// clamp, CAS lock) live in createListing — the action just resolves the session
// and revalidates. Price is re-validated server-side, so a tampered client price
// is rejected here regardless of the form's clamp.
export async function listRoostrAction(
  roostrId: string,
  price: number,
): Promise<ListResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await createListing(roostrId, session.id, price);
  if (!res.ok) return { ok: false, error: res.reason ?? "error" };
  revalidatePath(`/collection/${roostrId}`);
  revalidatePath("/collection");
  revalidatePath("/market");
  return { ok: true, listingId: res.listingId };
}

// Cancel your own live listing (bird returns to active).
export async function cancelListingAction(
  listingId: string,
  roostrId: string,
): Promise<ListResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await cancelListing(listingId, session.id);
  if (!res.ok) return { ok: false, error: res.reason ?? "error" };
  revalidatePath(`/collection/${roostrId}`);
  revalidatePath("/collection");
  revalidatePath("/market");
  return { ok: true };
}

export type BuyResult =
  | { ok: true; price: number }
  | { ok: false; error: string };

// Buy a listing. buyListing does the single-winner CAS + coin move + ownership
// transfer + provenance row (which APPENDS to the chain of custody, so previous
// owners are preserved). We sync the buyer's + seller's sale/purchase
// achievements after a successful buy.
export async function buyListingAction(
  listingId: string,
): Promise<BuyResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await buyListing(listingId, session.id);
  if (!res.ok) return { ok: false, error: res.reason ?? "error" };
  // Sync the buyer's profile achievements (coins spent, etc.). The seller's
  // sale achievements sync when they next load a profile-metric surface.
  await syncProfileAchievements(session.id);
  revalidatePath("/market");
  revalidatePath("/collection");
  return { ok: true, price: res.price ?? 0 };
}
