"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import type { TelegramAuthData } from "@/lib/telegram";

declare global {
  interface Window {
    onTelegramAuth?: (user: TelegramAuthData) => void;
  }
}

// Telegram Login Widget in CALLBACK mode (data-onauth). The popup posts the auth
// result back to THIS window; we POST it to verify, set the cookie, then refresh.
// Keeping the main window in control is more reliable than redirect mode, whose
// popup-set cookie doesn't update the opener (broke login in incognito).
export default function TelegramLoginButton({
  botUsername,
}: {
  botUsername: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    window.onTelegramAuth = async (user: TelegramAuthData) => {
      setError(null);
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        if (res.ok) {
          router.push("/profile");
          router.refresh();
        } else {
          const body = (await res.json().catch(() => ({}))) as { error?: string };
          setError(body.error ?? `Auth failed (${res.status})`);
        }
      } catch {
        setError("Network error");
      }
    };

    // Idempotent inject: add the widget only once; never wipe the container on a
    // re-run, or the earlier async script/iframe is detached and never renders.
    const el = containerRef.current;
    if (el && !el.querySelector("script, iframe")) {
      const script = document.createElement("script");
      script.src = "https://telegram.org/js/telegram-widget.js?22";
      script.async = true;
      script.setAttribute("data-telegram-login", botUsername);
      script.setAttribute("data-size", "large");
      script.setAttribute("data-userpic", "true");
      script.setAttribute("data-radius", "8");
      // No data-request-access="write": we don't message users, and asking for it
      // complicates the first-time confirmation for new users.
      script.setAttribute("data-onauth", "onTelegramAuth(user)");
      el.appendChild(script);
    }

    return () => {
      delete window.onTelegramAuth;
    };
  }, [botUsername, router]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div ref={containerRef} />
      {error && <Alert severity="error">{error}</Alert>}
    </Box>
  );
}
