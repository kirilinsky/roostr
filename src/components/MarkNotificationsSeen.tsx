"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { markNotificationsSeenAction } from "@/app/notifications/actions";

// Marks the notifications feed read once the page has actually mounted (real
// visit), then refreshes so the HUD bell badge clears live. Doing this here
// instead of in the page render avoids a Link prefetch clearing it prematurely.
export default function MarkNotificationsSeen() {
  const router = useRouter();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    markNotificationsSeenAction().then(() => router.refresh());
  }, [router]);
  return null;
}
