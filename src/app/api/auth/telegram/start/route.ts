import { NextResponse } from "next/server";
import {
  buildTelegramAuthorizationUrl,
  createTelegramPkceChallenge,
  getTelegramRedirectUri,
  TELEGRAM_STATE_COOKIE,
  TELEGRAM_VERIFIER_COOKIE,
} from "@/lib/telegram";

export const runtime = "nodejs";

const OAUTH_COOKIE_MAX_AGE_SECONDS = 10 * 60;

export async function GET(req: Request) {
  const clientId =
    process.env.TELEGRAM_CLIENT_ID ?? process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;

  if (!clientId || !process.env.TELEGRAM_CLIENT_SECRET) {
    return NextResponse.redirect(new URL("/?auth_error=config", req.url));
  }

  const { state, verifier, challenge } = createTelegramPkceChallenge();
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
