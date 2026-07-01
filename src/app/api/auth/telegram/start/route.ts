import { NextResponse } from "next/server";
import {
  buildTelegramAuthorizationUrl,
  createTelegramPkceChallenge,
  getTelegramRedirectUri,
  TELEGRAM_STATE_COOKIE,
  TELEGRAM_STATE_REF_SEP,
  TELEGRAM_VERIFIER_COOKIE,
} from "@/lib/telegram";
import { parseReferralId, REFERRER_COOKIE } from "@/lib/referrals";

export const runtime = "nodejs";

const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(req: Request) {
  const clientId =
    process.env.TELEGRAM_CLIENT_ID ?? process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;

  if (!clientId || !process.env.TELEGRAM_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?auth_error=config", req.url));
  }

  const { state: rawState, verifier, challenge } = createTelegramPkceChallenge();
  // Referrer: prefer the ?ref appended by the login button (sourced from
  // localStorage → survives in-app webviews); fall back to the client ref cookie.
  // Baked into `state` so it rides the OAuth round-trip in the URL, not a cookie.
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieRef = new RegExp(`${REFERRER_COOKIE}=(\\d+)`).exec(cookieHeader)?.[1];
  const referrerId =
    parseReferralId(new URL(req.url).searchParams.get("ref")) ??
    parseReferralId(cookieRef);
  const state = referrerId
    ? `${rawState}${TELEGRAM_STATE_REF_SEP}${referrerId}`
    : rawState;
  const redirectUri = getTelegramRedirectUri(req);
  const authUrl = buildTelegramAuthorizationUrl({
    clientId,
    redirectUri,
    state,
    challenge,
  });

  const res = NextResponse.redirect(authUrl);
  const secure = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    secure,
    sameSite: "lax" as const,
    path: "/api/auth/telegram",
    maxAge: OAUTH_COOKIE_MAX_AGE_SECONDS,
  };

  res.cookies.set(TELEGRAM_STATE_COOKIE, state, cookieOptions);
  res.cookies.set(TELEGRAM_VERIFIER_COOKIE, verifier, cookieOptions);
  return res;
}
