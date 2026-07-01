import { NextResponse, type NextRequest } from "next/server";
import {
  getTelegramRedirectUri,
  telegramClaimsToSessionUser,
  TELEGRAM_STATE_COOKIE,
  TELEGRAM_STATE_REF_SEP,
  TELEGRAM_TOKEN_URL,
  TELEGRAM_VERIFIER_COOKIE,
  timingSafeEqualString,
  verifyTelegramIdToken,
} from "@/lib/telegram";
import { signSession, SESSION_COOKIE } from "@/lib/auth";
import { upsertUser } from "@/db/queries";
import { getReferralIdForUser, parseReferralId, REFERRER_COOKIE } from "@/lib/referrals";
import { LOCALE_COOKIE, localeFromTag } from "@/i18n/config";

export const runtime = "nodejs";

class TelegramAuthFlowError extends Error {
  constructor(
    public readonly reason: string,
    cause?: unknown,
  ) {
    super(reason);
    this.name = "TelegramAuthFlowError";
    this.cause = cause;
  }
}

interface TelegramTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  id_token?: string;
  error?: string;
  error_description?: string;
}

export async function GET(req: NextRequest) {
  const clientId =
    process.env.TELEGRAM_CLIENT_ID ?? process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID;
  const clientSecret = process.env.TELEGRAM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return authError(req, "config");
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const telegramError = url.searchParams.get("error");
  const storedState = req.cookies.get(TELEGRAM_STATE_COOKIE)?.value;
  const verifier = req.cookies.get(TELEGRAM_VERIFIER_COOKIE)?.value;

  if (telegramError) return authError(req, telegramError);

  if (!code || !state || !storedState || !verifier) {
    return authError(req, "missing_oauth_fields");
  }

  if (!timingSafeEqualString(state, storedState)) {
    return authError(req, "bad_state");
  }

  try {
    let idToken: string;
    try {
      idToken = await exchangeCodeForIdToken({
        req,
        code,
        verifier,
        clientId,
        clientSecret,
      });
    } catch (e) {
      throw new TelegramAuthFlowError("token_exchange_failed", e);
    }

    let claims;
    try {
      claims = await verifyTelegramIdToken(idToken, clientId);
    } catch (e) {
      throw new TelegramAuthFlowError("id_token_invalid", e);
    }

    let user;
    try {
      user = telegramClaimsToSessionUser(claims);
    } catch (e) {
      throw new TelegramAuthFlowError("user_claims_invalid", e);
    }

    // Referrer rides in `state` (survives the round-trip regardless of cookies);
    // fall back to the legacy client ref cookie if an older link had no state ref.
    const referrerId =
      parseReferralId(state.split(TELEGRAM_STATE_REF_SEP)[1], user.id) ??
      getReferralIdForUser(req.cookies.get(REFERRER_COOKIE)?.value, user.id);

    let token: string;
    try {
      token = await signSession(user);
    } catch (e) {
      throw new TelegramAuthFlowError("session_failed", e);
    }

    try {
      await upsertUser(user, { referredById: referrerId });
    } catch (e) {
      throw new TelegramAuthFlowError("user_upsert_failed", e);
    }

    const res = NextResponse.redirect(
      new URL(`/${user.id}?ref_registered=1`, req.url),
    );
    clearOAuthCookies(res);
    res.cookies.set(REFERRER_COOKIE, "", { path: "/", maxAge: 0 });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    // Seed the UI language from Telegram's account language on first login — only
    // if the visitor hasn't already chosen one (never override an explicit pick).
    const tgLocale = localeFromTag(claims.locale ?? claims.language_code);
    if (tgLocale && !req.cookies.get(LOCALE_COOKIE)) {
      res.cookies.set(LOCALE_COOKIE, tgLocale, {
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 365,
      });
    }
    return res;
  } catch (e) {
    console.error("Telegram OIDC callback failed:", e);
    return authError(
      req,
      e instanceof TelegramAuthFlowError ? e.reason : "callback_failed",
    );
  }
}

async function exchangeCodeForIdToken({
  req,
  code,
  verifier,
  clientId,
  clientSecret,
}: {
  req: Request;
  code: string;
  verifier: string;
  clientId: string;
  clientSecret: string;
}): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getTelegramRedirectUri(req),
    client_id: clientId,
    code_verifier: verifier,
  });

  const res = await fetch(TELEGRAM_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
    },
    body,
  });
  const payload = (await res.json().catch(() => ({}))) as TelegramTokenResponse;

  if (!res.ok || !payload.id_token) {
    throw new Error(
      payload.error_description ??
        payload.error ??
        `Telegram token exchange failed (${res.status})`,
    );
  }

  return payload.id_token;
}

function authError(req: NextRequest, reason: string): NextResponse {
  const res = NextResponse.redirect(
    new URL(`/?auth_error=${encodeURIComponent(reason)}`, req.url),
  );
  clearOAuthCookies(res);
  return res;
}

function clearOAuthCookies(res: NextResponse): void {
  const options = { path: "/api/auth/telegram", maxAge: 0 };
  res.cookies.set(TELEGRAM_STATE_COOKIE, "", options);
  res.cookies.set(TELEGRAM_VERIFIER_COOKIE, "", options);
}
