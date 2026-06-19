"use client";

import { useEffect, useRef } from "react";

// Telegram Login Widget in REDIRECT mode (data-auth-url). Telegram GET-redirects
// the WHOLE page to /api/auth/telegram with the auth fields; the route verifies,
// sets the cookie and redirects to /profile. No popup / postMessage / COOP — works
// inside in-app browsers and webviews. (Callback mode is the alternative.)
export default function TelegramLoginButton({
  botUsername,
}: {
  botUsername: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Idempotent inject: add the widget only once; never wipe the container on a
    // re-run, or the earlier async script/iframe is detached and never renders.
    const el = containerRef.current;
    if (!el || el.querySelector("script, iframe")) return;

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "true");
    script.setAttribute("data-radius", "8");
    // Redirect to our verify endpoint (must be on the bot's registered domain).
    script.setAttribute(
      "data-auth-url",
      `${window.location.origin}/api/auth/telegram`,
    );
    el.appendChild(script);
  }, [botUsername]);

  return <div ref={containerRef} />;
}
