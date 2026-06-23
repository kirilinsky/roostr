import { describe, expect, it } from "vitest";
import {
  addReferralParam,
  buildClearReferralCookie,
  buildReferralCookie,
  getReferralCaptureState,
  getReferralIdForUser,
  parseReferralId,
  REFERRER_COOKIE,
  REFERRER_MAX_AGE_SECONDS,
} from "@/lib/referrals";

describe("referrals", () => {
  it("accepts positive safe integer ids", () => {
    expect(parseReferralId("339784494")).toBe(339784494);
    expect(parseReferralId(100000001)).toBe(100000001);
  });

  it("rejects invalid ids and self-referrals", () => {
    expect(parseReferralId("abc")).toBeNull();
    expect(parseReferralId("1.5")).toBeNull();
    expect(parseReferralId("-1")).toBeNull();
    expect(parseReferralId("339784494", 339784494)).toBeNull();
  });

  it("adds ref to profile URLs", () => {
    expect(addReferralParam("https://roostr-two.vercel.app/339784494", 339784494)).toBe(
      "https://roostr-two.vercel.app/339784494?ref=339784494",
    );
  });

  it("captures a fresh ref from the URL and requests URL cleanup", () => {
    expect(getReferralCaptureState("?ref=339784494", null)).toEqual({
      referrerId: 339784494,
      shouldStore: true,
      shouldClear: false,
      shouldRemoveParams: true,
    });
  });

  it("restores a stored ref into the cookie when no URL ref is present", () => {
    expect(getReferralCaptureState("", "339784494")).toEqual({
      referrerId: 339784494,
      shouldStore: false,
      shouldClear: false,
      shouldRemoveParams: false,
    });
  });

  it("clears referral state after OAuth callback marks registration handled", () => {
    expect(getReferralCaptureState("?ref_registered=1", "339784494")).toEqual({
      referrerId: null,
      shouldStore: false,
      shouldClear: true,
      shouldRemoveParams: true,
    });
  });

  it("builds referral cookie headers consistently", () => {
    expect(buildReferralCookie(339784494, true)).toBe(
      `${REFERRER_COOKIE}=339784494; Max-Age=${REFERRER_MAX_AGE_SECONDS}; Path=/; SameSite=Lax; Secure`,
    );
    expect(buildClearReferralCookie(false)).toBe(
      `${REFERRER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax`,
    );
  });

  it("extracts callback referral id while rejecting self-referrals", () => {
    expect(getReferralIdForUser("339784494", 100000001)).toBe(339784494);
    expect(getReferralIdForUser("339784494", 339784494)).toBeNull();
    expect(getReferralIdForUser("nope", 100000001)).toBeNull();
  });
});
