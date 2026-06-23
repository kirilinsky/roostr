"use server";

import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import {
  createRoostr,
  recordDiscovery,
  spendResource,
  grantResource,
  maybeRewardReferrerOnHatch,
} from "@/db/queries";

// Hatch costs exactly ONE egg — no money hatch, no daily cooldown. New players
// get a starter egg at signup (see upsertUser); more eggs come from the farm.
export type HatchResult =
  | {
      ok: true;
      roostr: RolledRoostr;
      id: string | null; // DB row id when persisted
      saved: boolean;
      eggsLeft: number | null; // remaining eggs after the spend (null = admin / no-db)
    }
  | { ok: false; reason: "no-eggs" }
  | { ok: false; reason: "unauthenticated" };

export async function hatchAction(): Promise<HatchResult> {
  const session = await getSession();
  if (!session) return { ok: false, reason: "unauthenticated" };

  const admin = isAdmin(session.id);
  // Enforce the egg cost only with a DB and for non-admins (admins hatch freely
  // for testing; dev without DATABASE_URL falls back to a local-only reveal).
  const enforce = !admin && !!process.env.DATABASE_URL;

  let eggsLeft: number | null = null;
  if (enforce) {
    eggsLeft = await spendResource(session.id, "egg", 1, "hatch");
    if (eggsLeft === null) return { ok: false, reason: "no-eggs" };
  }

  const roostr = rollRoostr();
  const id = await createRoostr(session.id, roostr);
  if (id) {
    await recordDiscovery(session.id, roostr.breed.id);
    // Referrer milestone: reward the inviter once when this player hits 3 hatches.
    await maybeRewardReferrerOnHatch(session.id);
  } else if (enforce) {
    // Persistence failed after we charged → refund the egg so it isn't lost.
    eggsLeft = await grantResource(session.id, "egg", 1, "refund");
  }

  return { ok: true, roostr, id, saved: id !== null, eggsLeft };
}
