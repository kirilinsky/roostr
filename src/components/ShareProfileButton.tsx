"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import { addReferralParam } from "@/lib/referrals";

// Strip any trailing slash so we never produce a double slash (NEXT_PUBLIC_APP_URL
// is often set with a trailing "/").
const BASE_URL = (
  process.env.NEXT_PUBLIC_APP_URL ?? "https://roostr-two.vercel.app"
).replace(/\/+$/, "");

export default function ShareProfileButton({
  telegramId,
  label,
  copiedLabel,
}: {
  telegramId: number;
  label: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);
  // Invite link points to the HOME page (better landing — it shows the referral
  // welcome pitch for logged-out visitors), carrying ?ref=<inviter>.
  const url = addReferralParam(`${BASE_URL}/`, telegramId);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API needs a secure context; fall back to manual copy.
      window.prompt("Copy link:", url);
    }
  }

  return (
    <Button variant="contained" onClick={copy}>
      {copied ? copiedLabel : label}
    </Button>
  );
}
