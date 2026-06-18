"use server";

import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import { claimHatch, createRoostr, recordDiscovery } from "@/db/queries";

// One hatch per 24h, enforced on the server (the client cooldown is just UX).
const HATCH_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export type HatchResult =
  | {
      ok: true;
      roostr: RolledRoostr;
      id: string | null; // DB row id when persisted
      saved: boolean;
      cooldownUntil: number | null; // when the next hatch unlocks (null = admin, no limit)
    }
  | { ok: false; reason: "cooldown"; cooldownUntil: number }
  | { ok: false; reason: "unauthenticated" };

// Authoritative hatch: must be logged in (so the daily limit is enforceable),
// claim the daily slot on the server, then roll + persist. Admins bypass the
// limit. Non-admins are globally capped at one rooster per 24h.
export async function hatchAction(): Promise<HatchResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const admin = isAdmin(session.id);
  const claim = await claimHatch(session.id, HATCH_COOLDOWN_MS, admin);

  if (claim.status === "cooldown") {
    return { ok: false, reason: "cooldown", cooldownUntil: claim.retryAt };
  }
  if (claim.status === "no-user") {
    return { ok: false, reason: "unauthenticated" };
  }

  // claim.status is "claimed" (slot reserved in DB) or "no-db" (dev, no enforcement).
  const roostr = rollRoostr();
  let id: string | null = null;
  if (claim.status === "claimed") {
    id = await createRoostr(session.id, roostr);
    if (id) await recordDiscovery(session.id, roostr.breed.id);
  }

  return {
    ok: true,
    roostr,
    id,
    saved: id !== null,
    cooldownUntil: admin ? null : Date.now() + HATCH_COOLDOWN_MS,
  };
}
