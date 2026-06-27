"use client";

import { useCallback } from "react";
import { useToast } from "@/components/ToastProvider";
import { useLocale } from "@/i18n/I18nProvider";
import {
  PROFILE_ACHIEVEMENTS,
  ROOSTER_ACHIEVEMENTS,
  achievementName,
  achievementDesc,
} from "@/lib/achievements";

const BY_ID = new Map(
  [...PROFILE_ACHIEVEMENTS, ...ROOSTER_ACHIEVEMENTS].map((a) => [a.id, a]),
);

// Module-level so a given unlock toasts at most ONCE per page session — survives
// component remounts (React StrictMode double-mounts effects in dev) and multiple
// toaster instances on a page. The DB already returns each unlock as "new" only
// once; this guards the client side against double-pops within a session.
const toasted = new Set<string>();

// Returns a stable `(ids, href?) => void` that pops an achievement toast for each
// not-yet-toasted id. Used both by the SSR toaster (profile/bird pages) and after
// an earn action (e.g. lab/farm claim) so the unlock surfaces at the moment it
// happens, not only when you next open your profile.
export function useAchievementToasts() {
  const toast = useToast();
  const locale = useLocale();
  return useCallback(
    (ids: string[], href?: string) => {
      for (const id of ids) {
        if (toasted.has(id)) continue;
        const a = BY_ID.get(id);
        if (!a) continue;
        toasted.add(id);
        toast.show({
          variant: "achievement",
          icon: a.icon,
          title: achievementName(a, locale),
          message: achievementDesc(a, locale),
          href,
          durationMs: 6000,
        });
      }
    },
    [toast, locale],
  );
}
