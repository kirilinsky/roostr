import crypto from "node:crypto";
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";
import type { SessionUser } from "@/lib/auth";

const TELEGRAM_ISSUER = "https://oauth.telegram.org";
const TELEGRAM_AUTH_URL = "https://oauth.telegram.org/auth";
export const TELEGRAM_TOKEN_URL = "https://oauth.telegram.org/token";
export const TELEGRAM_STATE_COOKIE = "telegram_oauth_state";
export const TELEGRAM_VERIFIER_COOKIE = "telegram_oauth_verifier";

const telegramJwks = createRemoteJWKSet(
  new URL("https://oauth.telegram.org/.well-known/jwks.json"),
);

export interface TelegramIdTokenClaims extends JWTPayload {
  sub: string;
  id?: number | string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  locale?: string; // OIDC standard claim — the user's language (e.g. "ru", "en")
  language_code?: string; // Telegram's own field, when present
}

export interface TelegramPkceChallenge {
  state: string;
  verifier: string;
  challenge: string;
}

export function createTelegramPkceChallenge(): TelegramPkceChallenge {
  const state = randomBase64Url(32);
  const verifier = randomBase64Url(64);
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");

  return { state, verifier, challenge };
}

export function getTelegramRedirectUri(req: Request): string {
  return new URL("/api/auth/telegram/callback", req.url).toString();
}

export function buildTelegramAuthorizationUrl({
  clientId,
  redirectUri,
  state,
  challenge,
}: {
  clientId: string;
  redirectUri: string;
  state: string;
  challenge: string;
}): string {
  const url = new URL(TELEGRAM_AUTH_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid profile telegram:bot_access");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

export async function verifyTelegramIdToken(
  idToken: string,
  clientId: string,
): Promise<TelegramIdTokenClaims> {
  const { payload } = await jwtVerify<TelegramIdTokenClaims>(
    idToken,
    telegramJwks,
    {
      issuer: TELEGRAM_ISSUER,
    },
  );
  if (!hasExpectedAudience(payload.aud, clientId)) {
    throw new Error(
      `Telegram id_token audience mismatch: expected ${clientId}, got ${JSON.stringify(payload.aud)}`,
    );
  }
  return payload;
}

export function telegramClaimsToSessionUser(
  claims: TelegramIdTokenClaims,
): SessionUser {
  const name =
    typeof claims.name === "string" && claims.name.trim()
      ? claims.name.trim()
      : undefined;
  const [firstName, ...rest] = name?.split(/\s+/) ?? [];

  return {
    id: getTelegramUserId(claims),
    firstName,
    lastName: rest.length ? rest.join(" ") : undefined,
    username:
      typeof claims.preferred_username === "string"
        ? claims.preferred_username
        : undefined,
    photoUrl: typeof claims.picture === "string" ? claims.picture : undefined,
  };
}

export function timingSafeEqualString(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function getTelegramUserId(claims: TelegramIdTokenClaims): number {
  if (typeof claims.id === "number") {
    if (Number.isSafeInteger(claims.id) && claims.id > 0) return claims.id;
    throw new Error("Telegram id_token id is not a safe positive number");
  }
  if (typeof claims.id === "string") {
    const id = Number(claims.id);
    if (Number.isSafeInteger(id) && id > 0) return id;
    throw new Error("Telegram id_token id is not a safe numeric string");
  }
  const id = Number(claims.sub);
  if (Number.isSafeInteger(id) && id > 0) return id;
  throw new Error("Telegram id_token is missing a safe numeric Telegram id");
}

function hasExpectedAudience(aud: JWTPayload["aud"], clientId: string): boolean {
  if (Array.isArray(aud)) return aud.some((value) => String(value) === clientId);
  return aud !== undefined && String(aud) === clientId;
}

function randomBase64Url(bytes: number): string {
  return crypto.randomBytes(bytes).toString("base64url");
}
