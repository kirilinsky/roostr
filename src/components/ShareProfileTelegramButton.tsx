"use client";

import Button from "@mui/material/Button";
import { addReferralParam } from "@/lib/referrals";

// Strip a trailing slash so we never produce a double slash.
const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://roostr-two.vercel.app"
).replace(/\/+$/, "");

// "Share profile in Telegram": opens the Telegram share widget pointed at the
// player's PROFILE page (carrying ?ref=<self> for referral credit just in case).
// The user then picks a chat and shares it.
export default function ShareProfileTelegramButton({
  telegramId,
  label,
  text,
}: {
  telegramId: number;
  label: string;
  text: string;
}) {
  const profileUrl = addReferralParam(`${BASE_URL}/${telegramId}`, telegramId);

  function share() {
    const widget = `https://t.me/share/url?url=${encodeURIComponent(
      profileUrl,
    )}&text=${encodeURIComponent(text)}`;
    window.open(widget, "_blank", "noopener,noreferrer");
  }

  return (
    <Button variant="contained" onClick={share}>
      {label}
    </Button>
  );
}
