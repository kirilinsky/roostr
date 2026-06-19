import type { SessionUser } from "@/lib/auth";
import type { RolledRoostr } from "@/lib/roostr";

// Canonical pair order so a friendship is stored once regardless of direction.
function pair(a: number, b: number): [number, number] {
  return a < b ? [a, b] : [b, a];
}

// --- Roostrs (the rolled DNA + mutable gene levels) ---

// Persist a freshly rolled roostr. Returns the new row id, or null if the DB is
// unavailable / the insert failed (caller falls back to a local-only reveal).
export async function createRoostr(
  ownerId: number,
  r: RolledRoostr,
  origin = "hatch",
): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { roostrs, roostrTransfers } = await import("@/db/schema");
    const [row] = await db
      .insert(roostrs)
      .values({
        ownerId,
        breedId: r.breed.id,
        weightClassId: r.weightClass.id,
        geneIds: r.genes.map((g) => g.id),
        geneLevels: {}, // every gene starts at level 1 (implicit)
        colors: r.colors,
        pattern: r.pattern,
        role: r.role,
        maxHealth: r.maxHealth,
        seed: r.seed,
        origin,
        // status defaults to "active", meta to {} (see schema)
      })
      .returning({ id: roostrs.id });
    const id = row?.id ?? null;
    // Genesis provenance row: minted to its first owner (fromUserId = null).
    // Written here so EVERY rooster has a complete chain of custody from row 1.
    if (id) {
      await db
        .insert(roostrTransfers)
        .values({ roostrId: id, fromUserId: null, toUserId: ownerId, kind: origin });
    }
    return id;
  } catch (e) {
    console.error("createRoostr failed:", e);
    return null;
  }
}

// Append an ownership-change row (market sale, gift, trade, reward, …). Call
// this alongside updating roostrs.ownerId when a bird changes hands. Genesis
// (hatch) is recorded inside createRoostr, so don't double-write it here.
export async function recordTransfer(
  roostrId: string,
  fromUserId: number | null,
  toUserId: number,
  kind: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { roostrTransfers } = await import("@/db/schema");
    await db
      .insert(roostrTransfers)
      .values({ roostrId, fromUserId, toUserId, kind });
  } catch (e) {
    console.error("recordTransfer failed:", e);
  }
}

// Atomically spend coins. Deducts only if the balance covers `amount`; returns
// the new balance, or null if insufficient / DB unavailable. Single conditional
// UPDATE → race-safe against concurrent spends. Writes a signed ledger row
// (coin_txns) so spending is always tracked server-side — no client trust.
export async function spendCoins(
  userId: number,
  amount: number,
  kind: string,
  ref?: string,
): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { users, coinTxns } = await import("@/db/schema");
    const { and, eq, gte, sql } = await import("drizzle-orm");
    const res = await db
      .update(users)
      .set({ coins: sql`${users.coins} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(users.id, userId), gte(users.coins, amount)))
      .returning({ coins: users.coins });
    const balanceAfter = res[0]?.coins ?? null;
    if (balanceAfter === null) return null; // insufficient — nothing spent, no ledger row
    await db.insert(coinTxns).values({
      userId,
      amount: -amount,
      kind,
      ref: ref ?? null,
      balanceAfter,
    });
    return balanceAfter;
  } catch (e) {
    console.error("spendCoins failed:", e);
    return null;
  }
}

// Grant coins (reward / refund / faucet / admin). Returns the new balance or
// null. Also writes a positive ledger row.
export async function grantCoins(
  userId: number,
  amount: number,
  kind: string,
  ref?: string,
): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { users, coinTxns } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");
    const res = await db
      .update(users)
      .set({ coins: sql`${users.coins} + ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ coins: users.coins });
    const balanceAfter = res[0]?.coins ?? null;
    if (balanceAfter === null) return null; // no such user
    await db.insert(coinTxns).values({
      userId,
      amount,
      kind,
      ref: ref ?? null,
      balanceAfter,
    });
    return balanceAfter;
  } catch (e) {
    console.error("grantCoins failed:", e);
    return null;
  }
}

// Player economy stats: eggs hatched (roostrs minted by hatch) + lifetime coins
// earned/spent (from the ledger). Derived, not denormalized.
export async function getUserStats(userId: number): Promise<{
  eggsHatched: number;
  coinsEarned: number;
  coinsSpent: number;
}> {
  const empty = { eggsHatched: 0, coinsEarned: 0, coinsSpent: 0 };
  if (!process.env.DATABASE_URL) return empty;
  try {
    const { db } = await import("@/db");
    const { roostrs, coinTxns } = await import("@/db/schema");
    const { and, eq, gt, lt, sql } = await import("drizzle-orm");
    const [eggs] = await db
      .select({ n: sql<number>`count(*)` })
      .from(roostrs)
      .where(and(eq(roostrs.ownerId, userId), eq(roostrs.origin, "hatch")));
    const [earned] = await db
      .select({ s: sql<number>`coalesce(sum(${coinTxns.amount}), 0)` })
      .from(coinTxns)
      .where(and(eq(coinTxns.userId, userId), gt(coinTxns.amount, 0)));
    const [spent] = await db
      .select({ s: sql<number>`coalesce(sum(${coinTxns.amount}), 0)` })
      .from(coinTxns)
      .where(and(eq(coinTxns.userId, userId), lt(coinTxns.amount, 0)));
    return {
      eggsHatched: Number(eggs?.n ?? 0),
      coinsEarned: Number(earned?.s ?? 0),
      coinsSpent: Math.abs(Number(spent?.s ?? 0)),
    };
  } catch (e) {
    console.error("getUserStats failed:", e);
    return empty;
  }
}

// Full ownership history for a rooster, oldest first (genesis → current owner).
export async function getRoostrHistory(roostrId: string) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { roostrTransfers } = await import("@/db/schema");
    const { asc, eq } = await import("drizzle-orm");
    return await db
      .select()
      .from(roostrTransfers)
      .where(eq(roostrTransfers.roostrId, roostrId))
      .orderBy(asc(roostrTransfers.at));
  } catch (e) {
    console.error("getRoostrHistory failed:", e);
    return [];
  }
}

// Atomically claim a hatch slot for a user (server-side daily cooldown).
//
// One conditional UPDATE sets last_hatch_at = now() only when the user is
// eligible (admin bypass, or the cooldown has elapsed). Doing it in a single
// statement makes it race-safe: two concurrent hatch clicks can't both win.
//
//  - "claimed": slot taken, caller may roll + persist.
//  - "cooldown": still on cooldown; `retryAt` is when the next hatch unlocks.
//  - "no-user": no users row (must be logged in / upserted first).
//  - "no-db":  DATABASE_URL unset — cooldown can't be enforced (dev only).
export type HatchClaim =
  | { status: "claimed" }
  | { status: "cooldown"; retryAt: number }
  | { status: "no-user" }
  | { status: "no-db" };

export async function claimHatch(
  userId: number,
  cooldownMs: number,
  bypass: boolean,
): Promise<HatchClaim> {
  if (!process.env.DATABASE_URL) return { status: "no-db" };
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { and, eq, isNull, lte, or } = await import("drizzle-orm");

    const now = new Date();
    const cutoff = new Date(now.getTime() - cooldownMs);
    const eligible = bypass
      ? eq(users.id, userId)
      : and(
          eq(users.id, userId),
          or(isNull(users.lastHatchAt), lte(users.lastHatchAt, cutoff)),
        );

    const claimed = await db
      .update(users)
      .set({ lastHatchAt: now, updatedAt: now })
      .where(eligible)
      .returning({ id: users.id });
    if (claimed.length > 0) return { status: "claimed" };

    // Not claimed → either the user row is missing or they're on cooldown.
    const [row] = await db
      .select({ last: users.lastHatchAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) return { status: "no-user" };
    const retryAt = (row.last?.getTime() ?? 0) + cooldownMs;
    return { status: "cooldown", retryAt };
  } catch (e) {
    console.error("claimHatch failed:", e);
    // Fail closed: treat an error as "can't claim right now".
    return { status: "cooldown", retryAt: Date.now() + cooldownMs };
  }
}

// All of a user's roostrs, newest first.
export async function getRoostrs(ownerId: number) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, desc, eq } = await import("drizzle-orm");
    // Only ACTIVE birds belong to the roster: listed / sold / recycled ones are
    // locked out of the collection (and thus the lab/farm/battle pickers).
    return await db
      .select()
      .from(roostrs)
      .where(and(eq(roostrs.ownerId, ownerId), eq(roostrs.status, "active")))
      .orderBy(desc(roostrs.createdAt));
  } catch (e) {
    console.error("getRoostrs failed:", e);
    return [];
  }
}

// A single roostr by id (null if absent / DB unavailable).
export async function getRoostr(id: string) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(roostrs).where(eq(roostrs.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("getRoostr failed:", e);
    return null;
  }
}

// Overwrite a roostr's gene levels (owner-guarded). Returns true on success.
export async function setGeneLevels(
  id: string,
  ownerId: number,
  levels: Record<string, number>,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const res = await db
      .update(roostrs)
      .set({ geneLevels: levels })
      .where(and(eq(roostrs.id, id), eq(roostrs.ownerId, ownerId)))
      .returning({ id: roostrs.id });
    return res.length > 0;
  } catch (e) {
    console.error("setGeneLevels failed:", e);
    return false;
  }
}

// Record a Roostrdex unlock (survives recycling the roostr). Idempotent.
export async function recordDiscovery(userId: number, breedId: string): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { breedDiscoveries } = await import("@/db/schema");
    await db
      .insert(breedDiscoveries)
      .values({ userId, breedId })
      .onConflictDoNothing();
  } catch (e) {
    console.error("recordDiscovery failed:", e);
  }
}

// Returns the friendship row (with createdAt = since) or null.
export async function getFriendship(a: number, b: number) {
  if (!process.env.DATABASE_URL || a === b) return null;
  try {
    const { db } = await import("@/db");
    const { friendships } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [x, y] = pair(a, b);
    const rows = await db
      .select()
      .from(friendships)
      .where(and(eq(friendships.userAId, x), eq(friendships.userBId, y)))
      .limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("getFriendship failed:", e);
    return null;
  }
}

export async function addFriend(a: number, b: number): Promise<void> {
  if (!process.env.DATABASE_URL || a === b) return;
  try {
    const { db } = await import("@/db");
    const { friendships } = await import("@/db/schema");
    const [x, y] = pair(a, b);
    await db
      .insert(friendships)
      .values({ userAId: x, userBId: y })
      .onConflictDoNothing();
  } catch (e) {
    console.error("addFriend failed:", e);
  }
}

export async function removeFriend(a: number, b: number): Promise<void> {
  if (!process.env.DATABASE_URL || a === b) return;
  try {
    const { db } = await import("@/db");
    const { friendships } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [x, y] = pair(a, b);
    await db
      .delete(friendships)
      .where(and(eq(friendships.userAId, x), eq(friendships.userBId, y)));
  } catch (e) {
    console.error("removeFriend failed:", e);
  }
}

// All friends of a user (the "other" side of each pair) + since date.
export async function getFriends(userId: number) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { friendships, users } = await import("@/db/schema");
    const { or, eq, sql } = await import("drizzle-orm");
    return await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        since: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(
        users,
        sql`${users.id} = case when ${friendships.userAId} = ${userId} then ${friendships.userBId} else ${friendships.userAId} end`,
      )
      .where(or(eq(friendships.userAId, userId), eq(friendships.userBId, userId)))
      .orderBy(friendships.createdAt);
  } catch (e) {
    console.error("getFriends failed:", e);
    return [];
  }
}

// Public profile lookup by Telegram id. Returns null if absent / DB unavailable.
export async function getUserById(id: number) {
  if (!process.env.DATABASE_URL || !Number.isFinite(id)) return null;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("getUserById failed:", e);
    return null;
  }
}

// Best-effort: create/refresh the users row on login. Never blocks auth — if the
// DB is unconfigured or unreachable, we log and move on (the session still
// issues). `db` is imported lazily so a missing DATABASE_URL can't break login.
//
// `overwrite`: real Telegram login refreshes profile fields (true). Dev fake-auth
// passes false so logging in as the fake admin (same id 339784494) does NOT
// clobber the real Telegram name/photo already stored — it only inserts if absent.
export async function upsertUser(
  u: SessionUser,
  { overwrite = true }: { overwrite?: boolean } = {},
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const fields = {
      username: u.username ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      photoUrl: u.photoUrl ?? null,
    };
    const insert = db.insert(users).values({ id: u.id, ...fields });
    if (overwrite) {
      await insert.onConflictDoUpdate({
        target: users.id,
        set: { ...fields, updatedAt: new Date() },
      });
    } else {
      await insert.onConflictDoNothing();
    }
  } catch (e) {
    console.error("upsertUser failed:", e);
  }
}

// --- Market ---

// Live market offers: active, not yet expired, soonest-ending first. Returns the
// listing joined with its roostr row (hydrate the roostr in the caller).
export async function getActiveListings() {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { listings, roostrs } = await import("@/db/schema");
    const { and, asc, eq, gt } = await import("drizzle-orm");
    return await db
      .select({ listing: listings, roostr: roostrs })
      .from(listings)
      .innerJoin(roostrs, eq(listings.roostrId, roostrs.id))
      .where(and(eq(listings.status, "active"), gt(listings.expiresAt, new Date())))
      .orderBy(asc(listings.expiresAt));
  } catch (e) {
    console.error("getActiveListings failed:", e);
    return [];
  }
}
