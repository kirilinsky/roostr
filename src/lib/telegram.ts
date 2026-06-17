import crypto from "node:crypto";

/**
 * Telegram Login Widget data returned to the site after a successful login.
 * https://core.telegram.org/widgets/login#receiving-authorization-data
 */
export interface TelegramAuthData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
  [key: string]: string | number | undefined;
}

/**
 * Verify the Login Widget payload.
 *
 * NOTE: the Login Widget uses `secret_key = SHA256(bot_token)` — this is
 * DIFFERENT from the Mini App `initData` scheme (`HMAC_SHA256("WebAppData", bot_token)`).
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(
  data: TelegramAuthData,
  botToken: string,
): boolean {
  const { hash, ...fields } = data;
  if (!hash) return false;

  const dataCheckString = Object.keys(fields)
    .filter((k) => fields[k] !== undefined)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("\n");

  const secret = crypto.createHash("sha256").update(botToken).digest();
  const hmac = crypto
    .createHmac("sha256", secret)
    .update(dataCheckString)
    .digest("hex");

  // constant-time compare
  const a = Buffer.from(hmac, "hex");
  const b = Buffer.from(hash, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Reject stale logins (default: 1 day). */
export function isFresh(authDate: number, maxAgeSeconds = 86_400): boolean {
  const now = Math.floor(Date.now() / 1000);
  return now - authDate <= maxAgeSeconds;
}
