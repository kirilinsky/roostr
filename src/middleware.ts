import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

// Server-side gate for logged-in-only routes: guests are redirected to "/".
// Public routes (/, /about, /support, /[telegramid]) and /debug (own admin gate)
// are NOT matched below. Mirrors the sidebar visibility rules in layout.tsx.

const SESSION_COOKIE = "session";

function secretKey(): Uint8Array {
  // Same resolution as src/lib/auth.ts (dev fallback; prod needs JWT_SECRET).
  const secret =
    process.env.JWT_SECRET ??
    (process.env.NODE_ENV !== "production" ? "dev-insecure-secret" : "");
  return new TextEncoder().encode(secret);
}

async function hasSession(req: NextRequest): Promise<boolean> {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, secretKey());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  if (await hasSession(req)) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = "/";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/incubator/:path*",
    "/collection/:path*",
    "/roostrdex/:path*",
    "/market/:path*",
    "/arena/:path*",
    "/farm/:path*",
    "/lab/:path*",
    "/friends/:path*",
    "/bank/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
