"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@mui/material/IconButton";
import { markNotificationReadAction } from "@/app/notifications/actions";
import { useT } from "@/i18n/I18nProvider";

// Shared notification mutations: run an action then refresh; per-item read marks;
// the ✓ "mark read" button. Each caller gets its own `busy` (independent disabling).
export function useNotifActions() {
  const t = useT();
  const router = useRouter();
  const [busy, startTransition] = useTransition();

  const act = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  // Mark one item read (✓ button) → refresh.
  const markRead = (key: string) => act(() => markNotificationReadAction(key));
  // Fire-and-forget read mark for CTA links (navigation proceeds; no refresh).
  const markReadAsync = (key: string) => {
    void markNotificationReadAction(key);
  };
  const readBtn = (key: string) => (
    <IconButton
      size="small"
      disabled={busy}
      onClick={() => markRead(key)}
      aria-label={t("notifications.markRead")}
      title={t("notifications.markRead")}
      sx={{ flexShrink: 0 }}
    >
      ✓
    </IconButton>
  );

  return { busy, act, markRead, markReadAsync, readBtn };
}
