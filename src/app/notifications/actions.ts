"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { markNotificationsSeen, claimNews, createNews } from "@/db/queries";

// Mark the feed read for the signed-in user (clears the HUD bell badge). Called
// from the client AFTER the page actually mounts — not during render — so a Link
// prefetch / double render of the page can't clear the badge prematurely.
export async function markNotificationsSeenAction(): Promise<void> {
  const session = await getSession();
  if (session) await markNotificationsSeen(session.id);
}

// Claim a news CTA (e.g. a promo's free egg). Once per user, server-validated.
export async function claimNewsAction(
  newsId: string,
): Promise<{ ok: boolean; egg?: number }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const res = await claimNews(session.id, newsId);
  if (res.ok) revalidatePath("/notifications");
  return res;
}

// Publish a news item — ADMIN only. CTA "claim_egg" + amount grants that many eggs.
export async function createNewsAction(input: {
  titleEn: string;
  titleRu: string;
  bodyEn: string;
  bodyRu: string;
  link?: string;
  ctaType?: string;
  ctaAmount?: number;
}): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session || !isAdmin(session.id)) return { ok: false };
  const ctaType = input.ctaType === "claim_egg" ? "claim_egg" : null;
  const id = await createNews({
    titleEn: input.titleEn.trim(),
    titleRu: input.titleRu.trim(),
    bodyEn: input.bodyEn.trim(),
    bodyRu: input.bodyRu.trim(),
    link: input.link?.trim() || null,
    ctaType,
    ctaAmount: ctaType ? (input.ctaAmount ?? 1) : null,
  });
  return { ok: !!id };
}
