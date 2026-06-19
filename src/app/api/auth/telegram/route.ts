import { NextResponse } from "next/server";
import {
  verifyTelegramLogin,
  isFresh,
  type TelegramAuthData,
} from "@/lib/telegram";
import { signSession, SESSION_COOKIE } from "@/lib/auth";
import { upsertUser } from "@/db/queries";

export const runtime = "nodejs";

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