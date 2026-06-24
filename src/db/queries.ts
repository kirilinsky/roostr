import type { SessionUser } from "@/lib/auth";
import { parseReferralId } from "@/lib/referrals";
import { hydrateRoostr, type RolledRoostr } from "@/lib/roostr";
import {
  STATIONS,
  settlePending,
  BASE_SLOTS,
  MAX_SLOTS,
  type StationKind,
} from "@/lib/stations";

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

// --- Currency ledger (coins / science / eggs / feathers) ---
// One generic ledger (resource_txns) backs every currency. `ResourceKind` maps
// to a balance column on `users`; the helpers update that column AND append a
// signed ledger row in one go, so the history is always in sync with the balance.

export type ResourceKind = "coin" | "sci" | "egg" | "feather";

// resource → drizzle field name on the users table (what `.set` keys on).
const RESOURCE_FIELD: Record<ResourceKind, "coins" | "sci" | "eggs" | "feathers"> = {
  coin: "coins",
  sci: "sci",
  egg: "eggs",
  feather: "feathers",
};

// Atomically spend `amount` of a resource. Deducts only if the balance covers it;
// returns the new balance, or null if insufficient / DB unavailable. Single
// conditional UPDATE → race-safe against concurrent spends. Writes a signed
// ledger row so spending is always tracked server-side — no client trust.
export async function spendResource(
  userId: number,
  resource: ResourceKind,
  amount: number,
  kind: string,
  ref?: string,
): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { users, resourceTxns } = await import("@/db/schema");
    const { and, eq, gte, sql } = await import("drizzle-orm");
    const field = RESOURCE_FIELD[resource];
    const col = users[field];
    const res = await db
      .update(users)
      .set({ [field]: sql`${col} - ${amount}`, updatedAt: new Date() })
      .where(and(eq(users.id, userId), gte(col, amount)))
      .returning({ bal: col });
    const balanceAfter = res[0]?.bal ?? null;
    if (balanceAfter === null) return null; // insufficient — nothing spent, no ledger row
    await db.insert(resourceTxns).values({
      userId,
      resource,
      amount: -amount,
      kind,
      ref: ref ?? null,
      balanceAfter,
    });
    return balanceAfter;
  } catch (e) {
    console.error("spendResource failed:", e);
    return null;
  }
}

// Grant `amount` of a resource (reward / refund / faucet / admin). Returns the
// new balance or null. Also writes a positive ledger row.
export async function grantResource(
  userId: number,
  resource: ResourceKind,
  amount: number,
  kind: string,
  ref?: string,
): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { users, resourceTxns } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");
    const field = RESOURCE_FIELD[resource];
    const col = users[field];
    const res = await db
      .update(users)
      .set({ [field]: sql`${col} + ${amount}`, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ bal: col });
    const balanceAfter = res[0]?.bal ?? null;
    if (balanceAfter === null) return null; // no such user
    await db.insert(resourceTxns).values({
      userId,
      resource,
      amount,
      kind,
      ref: ref ?? null,
      balanceAfter,
    });
    return balanceAfter;
  } catch (e) {
    console.error("grantResource failed:", e);
    return null;
  }
}

// Back-compat thin wrappers — existing call sites spend/grant coins by name.
export function spendCoins(userId: number, amount: number, kind: string, ref?: string) {
  return spendResource(userId, "coin", amount, kind, ref);
}
export function grantCoins(userId: number, amount: number, kind: string, ref?: string) {
  return grantResource(userId, "coin", amount, kind, ref);
}

// A single ledger row shape for the UI (the bank history list).
export interface ResourceTxn {
  id: string;
  resource: ResourceKind;
  amount: number; // signed: + income, − expense
  kind: string;
  ref: string | null;
  balanceAfter: number;
  at: Date;
}

// Recent currency movements for a user, newest first. Optionally filter to one
// resource; `limit` caps the page (default 50). Drives the bank history view.
export async function getResourceTxns(
  userId: number,
  opts: { resource?: ResourceKind; limit?: number } = {},
): Promise<ResourceTxn[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { resourceTxns } = await import("@/db/schema");
    const { and, desc, eq } = await import("drizzle-orm");
    const where = opts.resource
      ? and(eq(resourceTxns.userId, userId), eq(resourceTxns.resource, opts.resource))
      : eq(resourceTxns.userId, userId);
    const rows = await db
      .select()
      .from(resourceTxns)
      .where(where)
      .orderBy(desc(resourceTxns.at))
      .limit(opts.limit ?? 50);
    return rows as ResourceTxn[];
  } catch (e) {
    console.error("getResourceTxns failed:", e);
    return [];
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
    const { roostrs, resourceTxns } = await import("@/db/schema");
    const { and, eq, gt, lt, sql } = await import("drizzle-orm");
    const [eggs] = await db
      .select({ n: sql<number>`count(*)` })
      .from(roostrs)
      .where(and(eq(roostrs.ownerId, userId), eq(roostrs.origin, "hatch")));
    const isCoin = eq(resourceTxns.resource, "coin");
    const [earned] = await db
      .select({ s: sql<number>`coalesce(sum(${resourceTxns.amount}), 0)` })
      .from(resourceTxns)
      .where(and(eq(resourceTxns.userId, userId), isCoin, gt(resourceTxns.amount, 0)));
    const [spent] = await db
      .select({ s: sql<number>`coalesce(sum(${resourceTxns.amount}), 0)` })
      .from(resourceTxns)
      .where(and(eq(resourceTxns.userId, userId), isCoin, lt(resourceTxns.amount, 0)));
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

// Full profile metrics map for the achievements engine — the single source of the
// profile wiring (evaluate() reads these by key; absent keys → 0 → locked). Only
// metrics whose data is actually produced today are computed; the rest stay absent
// on purpose. See .notes/ACHIEVEMENTS-ROADMAP.md for what's wired vs blocked.
export async function getProfileMetrics(
  userId: number,
): Promise<Record<string, number>> {
  const base = await getUserStats(userId); // eggsHatched, coinsEarned, coinsSpent
  const metrics: Record<string, number> = { ...base };
  if (!process.env.DATABASE_URL) return metrics;
  try {
    const { db } = await import("@/db");
    const { resourceTxns, friendships, users, breedDiscoveries } = await import(
      "@/db/schema"
    );
    const { and, eq, gt, or, sql } = await import("drizzle-orm");
    const { hydrateRoostr, TIERS } = await import("@/lib/roostr");

    // Lifetime science earned (positive sci ledger rows — lab claims).
    const [sci] = await db
      .select({ s: sql<number>`coalesce(sum(${resourceTxns.amount}), 0)` })
      .from(resourceTxns)
      .where(
        and(
          eq(resourceTxns.userId, userId),
          eq(resourceTxns.resource, "sci"),
          gt(resourceTxns.amount, 0),
        ),
      );
    metrics.sciEarned = Number(sci?.s ?? 0);

    // Friends (a friendship row stores the pair canonically; match either side).
    const [fr] = await db
      .select({ n: sql<number>`count(*)` })
      .from(friendships)
      .where(or(eq(friendships.userAId, userId), eq(friendships.userBId, userId)));
    metrics.friends = Number(fr?.n ?? 0);

    // Breeds discovered (persistent dex — survives recycling the bird).
    const [bd] = await db
      .select({ n: sql<number>`count(*)` })
      .from(breedDiscoveries)
      .where(eq(breedDiscoveries.userId, userId));
    metrics.breedsDiscovered = Number(bd?.n ?? 0);

    // Battle record (denormalized on users; 0 until the battle system writes it).
    const [u] = await db
      .select({ wins: users.wins, losses: users.losses, draws: users.draws })
      .from(users)
      .where(eq(users.id, userId));
    metrics.wins = Number(u?.wins ?? 0);
    metrics.losses = Number(u?.losses ?? 0);
    metrics.battles = metrics.wins + metrics.losses + Number(u?.draws ?? 0);

    // Owned collection (active + working) → count, highest tier, distinct tiers.
    const owned = await getCollectionRoostrs(userId);
    metrics.roostrsOwned = owned.length;
    let highest = 0;
    const tiers = new Set<number>();
    for (const row of owned) {
      const rank = TIERS.findIndex((t) => t.id === hydrateRoostr(row).tier.id);
      if (rank > highest) highest = rank;
      if (rank >= 0) tiers.add(rank);
    }
    metrics.highestTier = highest;
    metrics.tiersOwned = tiers.size;
  } catch (e) {
    console.error("getProfileMetrics failed:", e);
  }
  return metrics;
}

// Persisted achievement unlocks for a user: id → ISO unlock date. The presence
// of a row means earned (permanent); the date is when it first unlocked.
export async function getAchievementUnlocks(
  userId: number,
): Promise<{ achievementId: string; unlockedAt: string }[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { achievementUnlocks } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({
        achievementId: achievementUnlocks.achievementId,
        unlockedAt: achievementUnlocks.unlockedAt,
      })
      .from(achievementUnlocks)
      .where(eq(achievementUnlocks.userId, userId));
    return rows.map((r) => ({
      achievementId: r.achievementId,
      unlockedAt: r.unlockedAt.toISOString(),
    }));
  } catch (e) {
    console.error("getAchievementUnlocks failed:", e);
    return [];
  }
}

// Persist currently-satisfied achievements. Idempotent (onConflictDoNothing on the
// (user, achievement) PK), so it's safe to call on every load. Returns the ids that
// were NEWLY inserted — i.e. just unlocked — so the caller can toast exactly those.
export async function recordAchievementUnlocks(
  userId: number,
  achievementIds: string[],
  scope: "profile" | "rooster" = "profile",
  roostrId: string | null = null,
): Promise<string[]> {
  if (!achievementIds.length || !process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { achievementUnlocks } = await import("@/db/schema");
    const rows = await db
      .insert(achievementUnlocks)
      .values(
        achievementIds.map((id) => ({
          userId,
          achievementId: id,
          scope,
          // Only rooster-scope unlocks carry a bird link.
          roostrId: scope === "rooster" ? roostrId : null,
        })),
      )
      .onConflictDoNothing()
      .returning({ achievementId: achievementUnlocks.achievementId });
    return rows.map((r) => r.achievementId);
  } catch (e) {
    console.error("recordAchievementUnlocks failed:", e);
    return [];
  }
}

export interface AchievementNotification {
  achievementId: string;
  scope: string; // "profile" | "rooster"
  roostrId: string | null; // bird to link to (rooster scope)
  unlockedAt: string;
}

// Achievements unlocked AFTER the read-cursor → "you earned X" notifications.
// Newest first. Definitions (icon/name) are resolved client-side by id.
export async function getNewAchievements(
  userId: number,
): Promise<AchievementNotification[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { achievementUnlocks, users } = await import("@/db/schema");
    const { and, desc, eq, gt } = await import("drizzle-orm");
    const [u] = await db
      .select({ seen: users.notificationsSeenAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const seen = u?.seen ?? null;
    const filter = seen
      ? and(
          eq(achievementUnlocks.userId, userId),
          gt(achievementUnlocks.unlockedAt, seen),
        )
      : eq(achievementUnlocks.userId, userId);
    const rows = await db
      .select({
        achievementId: achievementUnlocks.achievementId,
        scope: achievementUnlocks.scope,
        roostrId: achievementUnlocks.roostrId,
        unlockedAt: achievementUnlocks.unlockedAt,
      })
      .from(achievementUnlocks)
      .where(filter)
      .orderBy(desc(achievementUnlocks.unlockedAt))
      .limit(50);
    return rows.map((r) => ({
      achievementId: r.achievementId,
      scope: r.scope,
      roostrId: r.roostrId,
      unlockedAt: r.unlockedAt.toISOString(),
    }));
  } catch (e) {
    console.error("getNewAchievements failed:", e);
    return [];
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

// Collection roster: ACTIVE + WORKING birds (working ones show a station badge,
// stay on the roster but can't be sold). Excludes listed/sold/recycled. Newest first.
export async function getCollectionRoostrs(ownerId: number) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, desc, eq, inArray } = await import("drizzle-orm");
    return await db
      .select()
      .from(roostrs)
      .where(
        and(
          eq(roostrs.ownerId, ownerId),
          inArray(roostrs.status, ["active", "working"]),
        ),
      )
      .orderBy(desc(roostrs.createdAt));
  } catch (e) {
    console.error("getCollectionRoostrs failed:", e);
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

// Set (or clear) a roostr's custom nickname (owner-guarded). Pass null to clear
// back to the breed-name default. Returns true on success.
export async function setNickname(
  id: string,
  ownerId: number,
  nickname: string | null,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const res = await db
      .update(roostrs)
      .set({ nickname })
      .where(and(eq(roostrs.id, id), eq(roostrs.ownerId, ownerId)))
      .returning({ id: roostrs.id });
    return res.length > 0;
  } catch (e) {
    console.error("setNickname failed:", e);
    return false;
  }
}

// Record a Roostrdex unlock (survives recycling the roostr). Idempotent — the
// conditional insert no-ops if the breed is already discovered. Returns whether
// this was a genuinely new breed (so the hatch reveal can flag a first catch).
// (Collection rewards are a future step — see §A.13.)
export async function recordDiscovery(
  userId: number,
  breedId: string,
): Promise<{ isNew: boolean }> {
  if (!process.env.DATABASE_URL) return { isNew: false };
  try {
    const { db } = await import("@/db");
    const { breedDiscoveries } = await import("@/db/schema");
    const inserted = await db
      .insert(breedDiscoveries)
      .values({ userId, breedId })
      .onConflictDoNothing()
      .returning({ breedId: breedDiscoveries.breedId });
    return { isNew: inserted.length > 0 };
  } catch (e) {
    console.error("recordDiscovery failed:", e);
    return { isNew: false };
  }
}

// Set the collection-visibility privacy flag for a user. Returns the new value
// on success, or null on failure / DB unavailable.
export async function setCollectionPublic(
  userId: number,
  value: boolean,
): Promise<boolean | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const res = await db
      .update(users)
      .set({ collectionPublic: value, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ v: users.collectionPublic });
    return res[0]?.v ?? null;
  } catch (e) {
    console.error("setCollectionPublic failed:", e);
    return null;
  }
}

// All breed ids a user has discovered (the persistent dex source of truth).
export async function getDiscoveredBreeds(userId: number): Promise<string[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { breedDiscoveries } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ breedId: breedDiscoveries.breedId })
      .from(breedDiscoveries)
      .where(eq(breedDiscoveries.userId, userId));
    return rows.map((r) => r.breedId);
  } catch (e) {
    console.error("getDiscoveredBreeds failed:", e);
    return [];
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

// --- Friend requests (pending, directed: from asked to) ---

// Send a request from→to. No-op if self / already friends. If the OTHER side
// already requested you, this acts as an ACCEPT (befriend + clear the reverse
// request). Returns the resulting state for the UI.
export async function sendFriendRequest(
  fromId: number,
  toId: number,
): Promise<"sent" | "befriended" | "exists" | "noop"> {
  if (!process.env.DATABASE_URL || fromId === toId) return "noop";
  try {
    const { db } = await import("@/db");
    const { friendRequests } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    if (await getFriendship(fromId, toId)) return "noop"; // already friends
    // Reverse request pending → treat this as accepting it.
    const [reverse] = await db
      .select({ f: friendRequests.fromUserId })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, toId),
          eq(friendRequests.toUserId, fromId),
        ),
      )
      .limit(1);
    if (reverse) {
      await addFriend(fromId, toId);
      await db
        .delete(friendRequests)
        .where(
          and(
            eq(friendRequests.fromUserId, toId),
            eq(friendRequests.toUserId, fromId),
          ),
        );
      return "befriended";
    }
    const inserted = await db
      .insert(friendRequests)
      .values({ fromUserId: fromId, toUserId: toId })
      .onConflictDoNothing()
      .returning({ f: friendRequests.fromUserId });
    return inserted.length > 0 ? "sent" : "exists";
  } catch (e) {
    console.error("sendFriendRequest failed:", e);
    return "noop";
  }
}

// Has `fromId` already sent a pending request to `toId`? (button state)
export async function hasPendingRequest(
  fromId: number,
  toId: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { friendRequests } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [row] = await db
      .select({ f: friendRequests.fromUserId })
      .from(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, fromId),
          eq(friendRequests.toUserId, toId),
        ),
      )
      .limit(1);
    return !!row;
  } catch (e) {
    console.error("hasPendingRequest failed:", e);
    return false;
  }
}

export interface FriendRequestSummary {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  createdAt: Date;
}

// Incoming requests for a user (the notifications feed), newest first.
export async function getIncomingFriendRequests(
  userId: number,
): Promise<FriendRequestSummary[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { friendRequests, users } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    return await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(users.id, friendRequests.fromUserId))
      .where(eq(friendRequests.toUserId, userId))
      .orderBy(desc(friendRequests.createdAt));
  } catch (e) {
    console.error("getIncomingFriendRequests failed:", e);
    return [];
  }
}

// Outgoing requests the user SENT (pending), newest first — the recipient's card.
export async function getOutgoingFriendRequests(
  userId: number,
): Promise<FriendRequestSummary[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { friendRequests, users } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    return await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        createdAt: friendRequests.createdAt,
      })
      .from(friendRequests)
      .innerJoin(users, eq(users.id, friendRequests.toUserId))
      .where(eq(friendRequests.fromUserId, userId))
      .orderBy(desc(friendRequests.createdAt));
  } catch (e) {
    console.error("getOutgoingFriendRequests failed:", e);
    return [];
  }
}

// Accept (fromId asked toId): delete the request + befriend. False if no request.
export async function acceptFriendRequest(
  toId: number,
  fromId: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { friendRequests } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const deleted = await db
      .delete(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, fromId),
          eq(friendRequests.toUserId, toId),
        ),
      )
      .returning({ f: friendRequests.fromUserId });
    if (deleted.length === 0) return false;
    await addFriend(toId, fromId);
    return true;
  } catch (e) {
    console.error("acceptFriendRequest failed:", e);
    return false;
  }
}

// Decline (fromId asked toId): just delete the request.
export async function declineFriendRequest(
  toId: number,
  fromId: number,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { friendRequests } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    await db
      .delete(friendRequests)
      .where(
        and(
          eq(friendRequests.fromUserId, fromId),
          eq(friendRequests.toUserId, toId),
        ),
      );
  } catch (e) {
    console.error("declineFriendRequest failed:", e);
  }
}

// Count UNREAD notifications for the HUD bell badge: incoming friend requests
// newer than the user's read-cursor (`notificationsSeenAt`); all of them if the
// cursor is unset. (Friend requests are the only notification type for now.)
export async function countUnreadNotifications(userId: number): Promise<number> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return 0;
  try {
    const { db } = await import("@/db");
    const {
      friendRequests,
      friendships,
      breedDiscoveries,
      news,
      achievementUnlocks,
      users,
    } = await import("@/db/schema");
    const { and, eq, gt, or, sql } = await import("drizzle-orm");
    const [u] = await db
      .select({ seen: users.notificationsSeenAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const seen = u?.seen ?? null;
    const reqFilter = seen
      ? and(
          eq(friendRequests.toUserId, userId),
          gt(friendRequests.createdAt, seen),
        )
      : eq(friendRequests.toUserId, userId);
    const [row] = await db
      .select({ n: sql<number>`count(*)` })
      .from(friendRequests)
      .where(reqFilter);
    // Roostrdex discoveries newer than the read-cursor ("new entry").
    const dexFilter = seen
      ? and(
          eq(breedDiscoveries.userId, userId),
          gt(breedDiscoveries.discoveredAt, seen),
        )
      : eq(breedDiscoveries.userId, userId);
    const [dex] = await db
      .select({ n: sql<number>`count(*)` })
      .from(breedDiscoveries)
      .where(dexFilter);
    // New friendships newer than the cursor ("you're now friends with X").
    const mine = or(
      eq(friendships.userAId, userId),
      eq(friendships.userBId, userId),
    );
    const friendFilter = seen
      ? and(mine, gt(friendships.createdAt, seen))
      : mine;
    const [nf] = await db
      .select({ n: sql<number>`count(*)` })
      .from(friendships)
      .where(friendFilter);
    // News published after the cursor ("new announcement").
    const newsFilter = seen
      ? and(eq(news.active, true), gt(news.createdAt, seen))
      : eq(news.active, true);
    const [nw] = await db
      .select({ n: sql<number>`count(*)` })
      .from(news)
      .where(newsFilter);
    // Achievements unlocked after the cursor ("you earned X").
    const achFilter = seen
      ? and(
          eq(achievementUnlocks.userId, userId),
          gt(achievementUnlocks.unlockedAt, seen),
        )
      : eq(achievementUnlocks.userId, userId);
    const [ach] = await db
      .select({ n: sql<number>`count(*)` })
      .from(achievementUnlocks)
      .where(achFilter);
    // Plus: stations that filled up AFTER the read-cursor ("come claim it").
    const seenMs = seen ? seen.getTime() : 0;
    const stationUnread = (await getStationAlerts(userId)).filter(
      (a) => a.fullAt > seenMs,
    ).length;
    return (
      Number(row?.n ?? 0) +
      Number(dex?.n ?? 0) +
      Number(nf?.n ?? 0) +
      Number(nw?.n ?? 0) +
      Number(ach?.n ?? 0) +
      stationUnread
    );
  } catch (e) {
    console.error("countUnreadNotifications failed:", e);
    return 0;
  }
}

export interface StationAlert {
  kind: StationKind;
  fullAt: number; // ms timestamp the buffer reached its cap
}

const STATION_ALERT_DAY_MS = 86_400_000;

// Stations whose buffer is FULL right now (production paused → claim it). Derived
// live from the station state (no stored rows). `fullAt` = when it hit the cap, so
// the bell badge can treat it as unread until the player next opens notifications.
export async function getStationAlerts(
  userId: number,
): Promise<StationAlert[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  const out: StationAlert[] = [];
  try {
    const now = Date.now();
    for (const kind of ["farm", "lab"] as StationKind[]) {
      const view = await getStationView(userId, kind);
      if (view.workers.length === 0) continue; // no workers → never fills
      const def = STATIONS[kind];
      const rate = def.ratePerDay(totalStat(view.workers, kind), view.workers.length);
      let fullAt: number;
      if (view.pending >= def.bufferCap) {
        fullAt = view.lastSettleAtMs; // already at/over cap
      } else if (rate > 0) {
        fullAt =
          view.lastSettleAtMs +
          ((def.bufferCap - view.pending) / rate) * STATION_ALERT_DAY_MS;
      } else {
        continue; // rate 0 → never fills
      }
      if (now >= fullAt) out.push({ kind, fullAt });
    }
  } catch (e) {
    console.error("getStationAlerts failed:", e);
  }
  return out;
}

export interface DiscoverySummary {
  breedId: string;
  discoveredAt: string;
}

// A user's Roostrdex discoveries, newest first — surfaced as "new entry" notifs.
export async function getRecentDiscoveries(
  userId: number,
  limit = 50,
): Promise<DiscoverySummary[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { breedDiscoveries } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    const rows = await db
      .select({
        breedId: breedDiscoveries.breedId,
        discoveredAt: breedDiscoveries.discoveredAt,
      })
      .from(breedDiscoveries)
      .where(eq(breedDiscoveries.userId, userId))
      .orderBy(desc(breedDiscoveries.discoveredAt))
      .limit(limit);
    return rows.map((r) => ({
      breedId: r.breedId,
      discoveredAt: r.discoveredAt.toISOString(),
    }));
  } catch (e) {
    console.error("getRecentDiscoveries failed:", e);
    return [];
  }
}

// Friendships newer than the read-cursor → "you're now friends with X" notifs.
// This is how a REQUESTER learns their request was accepted (the accepter bumps
// their own cursor on accept, so they don't get a redundant self-notification).
export async function getNewFriends(
  userId: number,
): Promise<FriendRequestSummary[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { friendships, users } = await import("@/db/schema");
    const { and, desc, eq, gt, or, sql } = await import("drizzle-orm");
    const [u] = await db
      .select({ seen: users.notificationsSeenAt })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const seen = u?.seen ?? null;
    const mine = or(
      eq(friendships.userAId, userId),
      eq(friendships.userBId, userId),
    );
    const filter = seen ? and(mine, gt(friendships.createdAt, seen)) : mine;
    return await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        createdAt: friendships.createdAt,
      })
      .from(friendships)
      .innerJoin(
        users,
        sql`${users.id} = case when ${friendships.userAId} = ${userId} then ${friendships.userBId} else ${friendships.userAId} end`,
      )
      .where(filter)
      .orderBy(desc(friendships.createdAt));
  } catch (e) {
    console.error("getNewFriends failed:", e);
    return [];
  }
}

// --- News (system / promo announcements + claim-once CTA) ---

export interface NewsItem {
  id: string;
  title: { en: string; ru: string };
  body: { en: string; ru: string };
  link: string | null;
  ctaType: string | null; // null | "claim_egg"
  ctaAmount: number | null;
  createdAt: string;
  claimed: boolean; // has THIS user claimed the CTA?
}

// Active news newest-first, flagged with whether the user already claimed the CTA.
export async function getNews(
  userId: number,
  limit = 50,
): Promise<NewsItem[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { news, newsClaims } = await import("@/db/schema");
    const { and, desc, eq, sql } = await import("drizzle-orm");
    const rows = await db
      .select({
        id: news.id,
        titleEn: news.titleEn,
        titleRu: news.titleRu,
        bodyEn: news.bodyEn,
        bodyRu: news.bodyRu,
        link: news.link,
        ctaType: news.ctaType,
        ctaAmount: news.ctaAmount,
        createdAt: news.createdAt,
        claimed: sql<boolean>`${newsClaims.newsId} is not null`,
      })
      .from(news)
      .leftJoin(
        newsClaims,
        and(eq(newsClaims.newsId, news.id), eq(newsClaims.userId, userId)),
      )
      .where(eq(news.active, true))
      .orderBy(desc(news.createdAt))
      .limit(limit);
    return rows.map((r) => ({
      id: r.id,
      title: { en: r.titleEn, ru: r.titleRu },
      body: { en: r.bodyEn, ru: r.bodyRu },
      link: r.link,
      ctaType: r.ctaType,
      ctaAmount: r.ctaAmount,
      createdAt: r.createdAt.toISOString(),
      claimed: !!r.claimed,
    }));
  } catch (e) {
    console.error("getNews failed:", e);
    return [];
  }
}

// Claim a news CTA — once per user (CAS on the news_claims PK). Returns the granted
// egg amount on success; { ok:false } if already claimed / no claimable CTA.
export async function claimNews(
  userId: number,
  newsId: string,
): Promise<{ ok: boolean; egg?: number }> {
  if (!process.env.DATABASE_URL) return { ok: false };
  try {
    const { db } = await import("@/db");
    const { news, newsClaims } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [n] = await db
      .select({
        ctaType: news.ctaType,
        ctaAmount: news.ctaAmount,
        active: news.active,
      })
      .from(news)
      .where(eq(news.id, newsId))
      .limit(1);
    if (!n || !n.active || n.ctaType !== "claim_egg") return { ok: false };
    const claimed = await db
      .insert(newsClaims)
      .values({ newsId, userId })
      .onConflictDoNothing()
      .returning({ newsId: newsClaims.newsId });
    if (claimed.length === 0) return { ok: false }; // already claimed
    const egg = n.ctaAmount ?? 0;
    if (egg > 0) await grantResource(userId, "egg", egg, "news");
    return { ok: true, egg };
  } catch (e) {
    console.error("claimNews failed:", e);
    return { ok: false };
  }
}

// Publish a news item (admin). Returns the new id.
export async function createNews(input: {
  titleEn: string;
  titleRu: string;
  bodyEn: string;
  bodyRu: string;
  link?: string | null;
  ctaType?: string | null;
  ctaAmount?: number | null;
}): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { news } = await import("@/db/schema");
    const [row] = await db
      .insert(news)
      .values({
        titleEn: input.titleEn,
        titleRu: input.titleRu,
        bodyEn: input.bodyEn,
        bodyRu: input.bodyRu,
        link: input.link ?? null,
        ctaType: input.ctaType ?? null,
        ctaAmount: input.ctaAmount ?? null,
      })
      .returning({ id: news.id });
    return row?.id ?? null;
  } catch (e) {
    console.error("createNews failed:", e);
    return null;
  }
}

// Mark the notifications feed as read up to now (clears the bell badge). Called
// when the user opens /notifications.
export async function markNotificationsSeen(userId: number): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    await db
      .update(users)
      .set({ notificationsSeenAt: new Date() })
      .where(eq(users.id, userId));
  } catch (e) {
    console.error("markNotificationsSeen failed:", e);
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

export interface ReferralSummary {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
  registeredAt: Date;
}

// Users who successfully registered through this user's referral link.
export async function getReferredUsers(
  referrerId: number,
): Promise<ReferralSummary[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(referrerId)) return [];
  try {
    const { db } = await import("@/db");
    const { referrals, users } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    return await db
      .select({
        id: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        registeredAt: referrals.registeredAt,
      })
      .from(referrals)
      .innerJoin(users, eq(users.id, referrals.refereeId))
      .where(eq(referrals.referrerId, referrerId))
      .orderBy(desc(referrals.registeredAt));
  } catch (e) {
    console.error("getReferredUsers failed:", e);
    return [];
  }
}

// Total registered players — drives the "launch at N players" progress gates.
export async function countUsers(): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { sql } = await import("drizzle-orm");
    const [r] = await db.select({ n: sql<number>`count(*)` }).from(users);
    return Number(r?.n ?? 0);
  } catch (e) {
    console.error("countUsers failed:", e);
    return 0;
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
const STARTER_EGGS = 1; // eggs granted once, to a brand-new player at signup
const REFERRAL_BONUS_EGGS = 1; // extra egg for a newcomer who arrived via a ref link
const REFERRAL_BONUS_COINS = 50; // starter coins for a referred newcomer
// Milestone rewards paid to the REFERRER (inviter), once per referee (V17).
const REFERRER_SIGNUP_COINS = 5; // referee registered
const REFERRER_HATCH3_THRESHOLD = 3; // referee hatched this many eggs →
const REFERRER_HATCH3_EGGS = 1; //   referrer gets an egg
// (T35 — referee's first battle → referrer +75 coins — lands with the battle system.)

export async function upsertUser(
  u: SessionUser,
  {
    overwrite = true,
    referredById,
  }: { overwrite?: boolean; referredById?: number | null } = {},
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { users, referrals } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    let validReferrerId = parseReferralId(referredById, u.id);
    if (validReferrerId) {
      const referrer = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, validReferrerId))
        .limit(1);
      if (referrer.length === 0) validReferrerId = null;
    }
    const fields = {
      username: u.username ?? null,
      firstName: u.firstName ?? null,
      lastName: u.lastName ?? null,
      photoUrl: u.photoUrl ?? null,
    };
    const referralFields = validReferrerId
      ? { referredById: validReferrerId, referredAt: new Date() }
      : {};
    // Insert-if-absent; `returning` tells us whether this is a brand-new player.
    const inserted = await db
      .insert(users)
      .values({ id: u.id, ...fields, ...referralFields })
      .onConflictDoNothing()
      .returning({ id: users.id });
    const isNew = inserted.length > 0;

    if (isNew && validReferrerId) {
      await db
        .insert(referrals)
        .values({
          referrerId: validReferrerId,
          refereeId: u.id,
        })
        .onConflictDoNothing();
    }

    // Existing player + real login → refresh profile fields.
    if (!isNew && overwrite) {
      await db
        .update(users)
        .set({ ...fields, updatedAt: new Date() })
        .where(eq(users.id, u.id));
    }

    // Brand-new player → starter egg (one free hatch), through the audited ledger.
    // A referred newcomer also gets a bonus egg + starter coins (the invite reward).
    if (isNew) {
      await grantResource(u.id, "egg", STARTER_EGGS, "starter");
      if (validReferrerId) {
        // Referee bonus.
        await grantResource(u.id, "egg", REFERRAL_BONUS_EGGS, "referral");
        await grantResource(u.id, "coin", REFERRAL_BONUS_COINS, "referral");
        // Referrer signup milestone — fires once (isNew), no flag needed (V17/T33).
        await grantResource(
          validReferrerId,
          "coin",
          REFERRER_SIGNUP_COINS,
          "referral",
        );
      }
    }
  } catch (e) {
    console.error("upsertUser failed:", e);
  }
}

// V17/T34: when a REFERRED user reaches the hatch milestone (3 eggs), reward the
// REFERRER with an egg — once per referee, guarded by `referrals.rewardedHatch3`
// (compare-and-set so it never double-pays). Call after a successful hatch.
export async function maybeRewardReferrerOnHatch(userId: number): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { users, roostrs, referrals } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");
    // Who referred this user?
    const [u] = await db
      .select({ ref: users.referredById })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    const referrerId = u?.ref ?? null;
    if (!referrerId) return;
    // Not yet rewarded for this referee?
    const [r] = await db
      .select({ done: referrals.rewardedHatch3 })
      .from(referrals)
      .where(eq(referrals.refereeId, userId))
      .limit(1);
    if (!r || r.done) return;
    // Has the referee hatched the threshold count?
    const [eggs] = await db
      .select({ n: sql<number>`count(*)` })
      .from(roostrs)
      .where(and(eq(roostrs.ownerId, userId), eq(roostrs.origin, "hatch")));
    if (Number(eggs?.n ?? 0) < REFERRER_HATCH3_THRESHOLD) return;
    // Flip the flag FIRST (CAS on rewardedHatch3=false) — only the winner pays.
    const flipped = await db
      .update(referrals)
      .set({ rewardedHatch3: true })
      .where(
        and(
          eq(referrals.refereeId, userId),
          eq(referrals.rewardedHatch3, false),
        ),
      )
      .returning({ id: referrals.refereeId });
    if (flipped.length === 0) return;
    await grantResource(referrerId, "egg", REFERRER_HATCH3_EGGS, "referral");
  } catch (e) {
    console.error("maybeRewardReferrerOnHatch failed:", e);
  }
}

// --- Battles ---
// The `battles` table is the append-only "when / with whom" log; per-roostr and
// per-user W/L/draw counters are denormalized (kept in sync here on each resolve)
// so reads never COUNT over the log.

export interface BattleInput {
  attackerUserId: number | null;
  defenderUserId: number | null;
  attackerRoostrId: string;
  defenderRoostrId: string;
  winnerRoostrId: string | null; // null = draw
  coinsReward?: number;
  log?: unknown; // round-by-round detail (shape TBD)
}

// Persist a resolved battle AND update both sides' W/L/draw counters. Writes the
// log row first (the source of truth), then bumps counters best-effort (no tx on
// the neon http driver — matches the rest of this module). Returns the battle id.
export async function recordBattle(b: BattleInput): Promise<string | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { battles, roostrs, users } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");

    const [row] = await db
      .insert(battles)
      .values({
        attackerUserId: b.attackerUserId,
        defenderUserId: b.defenderUserId,
        attackerRoostrId: b.attackerRoostrId,
        defenderRoostrId: b.defenderRoostrId,
        winnerRoostrId: b.winnerRoostrId,
        coinsReward: b.coinsReward ?? 0,
        log: b.log,
      })
      .returning({ id: battles.id });
    const id = row?.id ?? null;

    const draw = b.winnerRoostrId === null;
    const winnerIsAttacker = b.winnerRoostrId === b.attackerRoostrId;
    const loserRoostrId = winnerIsAttacker ? b.defenderRoostrId : b.attackerRoostrId;
    const winnerUserId = winnerIsAttacker ? b.attackerUserId : b.defenderUserId;
    const loserUserId = winnerIsAttacker ? b.defenderUserId : b.attackerUserId;

    // Bump roostr counters.
    const bumpRoostr = (rid: string, field: "wins" | "losses" | "draws") =>
      db
        .update(roostrs)
        .set({ [field]: sql`${roostrs[field]} + 1` })
        .where(eq(roostrs.id, rid));
    // Bump user counters (skip null = system/PvE side).
    const bumpUser = (uid: number | null, field: "wins" | "losses" | "draws") =>
      uid === null
        ? Promise.resolve()
        : db
            .update(users)
            .set({ [field]: sql`${users[field]} + 1`, updatedAt: new Date() })
            .where(eq(users.id, uid));

    if (draw) {
      await Promise.all([
        bumpRoostr(b.attackerRoostrId, "draws"),
        bumpRoostr(b.defenderRoostrId, "draws"),
        bumpUser(b.attackerUserId, "draws"),
        bumpUser(b.defenderUserId, "draws"),
      ]);
    } else {
      await Promise.all([
        bumpRoostr(b.winnerRoostrId as string, "wins"),
        bumpRoostr(loserRoostrId, "losses"),
        bumpUser(winnerUserId, "wins"),
        bumpUser(loserUserId, "losses"),
      ]);
    }
    return id;
  } catch (e) {
    console.error("recordBattle failed:", e);
    return null;
  }
}

// Battle log for one roostr (its fights, newest first) — the "when / with whom".
// `limit` caps the page (default 50).
export async function getRoostrBattles(roostrId: string, limit = 50) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { battles } = await import("@/db/schema");
    const { desc, eq, or } = await import("drizzle-orm");
    return await db
      .select()
      .from(battles)
      .where(
        or(
          eq(battles.attackerRoostrId, roostrId),
          eq(battles.defenderRoostrId, roostrId),
        ),
      )
      .orderBy(desc(battles.createdAt))
      .limit(limit);
  } catch (e) {
    console.error("getRoostrBattles failed:", e);
    return [];
  }
}

// --- Work stations (lab / farm) — shared accrual engine; see src/lib/stations.ts ---

// Roostr rows by id (loads a station's current workers, including non-active
// "working" birds that getRoostrs filters out). Assumes a DB (callers env-guard).
async function roostrsByIds(roostrIds: string[]) {
  if (roostrIds.length === 0)
    return [] as Awaited<ReturnType<typeof loadByIds>>;
  return loadByIds(roostrIds);
}
async function loadByIds(roostrIds: string[]) {
  const { db } = await import("@/db");
  const { roostrs } = await import("@/db/schema");
  const { inArray } = await import("drizzle-orm");
  return db.select().from(roostrs).where(inArray(roostrs.id, roostrIds));
}

// Σ of the station's driving stat (Intellect / Fertility) over its worker rows.
function totalStat(
  rows: Awaited<ReturnType<typeof loadByIds>>,
  kind: StationKind,
): number {
  const stat = STATIONS[kind].stat;
  return rows.reduce((s, row) => s + (hydrateRoostr(row).stats[stat] ?? 0), 0);
}

// Settle a station's pending buffer up to NOW and persist it. Called on every
// worker-set change + on claim + by the cron — so each interval has a constant
// worker set and the time-integral is exact (anti-cheat). Optimistic guard on
// lastSettleAt prevents a double-settle race.
export async function settleStation(
  userId: number,
  kind: StationKind,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    if (!row) return;
    const workers = await roostrsByIds(row.roostrIds);
    const nowMs = Date.now();
    const pending = settlePending(
      STATIONS[kind],
      row.pending,
      totalStat(workers, kind),
      workers.length,
      row.lastSettleAt.getTime(),
      nowMs,
    );
    await db
      .update(workStations)
      .set({ pending, lastSettleAt: new Date(nowMs) })
      .where(
        and(
          eq(workStations.userId, userId),
          eq(workStations.kind, kind),
          // Optimistic lock (compare-and-swap on the prior settle time). Postgres
          // stores `timestamptz` at microsecond precision but Drizzle round-trips
          // `row.lastSettleAt` as a millisecond JS Date — a plain `eq` NEVER matches
          // a row first stamped by defaultNow()/now(), so the settle silently
          // no-ops and `pending` never persists (claim always sees 0). Compare at
          // millisecond precision so the CAS actually matches while still guarding
          // against a concurrent settle that already advanced lastSettleAt.
          sql`date_trunc('milliseconds', ${workStations.lastSettleAt}) = ${row.lastSettleAt}`,
        ),
      );
  } catch (e) {
    console.error("settleStation failed:", e);
  }
}

// Read-only station snapshot for the page. `pending`/`lastSettleAtMs` let the
// client tick the buffer live (it recomputes settlePending against Date.now()).
export async function getStationView(userId: number, kind: StationKind) {
  const empty = {
    slotsOwned: BASE_SLOTS,
    pending: 0,
    lastSettleAtMs: Date.now(),
    workers: [] as Awaited<ReturnType<typeof loadByIds>>,
  };
  if (!process.env.DATABASE_URL) return empty;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [row] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    if (!row) return empty;
    return {
      slotsOwned: row.slotsOwned,
      pending: row.pending,
      lastSettleAtMs: row.lastSettleAt.getTime(),
      workers: await roostrsByIds(row.roostrIds),
    };
  } catch (e) {
    console.error("getStationView failed:", e);
    return empty;
  }
}

export type StationOpResult =
  | { ok: true; claimed?: number }
  | { ok: false; error: "db" | "notfound" | "owner" | "locked" | "full" };

// Assign a rooster to a station: owner-guarded, must be active, respects the slot
// cap. Settles FIRST (credits the prior interval at the old worker set), then adds
// the worker and locks it (status="working", so it leaves the roster + can't be
// upgraded → its stat stays constant while in service).
export async function assignWorker(
  userId: number,
  kind: StationKind,
  roostrId: string,
): Promise<StationOpResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  try {
    const { db } = await import("@/db");
    const { workStations, roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    const rr = await getRoostr(roostrId);
    if (!rr) return { ok: false, error: "notfound" };
    if (rr.ownerId !== userId) return { ok: false, error: "owner" };
    if (rr.status !== "active") return { ok: false, error: "locked" };

    await settleStation(userId, kind);

    const [st] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    const ids = st?.roostrIds ?? [];
    const slots = st?.slotsOwned ?? BASE_SLOTS;
    if (ids.includes(roostrId)) return { ok: true };
    if (ids.length >= slots) return { ok: false, error: "full" };

    if (st) {
      await db
        .update(workStations)
        .set({ roostrIds: [...ids, roostrId] })
        .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)));
    } else {
      await db
        .insert(workStations)
        .values({ userId, kind, roostrIds: [roostrId] });
    }
    // lock the bird (only if still active — guards a double-assign race) and stamp
    // the work assignment (kind + since) into meta for the collection badge.
    await db
      .update(roostrs)
      .set({
        status: "working",
        meta: { ...rr.meta, work: { kind, since: Date.now() } },
      })
      .where(
        and(
          eq(roostrs.id, roostrId),
          eq(roostrs.ownerId, userId),
          eq(roostrs.status, "active"),
        ),
      );
    return { ok: true };
  } catch (e) {
    console.error("assignWorker failed:", e);
    return { ok: false, error: "db" };
  }
}

// Remove a rooster from a station: settles FIRST (credits its served time), then
// unlocks it back to the roster (status="active").
export async function removeWorker(
  userId: number,
  kind: StationKind,
  roostrId: string,
): Promise<StationOpResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  try {
    const { db } = await import("@/db");
    const { workStations, roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");

    await settleStation(userId, kind);

    const [st] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    if (!st || !st.roostrIds.includes(roostrId)) return { ok: true };

    await db
      .update(workStations)
      .set({ roostrIds: st.roostrIds.filter((x) => x !== roostrId) })
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)));
    // unlock + clear the work stamp from meta
    const cur = await getRoostr(roostrId);
    const meta: Record<string, unknown> = { ...cur?.meta };
    delete meta.work;
    await db
      .update(roostrs)
      .set({ status: "active", meta })
      .where(
        and(
          eq(roostrs.id, roostrId),
          eq(roostrs.ownerId, userId),
          eq(roostrs.status, "working"),
        ),
      );
    return { ok: true };
  } catch (e) {
    console.error("removeWorker failed:", e);
    return { ok: false, error: "db" };
  }
}

export type BuySlotResult =
  | { ok: true; slotsOwned: number }
  | { ok: false; error: "db" | "maxed" | "funds" };

// One-time +1 worker-slot unlock (BASE_SLOTS → MAX_SLOTS), paid in the station's
// `slotCost` resource (farm = coins, lab = science). Spend is CAS (atomic, returns
// null if short); the slot bump is guarded against a concurrent double-buy and
// refunds if it loses the race.
export async function buyStationSlot(
  userId: number,
  kind: StationKind,
): Promise<BuySlotResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  const { resource, amount } = STATIONS[kind].slotCost;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [st] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    const current = st?.slotsOwned ?? BASE_SLOTS;
    if (current >= MAX_SLOTS) return { ok: false, error: "maxed" };

    // Charge first (atomic CAS on balance).
    const bal = await spendResource(userId, resource, amount, "slot", kind);
    if (bal === null) return { ok: false, error: "funds" };

    // Apply the +1, guarded so a concurrent buy can't push past the cap.
    const applied = st
      ? await db
          .update(workStations)
          .set({ slotsOwned: current + 1 })
          .where(
            and(
              eq(workStations.userId, userId),
              eq(workStations.kind, kind),
              eq(workStations.slotsOwned, current),
            ),
          )
          .returning({ s: workStations.slotsOwned })
      : await db
          .insert(workStations)
          .values({ userId, kind, slotsOwned: current + 1 })
          .onConflictDoNothing()
          .returning({ s: workStations.slotsOwned });
    if (applied.length === 0) {
      // Lost the race (slot changed / row appeared) — refund the charge.
      await grantResource(userId, resource, amount, "refund", kind);
      return { ok: false, error: "maxed" };
    }
    return { ok: true, slotsOwned: current + 1 };
  } catch (e) {
    console.error("buyStationSlot failed:", e);
    return { ok: false, error: "db" };
  }
}

// Claim a station's pending buffer: settle, move floor(pending) to the wallet via
// the audited ledger, keep the fraction. Guarded so concurrent claims can't double.
export async function claimStation(
  userId: number,
  kind: StationKind,
): Promise<StationOpResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq, gte, sql } = await import("drizzle-orm");

    await settleStation(userId, kind);

    const [st] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    if (!st) return { ok: true, claimed: 0 };
    const whole = Math.floor(st.pending);
    if (whole <= 0) return { ok: true, claimed: 0 };

    const dec = await db
      .update(workStations)
      .set({ pending: sql`${workStations.pending} - ${whole}` })
      .where(
        and(
          eq(workStations.userId, userId),
          eq(workStations.kind, kind),
          gte(workStations.pending, whole),
        ),
      )
      .returning({ p: workStations.pending });
    if (dec.length === 0) return { ok: true, claimed: 0 };

    await grantResource(userId, STATIONS[kind].resource, whole, kind);
    return { ok: true, claimed: whole };
  } catch (e) {
    console.error("claimStation failed:", e);
    return { ok: false, error: "db" };
  }
}

// Cron: settle every station (drips pending by elapsed time + applies the buffer
// cap) so balances stay current even if the player never opens the page.
export async function settleAllStations(): Promise<{ settled: number }> {
  if (!process.env.DATABASE_URL) return { settled: 0 };
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const rows = await db
      .select({ userId: workStations.userId, kind: workStations.kind })
      .from(workStations);
    for (const r of rows) await settleStation(r.userId, r.kind as StationKind);
    return { settled: rows.length };
  } catch (e) {
    console.error("settleAllStations failed:", e);
    return { settled: 0 };
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
