import { NextResponse } from "next/server";
import { signSession, SESSION_COOKIE, type SessionUser } from "@/lib/auth";

export const runtime = "nodejs";

// DEV-ONLY fake sign-in — localhost has no real Telegram. Disabled in production.
// "admin" id matches the allowlist (see src/lib/admin.ts); "user" does not.
const FAKE_USERS: Record<string, SessionUser> = {
  admin: { id: 339784494, firstName: "Dev", lastName: "Admin", username: "dev_admin" },
  user: { id: 100000001, firstName: "Dev", lastName: "User", username: "dev_user" },
};

export async function POST(req: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  let role = "user";
  try {
    const body = (await req.json()) as { role?: string };
    if (body?.role) role = body.role;
  } catch {
    // empty body → default role
  }

  const fake = FAKE_USERS[role] ?? FAKE_USERS.user;
  const token = await signSession(fake);

  const res = NextResponse.json({ ok: true, user: fake });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
