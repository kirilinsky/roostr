import { NextResponse } from "next/server";
import {
  verifyTelegramLogin,
  isFresh,
  type TelegramAuthData,
} from "@/lib/telegram";
import { signSession, SESSION_COOKIE } from "@/lib/auth";
import { upsertUser } from "@/db/queries";

export const runtime = "nodejs";

// Fields Telegram appends to the redirect (data-auth-url). Only these go into the
// hash check — extra/stray query params would break the signature.
const TG_FIELDS = ["first_name", "last_name", "username", "photo_url"] as const;

// Redirect-mode login (data-auth-url). More robust than the popup JS callback:
// works inside in-app browsers / webviews and when popups or the postMessage
// channel (e.g. COOP) are blocked. Telegram GET-redirects the top window here
// with the auth fields as query params; we verify, set the cookie, and redirect.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const fail = () => {
    const u = new URL("/", req.url);
    u.searchParams.set("login", "error");
    return NextResponse.redirect(u, 302);
  };

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) return fail();

  const q = url.searchParams;
  const data: TelegramAuthData = {
    id: Number(q.get("id")),
    auth_date: Number(q.get("auth_date")),
    hash: q.get("hash") ?? "",
  };
  for (const k of TG_FIELDS) {
    const v = q.get(k);
    if (v !== null) data[k] = v;
  }

  if (!data.id || !data.hash || !data.auth_date) return fail();
  if (!verifyTelegramLogin(data, botToken)) return fail();
  if (!isFresh(data.auth_date)) return fail();

  const user = {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    username: data.username,
    photoUrl: data.photo_url,
  };

  // Don't 500 the page on a misconfig (e.g. missing JWT_SECRET in prod, which
  // makes signSession throw) — fail to /?login=error instead.
  try {
    const token = await signSession(user);
    await upsertUser(user);
    const res = NextResponse.redirect(new URL("/profile", req.url), 302);
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  } catch (e) {
    console.error("telegram GET auth failed:", e);
    return fail();
  }
}

export async function POST(req: Request) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json(
      { error: "TELEGRAM_BOT_TOKEN not configured" },
      { status: 500 },
    );
  }

  let data: TelegramAuthData;
  try {
    data = (await req.json()) as TelegramAuthData;
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  if (!data?.id || !data?.hash || !data?.auth_date) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!verifyTelegramLogin(data, botToken)) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }

  if (!isFresh(data.auth_date)) {
    return NextResponse.json({ error: "Login expired" }, { status: 401 });
  }

  const user = {
    id: data.id,
    firstName: data.first_name,
    lastName: data.last_name,
    username: data.username,
    photoUrl: data.photo_url,
  };
  const token = await signSession(user);
  await upsertUser(user);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
