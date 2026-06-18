import { NextResponse } from "next/server";

export const runtime = "nodejs";

// TEMPORARY debug: shows what the DEPLOYED env actually has, to diagnose
// "Bad signature". Exposes only PUBLIC info (bot id is public; token is never
// returned). DELETE this route once Telegram login works.
export async function GET() {
  const token = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const username = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? null;

  return NextResponse.json({
    // bot id is the part before ":" — must equal the widget's bot_id (8313476238)
    tokenBotId: token ? token.split(":")[0] : null,
    tokenLength: token.length, // catches stray whitespace/newline in the value
    tokenHasWhitespace: /\s/.test(token),
    widgetUsername: username,
    hasJwtSecret: Boolean(process.env.JWT_SECRET),
  });
}
