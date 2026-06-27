"use client";

import { useEffect } from "react";
import { useAchievementToasts } from "@/hooks/useAchievementToasts";
import type { Achievement } from "@/lib/achievements";

// Fires an "achievement" toast for each newly-unlocked achievement the server
// computed for this render (profile / bird pages). Dedupe + locale live in
// useAchievementToasts (module-level guard → no double-pop under StrictMode or on
// refresh). Capped so a first-ever sync that unlocks many at once doesn't bury the
// screen — the rest are still visible on the achievements page.
const MAX_TOASTS = 3;

export default function AchievementToaster({
  unlocked,
  href,
}: {
  unlocked: Achievement[];
  href?: string;
}) {
  const toastAchievements = useAchievementToasts();
  useEffect(() => {
    if (unlocked.length) {
      toastAchievements(unlocked.slice(0, MAX_TOASTS).map((a) => a.id), href);
    }
  }, [unlocked, href, toastAchievements]);

  return null;
}
