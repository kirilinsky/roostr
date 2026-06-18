"use client";

import { useEffect, useRef } from "react";
import Box from "@mui/material/Box";

// Telegram Login Widget in REDIRECT mode (data-auth-url). Telegram redirects the
// top window to /api/auth/telegram (GET) with the signed auth fields; the server
// verifies, sets the session cookie, and redirects to /profile. This avoids the
// popup + postMessage callback, which silently fails for some users (in-app
// browsers / webviews, blocked popups, COOP). See the GET handler in that route.
export default function TelegramLoginButton({
  botUsername,
}: {
  botUsername: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Idempotent inject: add the widget only once. Re-running the effect must NOT
    // wipe the container, or the earlier async script/iframe is detached and never
    // renders (that race is why the button used to appear only after a reload).
    const el = containerRef.current;
    if (!el || el.querySelector("script, iframe")) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-radius", "8");
    // No data-request-access="write": we don't message users, and asking for
    // write permission complicates the first-time confirmation for new users.
    // Add it back only when the app actually needs to message players.
    // Redirect to our own origin's verify endpoint (must match the bot domain).
    script.setAttribute(
      "data-auth-url",
      `${window.location.origin}/api/auth/telegram`,
    );
    el.appendChild(script);
  }, [botUsername]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div ref={containerRef} />
    </Box>
  );
}
