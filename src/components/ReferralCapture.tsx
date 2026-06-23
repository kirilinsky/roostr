"use client";

import { useEffect } from "react";
import {
  buildClearReferralCookie,
  buildReferralCookie,
  getReferralCaptureState,
  REFERRER_STORAGE_KEY,
} from "@/lib/referrals";

export default function ReferralCapture() {
  useEffect(() => {
    const secure = window.location.protocol === "https:";
    const state = getReferralCaptureState(
      window.location.search,
      window.localStorage.getItem(REFERRER_STORAGE_KEY),
    );

    if (state.shouldClear) {
      window.localStorage.removeItem(REFERRER_STORAGE_KEY);
      document.cookie = buildClearReferralCookie(secure);
      removeReferralParams();
      return;
    }

    if (!state.referrerId) return;

    if (state.shouldStore) {
      window.localStorage.setItem(
        REFERRER_STORAGE_KEY,
        String(state.referrerId),
      );
    }

    if (state.shouldRemoveParams) {
      removeReferralParams();
    }

    document.cookie = buildReferralCookie(state.referrerId, secure);
  }, []);

  return null;
}

function removeReferralParams() {
  const url = new URL(window.location.href);
  url.searchParams.delete("ref");
  url.searchParams.delete("ref_registered");
  window.history.replaceState(null, "", url.toString());
}
