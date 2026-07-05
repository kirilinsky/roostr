import { NextResponse } from "next/server";
import { settleAllStations } from "@/db/queries";

// Daily cron: settle every work station so pending buffers drip by elapsed time
// (and hit the buffer cap) even if players never open the page. Accrual is always
// time-in-service, so this only credits real served time — no flat daily payout.
// Protected by CRON_SECRET (Vercel Cron sends it as a Bearer header).
export async function GET(req: Request) {
  // Fail closed: require CRON_SECRET to be set AND matched. Without this, an
  // unset secret left the endpoint publicly triggerable (settleAllStations = load
  // amplification). Vercel Cron sends the secret as a Bearer header.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const res = await settleAllStations();
  return NextResponse.json({ ok: true, ...res });
}
