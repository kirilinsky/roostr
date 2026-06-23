export const REFERRER_COOKIE = "roostr_referrer_id";
export const REFERRER_STORAGE_KEY = "roostr.referrerId";
export const REFERRER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface ReferralCaptureState {
  referrerId: number | null;
  shouldStore: boolean;
  shouldClear: boolean;
  shouldRemoveParams: boolean;
}

export function parseReferralId(
  value: string | number | null | undefined,
  currentUserId?: number,
): number | null {
  if (value === null || value === undefined || value === "") return null;
  const id = typeof value === "number" ? value : Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  if (currentUserId !== undefined && id === currentUserId) return null;
  return id;
}

export function addReferralParam(url: string, referrerId: number): string {
  const u = new URL(url);
  u.searchParams.set("ref", String(referrerId));
  return u.toString();
}

export function getReferralCaptureState(
  search: string,
  storedReferrerId: string | null,
): ReferralCaptureState {
  const params = new URLSearchParams(search);

  if (params.get("ref_registered") === "1") {
    return {
      referrerId: null,
      shouldStore: false,
      shouldClear: true,
      shouldRemoveParams: true,
    };
  }

  const urlReferrerId = parseReferralId(params.get("ref"));
  const referrerId = urlReferrerId ?? parseReferralId(storedReferrerId);

  return {
    referrerId,
    shouldStore: urlReferrerId !== null,
    shouldClear: false,
    shouldRemoveParams: urlReferrerId !== null,
  };
}

export function buildReferralCookie(referrerId: number, secure: boolean): string {
  return `${REFERRER_COOKIE}=${referrerId}; Max-Age=${REFERRER_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function buildClearReferralCookie(secure: boolean): string {
  return `${REFERRER_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure ? "; Secure" : ""}`;
}

export function getReferralIdForUser(
  cookieValue: string | undefined,
  userId: number,
): number | null {
  return parseReferralId(cookieValue, userId);
}
