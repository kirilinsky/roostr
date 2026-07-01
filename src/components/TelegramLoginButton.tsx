"use client";

import { useEffect, useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import {
  parseReferralId,
  REFERRER_COOKIE,
  REFERRER_STORAGE_KEY,
} from "@/lib/referrals";

export default function TelegramLoginButton({
  configured,
}: {
  configured: boolean;
}) {
  const [href, setHref] = useState("/api/auth/telegram/start");

  // Carry the referrer into the OAuth start URL so it survives the round-trip via
  // `state` — independent of the (webview-fragile) ref cookie. Source order:
  // current ?ref → localStorage (durable) → the ref cookie.
  useEffect(() => {
    const urlRef = new URLSearchParams(window.location.search).get("ref");
    const cookieRef = document.cookie.match(
      new RegExp(`${REFERRER_COOKIE}=(\\d+)`),
    )?.[1];
    const ref =
      parseReferralId(urlRef) ??
      parseReferralId(window.localStorage.getItem(REFERRER_STORAGE_KEY)) ??
      parseReferralId(cookieRef);
    if (ref) setHref(`/api/auth/telegram/start?ref=${ref}`);
  }, []);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button
        href={href}
        variant="contained"
        disabled={!configured}
        sx={{ alignSelf: "flex-start" }}
      >
        Telegram
      </Button>
      {!configured && (
        <Alert severity="error">Telegram login is not configured.</Alert>
      )}
    </Box>
  );
}
