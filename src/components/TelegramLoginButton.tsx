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
      const res = await fetch("/api/auth/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(user),
      });
      if (res.ok) {
        router.push("/profile");
        router.refresh();
      } else {
        const body = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        setError(body.error ?? `Auth failed (${res.status})`);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");

    const el = containerRef.current;
    el?.appendChild(script);

    return () => {
      if (el) el.innerHTML = "";
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
