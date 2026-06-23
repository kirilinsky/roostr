"use client";

import { useEffect, useRef } from "react";
import { useToast } from "@/components/ToastProvider";
import {
  achievementName,
  achievementDesc,
  type Achievement,
} from "@/lib/achievements";
import type { Locale } from "@/i18n/config";

// Fires an "achievement" toast for each newly-unlocked achievement, exactly once
// per mount. The server decides what's NEW (rows just inserted into
// achievement_unlocks) and passes them here; this only surfaces them. Capped so a
// first-ever sync that unlocks many at once doesn't bury the screen — the rest are
// still visible on the achievements page.
const MAX_TOASTS = 3;

export default function AchievementToaster({
  unlocked,
  locale,
  href,
}: {
  unlocked: Achievement[];
  locale: Locale;
  href?: string;
}) {
  const toast = useToast();
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current || unlocked.length === 0) return;
    fired.current = true; // guard against double-fire (StrictMode / re-render)
    unlocked.slice(0, MAX_TOASTS).forEach((a, i) => {
      // Stagger slightly so multiple unlocks animate in sequence, not on top.
      window.setTimeout(() => {
        toast.show({
          variant: "achievement",
          icon: a.icon,
          title: achievementName(a, locale),
          message: achievementDesc(a, locale),
          href,
          durationMs: 6000,
        });
      }, i * 600);
    });
  }, [unlocked, locale, href, toast]);

  return null;
}
