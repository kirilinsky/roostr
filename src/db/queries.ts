import type { SessionUser } from "@/lib/auth";
import { parseReferralId } from "@/lib/referrals";
import { hydrateRoostr, SKILLS, type RolledRoostr, type RoostrRow } from "@/lib/roostr";
import { rollColorway } from "@/lib/avatarV2";
import {
  STATIONS,
  settlePending,
  maxSlots,
  nextSlotPrice,
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
        role: r.role,
        maxHealth: r.maxHealth,
        seed: r.seed,
        origin,
        // Bake the bird's colorway at hatch (features come from the breed, so only
        // the per-bird colors are stored — frozen + customization-ready). The
        // selected breed trait is also frozen so future catalog edits don't mutate
        // already-hatched birds.
        meta: { cosmetic: rollColorway(r.breed.id, r.seed), traitId: r.breed.trait.id },
        // status defaults to "active"
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

// One-off backfill: bake `meta.cosmetic` (the V2 avatar look) onto every existing
// roostr that doesn't have it yet. Idempotent — skips already-baked rows, and the
// derivation is deterministic, so re-running is safe. Admin-triggered from /debug.
export async function backfillCosmetics(): Promise<{ updated: number; total: number }> {
  if (!process.env.DATABASE_URL) return { updated: 0, total: 0 };
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({
        id: roostrs.id,
        breedId: roostrs.breedId,
        seed: roostrs.seed,
        meta: roostrs.meta,
      })
      .from(roostrs);
    let updated = 0;
    for (const r of rows) {
      const meta = { ...((r.meta as Record<string, unknown>) ?? {}) };
      if (meta.cosmetic) continue; // already baked
      meta.cosmetic = rollColorway(r.breedId, r.seed);
      await db.update(roostrs).set({ meta }).where(eq(roostrs.id, r.id));
      updated++;
    }
    return { updated, total: rows.length };
  } catch (e) {
    console.error("backfillCosmetics failed:", e);
    return { updated: 0, total: 0 };
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
  price?: number, // sale price in coins (market only); omit for gift/hatch/…
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { roostrTransfers } = await import("@/db/schema");
    await db
      .insert(roostrTransfers)
      .values({ roostrId, fromUserId, toUserId, kind, price: price ?? null });
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
  // Economy primitive: only ever move a positive whole amount. A negative/NaN
  // amount would otherwise INVERT the spend (`balance - (-n)` = a grant) and slip
  // past the `balance >= amount` guard. Callers pass server constants today; this
  // is the backstop if one ever forwards a client number.
  if (!Number.isInteger(amount) || amount <= 0) return null;
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
  // Symmetric guard to spendResource: a negative amount here would silently DEBIT.
  if (!Number.isInteger(amount) || amount <= 0) return null;
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

// --- Egg shop (coin → egg, escalating price) ---

// Eggs this user has ever bought from the shop → drives the price ramp. Read from
// the authoritative `users.eggs_bought` counter (the same value buyShopEgg bumps
// atomically), so the price shown here always matches what the next buy charges.
export async function countEggsBought(userId: number): Promise<number> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return 0;
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const [r] = await db
      .select({ n: users.eggsBought })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    return r?.n ?? 0;
  } catch (e) {
    console.error("countEggsBought failed:", e);
    return 0;
  }
}

// Buy ONE egg at the player's current (server-computed) price. Spends coins
// atomically; on the rare grant failure, refunds. Price is re-derived server-side
// from the ledger, so a stale client price can't be exploited.
export async function buyShopEgg(
  userId: number,
): Promise<{ ok: boolean; reason?: string; price?: number; coins?: number }> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  try {
    const { eggShopPrice } = await import("@/lib/shop");
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");
    // Claim the next purchase index atomically. A single conditional UPDATE
    // serializes concurrent buys: each caller gets a DISTINCT post-increment
    // value, so each prices off a distinct tier — a burst of parallel buys can no
    // longer all read `bought=0` and pay the base price (price-ramp race fix).
    const [seq] = await db
      .update(users)
      .set({ eggsBought: sql`${users.eggsBought} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning({ n: users.eggsBought });
    if (!seq) return { ok: false, reason: "error" };
    const bought = seq.n - 1; // pre-increment index this purchase is priced at
    const price = eggShopPrice(bought);

    const coins = await spendCoins(userId, price, "egg_shop");
    if (coins === null) {
      // Can't pay → release the claimed index so the ramp doesn't advance.
      await releaseEggIndex(userId);
      return { ok: false, reason: "coins", price };
    }
    const eggs = await grantResource(userId, "egg", 1, "egg_shop");
    if (eggs === null) {
      await grantCoins(userId, price, "refund", "egg_shop");
      await releaseEggIndex(userId);
      return { ok: false, reason: "error", price };
    }
    return { ok: true, price, coins };
  } catch (e) {
    console.error("buyShopEgg failed:", e);
    return { ok: false, reason: "error" };
  }
}

// Roll back a claimed egg-shop index when the purchase can't complete. Kept as an
// atomic `- 1` so it composes correctly with concurrent buys (net count always
// equals the number of eggs actually granted).
async function releaseEggIndex(userId: number): Promise<void> {
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");
    await db
      .update(users)
      .set({ eggsBought: sql`${users.eggsBought} - 1` })
      .where(eq(users.id, userId));
  } catch (e) {
    console.error("releaseEggIndex failed:", e);
  }
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
    const {
      resourceTxns,
      friendships,
      users,
      breedDiscoveries,
      workStations,
      referrals,
      gifts,
      synthGeneEvents,
      roostrHospitalVisits,
      roostrTransfers,
    } = await import("@/db/schema");
    const { and, eq, gt, lt, inArray, or, sql } = await import("drizzle-orm");
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

    // Science spent (Σ |negative sci rows|) + eggs earned (Σ positive egg rows).
    const [sciSp] = await db
      .select({ s: sql<number>`coalesce(sum(-${resourceTxns.amount}), 0)` })
      .from(resourceTxns)
      .where(
        and(eq(resourceTxns.userId, userId), eq(resourceTxns.resource, "sci"), lt(resourceTxns.amount, 0)),
      );
    metrics.sciSpent = Number(sciSp?.s ?? 0);

    const [eggEarn] = await db
      .select({ s: sql<number>`coalesce(sum(${resourceTxns.amount}), 0)` })
      .from(resourceTxns)
      .where(
        and(eq(resourceTxns.userId, userId), eq(resourceTxns.resource, "egg"), gt(resourceTxns.amount, 0)),
      );
    metrics.eggsEarned = Number(eggEarn?.s ?? 0);

    // Health potions bought (ledger kind "potion"). 0 until the potion ships.
    const [pot] = await db
      .select({ n: sql<number>`count(*)` })
      .from(resourceTxns)
      .where(and(eq(resourceTxns.userId, userId), eq(resourceTxns.kind, "potion")));
    metrics.potionsBought = Number(pot?.n ?? 0);

    // Synthetic genes: how many spliced (Biohacker), distinct kinds (Mad
    // Geneticist), and total science SUNK into synth genes + their upgrades, net
    // of refunds (rare "Gene Tycoon"). Splices are counted from the event log
    // (only-on-success); the sci sink reads the ledger.
    const [synthCounts] = await db
      .select({
        bought: sql<number>`count(*)`,
        kinds: sql<number>`count(distinct ${synthGeneEvents.geneId})`,
      })
      .from(synthGeneEvents)
      .where(eq(synthGeneEvents.userId, userId));
    metrics.synthGenesBought = Number(synthCounts?.bought ?? 0);
    metrics.synthGeneKinds = Number(synthCounts?.kinds ?? 0);

    const [synthSpend] = await db
      .select({
        s: sql<number>`coalesce(sum(case when ${resourceTxns.kind} in ('synth_gene', 'synth_gene_upgrade') or (${resourceTxns.kind} = 'refund' and ${resourceTxns.ref} in ('synth_gene', 'synth_gene_upgrade')) then -${resourceTxns.amount} else 0 end), 0)`,
      })
      .from(resourceTxns)
      .where(and(eq(resourceTxns.userId, userId), eq(resourceTxns.resource, "sci")));
    metrics.synthSciSpent = Math.max(0, Number(synthSpend?.s ?? 0));

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
    let tierB = 0;
    let renamed = 0;
    let hurt = 0;
    const tiers = new Set<number>();
    for (const row of owned) {
      const h = hydrateRoostr(row);
      const rank = TIERS.findIndex((t) => t.id === h.tier.id);
      if (rank > highest) highest = rank;
      if (rank >= 0) tiers.add(rank);
      if (h.tier.id === "B") tierB++;
      if (row.nickname && row.nickname.trim()) renamed++;
      // Hurt = below max HP (drives the "Epidemic" achievement).
      if (row.currentHp != null && row.currentHp < h.maxHealth) hurt++;
    }
    metrics.highestTier = highest;
    metrics.tiersOwned = tiers.size;
    metrics.tierBCount = tierB;
    // "Name Giver" — at least one owned rooster carries a custom nickname.
    metrics.renames = renamed;
    // Owned birds currently below max HP, at once → "Epidemic".
    metrics.hurtRoostrs = hurt;

    // --- Quest-supporting metrics (also usable by achievements) ---
    // Stations: workers currently assigned (sum across farm+lab) + slots owned per
    // station (base 2; >2 means a slot expansion was bought).
    const ws = await db
      .select({
        kind: workStations.kind,
        ids: workStations.roostrIds,
        slots: workStations.slotsOwned,
      })
      .from(workStations)
      .where(eq(workStations.userId, userId));
    metrics.stationWorkers = ws.reduce((n, r) => n + (r.ids?.length ?? 0), 0);
    metrics.farmSlots =
      ws.find((r) => r.kind === "farm")?.slots ?? STATIONS.farm.baseSlots;
    metrics.labSlots =
      ws.find((r) => r.kind === "lab")?.slots ?? STATIONS.lab.baseSlots;
    metrics.defenseGuards =
      ws.find((r) => r.kind === "defense")?.ids?.length ?? 0;
    // One read for both station-derived metrics: base defense (Σ Crow) + farm income.
    const hud = await getHudStationStats(userId);
    metrics.defenseValue = hud.defenseValue; // Σ Crow on watch
    metrics.farmEggsPerDay = hud.eggPerDay; // farm egg income / day

    // Times the player has claimed from a station (ledger rows kind farm|lab).
    const [sc] = await db
      .select({ n: sql<number>`count(*)` })
      .from(resourceTxns)
      .where(
        and(
          eq(resourceTxns.userId, userId),
          inArray(resourceTxns.kind, ["farm", "lab"]),
          gt(resourceTxns.amount, 0),
        ),
      );
    metrics.stationClaims = Number(sc?.n ?? 0);

    // Players this user has referred (signed up via their invite link).
    const [rf] = await db
      .select({ n: sql<number>`count(*)` })
      .from(referrals)
      .where(eq(referrals.referrerId, userId));
    metrics.referralsCount = Number(rf?.n ?? 0);

    // Gifts SENT (any outcome) → drives the "send a gift" onboarding quest. Counts
    // the act of gifting, not whether the recipient accepted.
    const [gSent] = await db
      .select({ n: sql<number>`count(*)` })
      .from(gifts)
      .where(eq(gifts.fromUserId, userId));
    metrics.giftsSent = Number(gSent?.n ?? 0);

    // Gifts: birds this user successfully gave away / received (accepted only).
    const [gOut] = await db
      .select({ n: sql<number>`count(*)` })
      .from(gifts)
      .where(and(eq(gifts.fromUserId, userId), eq(gifts.status, "accepted")));
    metrics.roostrsGifted = Number(gOut?.n ?? 0);
    const [gIn] = await db
      .select({ n: sql<number>`count(*)` })
      .from(gifts)
      .where(and(eq(gifts.toUserId, userId), eq(gifts.status, "accepted")));
    metrics.giftsReceived = Number(gIn?.n ?? 0);

    // Market sales: birds this user SOLD (market transfers where they were the
    // seller) + total coins earned from those sales. Drives First Sale / Seasoned
    // Trader (roostrsSold) and Market Mogul (saleEarnings). Reads the append-only
    // provenance ledger, so it survives the bird changing hands again.
    const [sales] = await db
      .select({
        n: sql<number>`count(*)`,
        earned: sql<number>`coalesce(sum(${roostrTransfers.price}), 0)`,
      })
      .from(roostrTransfers)
      .where(
        and(
          eq(roostrTransfers.fromUserId, userId),
          eq(roostrTransfers.kind, "market"),
        ),
      );
    metrics.roostrsSold = Number(sales?.n ?? 0);
    metrics.saleEarnings = Number(sales?.earned ?? 0);
    // Birds bought on the market (market transfers where they were the buyer).
    const [buys] = await db
      .select({ n: sql<number>`count(*)` })
      .from(roostrTransfers)
      .where(
        and(
          eq(roostrTransfers.toUserId, userId),
          eq(roostrTransfers.kind, "market"),
        ),
      );
    metrics.roostrsBought = Number(buys?.n ?? 0);

    // Roosters released to the wild — one "release" ledger row (the free feather)
    // per release. Drives the "Free Bird / Letting Go / Liberator" achievements.
    const [rel] = await db
      .select({ n: sql<number>`count(*)` })
      .from(resourceTxns)
      .where(and(eq(resourceTxns.userId, userId), eq(resourceTxns.kind, "release")));
    metrics.released = Number(rel?.n ?? 0);

    // Hospital: birds sent to heal (first-heal) + fully-healed discharges (Head Nurse).
    const [hosp] = await db
      .select({
        admits: sql<number>`count(*)`,
        healed: sql<number>`count(*) filter (where ${roostrHospitalVisits.healedFull})`,
      })
      .from(roostrHospitalVisits)
      .where(eq(roostrHospitalVisits.userId, userId));
    metrics.hospitalAdmits = Number(hosp?.admits ?? 0);
    metrics.hospitalHealed = Number(hosp?.healed ?? 0);

    // Raids — count + looted coins from the append-only `raids` table (failed
    // raids count as raids too; the coin ledger would miss them). hpSpent = the
    // flat HP toll summed over resolved raids (win/loss × party size).
    const { raids } = await import("@/db/schema");
    const { RAID_HP_COST_WIN, RAID_HP_COST_LOSS } = await import("@/lib/raids");
    const [raid] = await db
      .select({
        n: sql<number>`count(*)`,
        loot: sql<number>`coalesce(sum(${raids.lootCoins}), 0)`,
        hpWin: sql<number>`coalesce(sum(case when ${raids.success} then jsonb_array_length(${raids.partyRoostrIds}) else 0 end), 0)`,
        hpLoss: sql<number>`coalesce(sum(case when not ${raids.success} then jsonb_array_length(${raids.partyRoostrIds}) else 0 end), 0)`,
      })
      .from(raids)
      .where(and(eq(raids.attackerUserId, userId), eq(raids.status, "resolved")));
    metrics.raidsDone = Number(raid?.n ?? 0);
    metrics.raidLoot = Number(raid?.loot ?? 0);
    metrics.hpSpent =
      Number(raid?.hpWin ?? 0) * RAID_HP_COST_WIN +
      Number(raid?.hpLoss ?? 0) * RAID_HP_COST_LOSS;
  } catch (e) {
    console.error("getProfileMetrics failed:", e);
  }
  return metrics;
}

// --- Onboarding quests (linear chain, manual claim) ---

// Set of quest ids this user has already claimed.
export async function getQuestClaims(userId: number): Promise<Set<string>> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return new Set();
  try {
    const { db } = await import("@/db");
    const { questClaims } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ questId: questClaims.questId })
      .from(questClaims)
      .where(eq(questClaims.userId, userId));
    return new Set(rows.map((r) => r.questId));
  } catch (e) {
    console.error("getQuestClaims failed:", e);
    return new Set();
  }
}

// Full quest-chain state for a user (metrics + claims → evaluated states).
export async function getQuestStates(userId: number) {
  const { evaluateQuests } = await import("@/lib/quests");
  const [metrics, claimed] = await Promise.all([
    getProfileMetrics(userId),
    getQuestClaims(userId),
  ]);
  return evaluateQuests(metrics, claimed);
}

// How many quests are claimable right now (unlocked + met + unclaimed) → nudges.
export async function countReadyQuests(userId: number): Promise<number> {
  try {
    const { readyQuests } = await import("@/lib/quests");
    return readyQuests(await getQuestStates(userId)).length;
  } catch (e) {
    console.error("countReadyQuests failed:", e);
    return 0;
  }
}

// Claim a quest's reward — server-validated: the quest must be READY (unlocked by
// the chain + condition met + not already claimed). Claim-once via CAS on the PK,
// then grant the reward through the audited ledger.
export async function claimQuest(
  userId: number,
  questId: string,
): Promise<{ ok: boolean; resource?: string; amount?: number }> {
  if (!process.env.DATABASE_URL) return { ok: false };
  try {
    const { QUEST_BY_ID } = await import("@/lib/quests");
    const def = QUEST_BY_ID[questId];
    if (!def) return { ok: false };
    // Re-derive state on the server; only a READY quest may be claimed.
    const states = await getQuestStates(userId);
    const state = states.find((s) => s.def.id === questId);
    if (!state || state.status !== "ready") return { ok: false };

    const { db } = await import("@/db");
    const { questClaims } = await import("@/db/schema");
    const claimed = await db
      .insert(questClaims)
      .values({ userId, questId })
      .onConflictDoNothing()
      .returning({ questId: questClaims.questId });
    if (claimed.length === 0) return { ok: false }; // already claimed (race)

    await grantResource(
      userId,
      def.reward.resource,
      def.reward.amount,
      "quest",
      questId,
    );
    return { ok: true, resource: def.reward.resource, amount: def.reward.amount };
  } catch (e) {
    console.error("claimQuest failed:", e);
    return { ok: false };
  }
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

// Evaluate a user's PROFILE achievements against live metrics, persist any newly
// satisfied, and return the ids just unlocked (for toasting). Call right after an
// earn/ownership event so an unlock lands at that moment, not only on next profile
// open. Idempotent via recordAchievementUnlocks → repeated calls return [].
export async function syncProfileAchievements(userId: number): Promise<string[]> {
  const { PROFILE_ACHIEVEMENTS, evaluate } = await import("@/lib/achievements");
  const metrics = await getProfileMetrics(userId);
  const satisfied = evaluate(PROFILE_ACHIEVEMENTS, metrics)
    .filter((s) => s.unlocked)
    .map((s) => s.def.id);
  if (!satisfied.length) return [];
  return recordAchievementUnlocks(userId, satisfied);
}

export interface AchievementNotification {
  achievementId: string;
  scope: string; // "profile" | "rooster"
  roostrId: string | null; // bird to link to (rooster scope)
  unlockedAt: string;
  unread?: boolean;
}

// Recent achievement unlocks → "you earned X" notifications, newest first. Read +
// unread are BOTH returned (read ones aren't hidden); `unread` flags those newer
// than the read cursor. Definitions (icon/name) are resolved client-side by id.
export async function getNewAchievements(
  userId: number,
): Promise<AchievementNotification[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { achievementUnlocks } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    const reads = await getNotificationReads(userId);
    // Recent unlocks (read + unread); unread = no per-item read row yet.
    const rows = await db
      .select({
        achievementId: achievementUnlocks.achievementId,
        scope: achievementUnlocks.scope,
        roostrId: achievementUnlocks.roostrId,
        unlockedAt: achievementUnlocks.unlockedAt,
      })
      .from(achievementUnlocks)
      .where(eq(achievementUnlocks.userId, userId))
      .orderBy(desc(achievementUnlocks.unlockedAt))
      .limit(50);
    return rows.map((r) => ({
      achievementId: r.achievementId,
      scope: r.scope,
      roostrId: r.roostrId,
      unlockedAt: r.unlockedAt.toISOString(),
      unread: !reads.has(`ach:${r.achievementId}`),
    }));
  } catch (e) {
    console.error("getNewAchievements failed:", e);
    return [];
  }
}

// --- Synth-gene splice notifications ---

export interface SynthGeneNotification {
  id: string;
  roostrId: string;
  geneId: string;
  breedId: string;
  nickname: string | null;
  at: string;
  unread?: boolean;
}

// Record a successful synth-gene splice (called by the buy action AFTER apply
// succeeds). Best-effort: a failure here just means no notification, the gene is
// already on the bird. Never write this for a failed/refunded purchase.
export async function recordSynthGeneEvent(
  userId: number,
  roostrId: string,
  geneId: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { synthGeneEvents } = await import("@/db/schema");
    await db.insert(synthGeneEvents).values({ userId, roostrId, geneId });
  } catch (e) {
    console.error("recordSynthGeneEvent failed:", e);
  }
}

// Recent synth-gene splices for a user → "gene applied to bird" notifications,
// newest first. Joins the bird for its breed/nickname (display name). `unread` =
// no per-item read row yet (key `synth:<id>`).
export async function getSynthGeneNotifications(
  userId: number,
): Promise<SynthGeneNotification[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { synthGeneEvents, roostrs } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    const reads = await getNotificationReads(userId);
    const rows = await db
      .select({
        id: synthGeneEvents.id,
        roostrId: synthGeneEvents.roostrId,
        geneId: synthGeneEvents.geneId,
        at: synthGeneEvents.at,
        breedId: roostrs.breedId,
        nickname: roostrs.nickname,
      })
      .from(synthGeneEvents)
      .innerJoin(roostrs, eq(synthGeneEvents.roostrId, roostrs.id))
      .where(eq(synthGeneEvents.userId, userId))
      .orderBy(desc(synthGeneEvents.at))
      .limit(50);
    return rows.map((r) => ({
      id: r.id,
      roostrId: r.roostrId,
      geneId: r.geneId,
      breedId: r.breedId,
      nickname: r.nickname,
      at: r.at.toISOString(),
      unread: !reads.has(`synth:${r.id}`),
    }));
  } catch (e) {
    console.error("getSynthGeneNotifications failed:", e);
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

// One entry of a rooster's chain of custody, ready for display. `user` is the
// holder AFTER the event; null = the bird went to the wild (release). Kinds come
// from roostr_transfers ("hatch" | "gift" | "market" | …) plus the synthetic
// "release" rows merged in from roostr_releases.
export interface ProvenanceEvent {
  at: string; // ISO timestamp of the change
  kind: string;
  price: number | null; // coins, market sales only
  user: { id: number; name: string; photoUrl: string | null } | null;
}

// Display-ready ownership timeline: transfers + releases merged, oldest first,
// with holder names/photos resolved. Powers the detail-page history modal.
export async function getRoostrProvenance(
  roostrId: string,
): Promise<ProvenanceEvent[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { roostrTransfers, roostrReleases, users } = await import("@/db/schema");
    const { asc, eq, inArray } = await import("drizzle-orm");
    const [transfers, releases] = await Promise.all([
      db
        .select()
        .from(roostrTransfers)
        .where(eq(roostrTransfers.roostrId, roostrId))
        .orderBy(asc(roostrTransfers.at)),
      db.select().from(roostrReleases).where(eq(roostrReleases.roostrId, roostrId)),
    ]);
    const ids = [
      ...new Set(
        transfers
          .map((tr) => tr.toUserId)
          .filter((n): n is number => n != null),
      ),
    ];
    const rows = ids.length
      ? await db.select().from(users).where(inArray(users.id, ids))
      : [];
    const byId = new Map(
      rows.map((u) => [
        u.id,
        { id: u.id, name: displayName(u), photoUrl: u.photoUrl },
      ]),
    );
    const events: ProvenanceEvent[] = transfers.map((tr) => ({
      at: new Date(tr.at).toISOString(),
      kind: tr.kind,
      price: tr.price,
      user:
        tr.toUserId != null
          ? byId.get(tr.toUserId) ?? { id: tr.toUserId, name: `#${tr.toUserId}`, photoUrl: null }
          : null,
    }));
    for (const r of releases) {
      events.push({
        at: new Date(r.releasedAt).toISOString(),
        kind: "release",
        price: null,
        user: null,
      });
    }
    events.sort((a, b) => a.at.localeCompare(b.at));
    return events;
  } catch (e) {
    console.error("getRoostrProvenance failed:", e);
    return [];
  }
}

// --- Rooster gifts (directed accept/decline ownership transfer) ---

export interface IncomingGift {
  id: string;
  roostrId: string;
  fromUserId: number;
  fromName: string;
  fromPhoto: string | null;
  breedId: string;
  nickname: string | null;
  createdAt: string;
  unread?: boolean;
}

export interface GiftUpdate {
  id: string;
  roostrId: string;
  toUserId: number;
  toName: string;
  toPhoto: string | null;
  breedId: string;
  nickname: string | null;
  status: string; // accepted | declined
  resolvedAt: string;
  unread?: boolean;
}

const displayName = (u: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  id: number;
}) =>
  [u.firstName, u.lastName].filter(Boolean).join(" ") ||
  (u.username ? `@${u.username}` : String(u.id));

// A pending gift the recipient never answers auto-returns to the sender after
// this many days (the sender CAN'T cancel, so this prevents a bird being locked
// in limbo forever — see expireStaleGifts).
export const GIFT_EXPIRY_DAYS = 7;

// Lazy sweep (no cron): flip any pending gift older than GIFT_EXPIRY_DAYS to
// "expired" and return its bird to the sender (status active; owner never changed
// while pending). Idempotent + cheap when nothing is stale. Called from the gift /
// notifications / collection surfaces so the state is fresh when anyone looks.
export async function expireStaleGifts(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { gifts, roostrs } = await import("@/db/schema");
    const { and, eq, inArray, lt } = await import("drizzle-orm");
    const threshold = new Date(Date.now() - GIFT_EXPIRY_DAYS * 86_400_000);
    const stale = await db
      .select({ id: gifts.id, roostrId: gifts.roostrId })
      .from(gifts)
      .where(and(eq(gifts.status, "pending"), lt(gifts.createdAt, threshold)));
    if (stale.length === 0) return;
    const ids = stale.map((s) => s.id);
    const roostrIds = stale.map((s) => s.roostrId);
    await db
      .update(gifts)
      .set({ status: "expired", resolvedAt: new Date() })
      .where(inArray(gifts.id, ids));
    // Only unlock birds still parked in "gifting" (don't clobber any other status).
    await db
      .update(roostrs)
      .set({ status: "active" })
      .where(and(inArray(roostrs.id, roostrIds), eq(roostrs.status, "gifting")));
  } catch (e) {
    console.error("expireStaleGifts failed:", e);
  }
}

// Gift an ACTIVE bird to a friend. Locks the bird (status="gifting") via CAS so
// it can't be double-gifted/sold, then writes a pending gift row. Friends-only.
export async function createGift(
  roostrId: string,
  fromUserId: number,
  toUserId: number,
): Promise<{ ok: boolean; reason?: string; giftId?: string }> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  if (fromUserId === toUserId) return { ok: false, reason: "self" };
  try {
    const { db } = await import("@/db");
    const { roostrs, gifts } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    // Must be friends (server-side guard; the picker only lists friends).
    const friendship = await getFriendship(fromUserId, toUserId);
    if (!friendship) return { ok: false, reason: "not_friends" };
    // CAS lock: only an ACTIVE bird the sender owns can be gifted.
    const locked = await db
      .update(roostrs)
      .set({ status: "gifting" })
      .where(
        and(
          eq(roostrs.id, roostrId),
          eq(roostrs.ownerId, fromUserId),
          eq(roostrs.status, "active"),
        ),
      )
      .returning({ id: roostrs.id });
    if (locked.length === 0) return { ok: false, reason: "unavailable" };
    // The bird is now locked to "gifting". If writing the gift row fails, we MUST
    // undo the lock or the bird is orphaned in limbo forever (no sender cancel).
    try {
      const [g] = await db
        .insert(gifts)
        .values({ roostrId, fromUserId, toUserId })
        .returning({ id: gifts.id });
      return { ok: true, giftId: g?.id };
    } catch (insErr) {
      await db
        .update(roostrs)
        .set({ status: "active" })
        .where(and(eq(roostrs.id, roostrId), eq(roostrs.status, "gifting")));
      console.error("createGift insert failed, lock reverted:", insErr);
      return { ok: false, reason: "error" };
    }
  } catch (e) {
    console.error("createGift failed:", e);
    return { ok: false, reason: "error" };
  }
}

// The single pending gift for a bird (null if none). Drives the /gift/[id] page
// + the accept/decline guards, so sweep expiries first — an 8-day-old gift must
// read as gone here (can't be accepted; the bird is back with the sender).
export async function getPendingGiftForRoostr(roostrId: string) {
  if (!process.env.DATABASE_URL) return null;
  try {
    await expireStaleGifts();
    const { db } = await import("@/db");
    const { gifts } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(gifts)
      .where(and(eq(gifts.roostrId, roostrId), eq(gifts.status, "pending")))
      .limit(1);
    return rows[0] ?? null;
  } catch (e) {
    console.error("getPendingGiftForRoostr failed:", e);
    return null;
  }
}

// Flat tax the RECIPIENT pays to accept a gift — a tiny coin sink that makes
// bot gift-farming non-free (anti-abuse). Surfaced in the accept UI.
export const GIFT_TAX = 5;

// Accept a pending gift → pay the tax, ownership moves, bird unlocks, transfer +
// meta.gifted. Tax is spent FIRST (atomic); if the gift was already resolved in a
// race, the tax is refunded.
export async function acceptGift(
  giftId: string,
  userId: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  try {
    const { db } = await import("@/db");
    const { gifts, roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    // Anti-bot tax — atomic spend; fails cleanly if the recipient can't afford it.
    const paid = await spendCoins(userId, GIFT_TAX, "gift_tax", giftId);
    if (paid === null) return { ok: false, reason: "coins" };
    // CAS: claim the pending gift addressed to me.
    const claimed = await db
      .update(gifts)
      .set({ status: "accepted", resolvedAt: new Date() })
      .where(
        and(
          eq(gifts.id, giftId),
          eq(gifts.toUserId, userId),
          eq(gifts.status, "pending"),
        ),
      )
      .returning({ roostrId: gifts.roostrId, fromUserId: gifts.fromUserId });
    const row = claimed[0];
    if (!row) {
      // Gift vanished (already accepted/declined) — refund the tax we just took.
      await grantCoins(userId, GIFT_TAX, "refund", giftId);
      return { ok: false, reason: "unavailable" };
    }
    // Move ownership + unlock + flag "this bird was gifted" (rooster achievement).
    const [r] = await db
      .select({ meta: roostrs.meta, breedId: roostrs.breedId })
      .from(roostrs)
      .where(eq(roostrs.id, row.roostrId))
      .limit(1);
    const meta = { ...((r?.meta as Record<string, unknown>) ?? {}), gifted: true };
    await db
      .update(roostrs)
      .set({ ownerId: userId, status: "active", meta })
      .where(eq(roostrs.id, row.roostrId));
    await recordTransfer(row.roostrId, row.fromUserId, userId, "gift");
    // Receiving a bird COUNTS as discovering its breed — same persistent Roostrdex
    // as hatching (no-op if already discovered). Otherwise a breed you only ever
    // got as a gift would never enter your dex.
    if (r?.breedId) await recordDiscovery(userId, r.breedId);
    return { ok: true };
  } catch (e) {
    console.error("acceptGift failed:", e);
    return { ok: false };
  }
}

// Decline a pending gift → bird returns to the sender (owner unchanged),
// meta.giftRejected flags the "rejected" rooster achievement.
export async function declineGift(
  giftId: string,
  userId: number,
): Promise<{ ok: boolean }> {
  if (!process.env.DATABASE_URL) return { ok: false };
  try {
    const { db } = await import("@/db");
    const { gifts, roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const claimed = await db
      .update(gifts)
      .set({ status: "declined", resolvedAt: new Date() })
      .where(
        and(
          eq(gifts.id, giftId),
          eq(gifts.toUserId, userId),
          eq(gifts.status, "pending"),
        ),
      )
      .returning({ roostrId: gifts.roostrId });
    const row = claimed[0];
    if (!row) return { ok: false };
    const [r] = await db
      .select({ meta: roostrs.meta })
      .from(roostrs)
      .where(eq(roostrs.id, row.roostrId))
      .limit(1);
    const meta = {
      ...((r?.meta as Record<string, unknown>) ?? {}),
      giftRejected: true,
    };
    await db
      .update(roostrs)
      .set({ status: "active", meta })
      .where(eq(roostrs.id, row.roostrId));
    return { ok: true };
  } catch (e) {
    console.error("declineGift failed:", e);
    return { ok: false };
  }
}

// Pending gifts addressed to me → "X sent you a gift" notifications (friends tab).
export async function getIncomingGifts(userId: number): Promise<IncomingGift[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { gifts, users, roostrs } = await import("@/db/schema");
    const { and, desc, eq } = await import("drizzle-orm");
    const reads = await getNotificationReads(userId);
    const rows = await db
      .select({
        id: gifts.id,
        roostrId: gifts.roostrId,
        fromUserId: gifts.fromUserId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        breedId: roostrs.breedId,
        nickname: roostrs.nickname,
        createdAt: gifts.createdAt,
      })
      .from(gifts)
      .innerJoin(users, eq(users.id, gifts.fromUserId))
      .innerJoin(roostrs, eq(roostrs.id, gifts.roostrId))
      .where(and(eq(gifts.toUserId, userId), eq(gifts.status, "pending")))
      .orderBy(desc(gifts.createdAt))
      .limit(50);
    return rows.map((r) => ({
      id: r.id,
      roostrId: r.roostrId,
      fromUserId: r.fromUserId,
      fromName: displayName({ ...r, id: r.fromUserId }),
      fromPhoto: r.photoUrl,
      breedId: r.breedId,
      nickname: r.nickname,
      createdAt: r.createdAt.toISOString(),
      unread: !reads.has(`gift:${r.id}`),
    }));
  } catch (e) {
    console.error("getIncomingGifts failed:", e);
    return [];
  }
}

// Resolved gifts I SENT → "your gift was accepted / declined" notices (friends tab).
export async function getSenderGiftUpdates(
  userId: number,
): Promise<GiftUpdate[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { db } = await import("@/db");
    const { gifts, users, roostrs } = await import("@/db/schema");
    const { and, desc, eq, inArray, isNotNull } = await import("drizzle-orm");
    const reads = await getNotificationReads(userId);
    const rows = await db
      .select({
        id: gifts.id,
        roostrId: gifts.roostrId,
        toUserId: gifts.toUserId,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        photoUrl: users.photoUrl,
        breedId: roostrs.breedId,
        nickname: roostrs.nickname,
        status: gifts.status,
        resolvedAt: gifts.resolvedAt,
      })
      .from(gifts)
      .innerJoin(users, eq(users.id, gifts.toUserId))
      .innerJoin(roostrs, eq(roostrs.id, gifts.roostrId))
      .where(
        and(
          eq(gifts.fromUserId, userId),
          inArray(gifts.status, ["accepted", "declined", "expired"]),
          isNotNull(gifts.resolvedAt),
        ),
      )
      .orderBy(desc(gifts.resolvedAt))
      .limit(30);
    return rows.map((r) => ({
      id: r.id,
      roostrId: r.roostrId,
      toUserId: r.toUserId,
      toName: displayName({ ...r, id: r.toUserId }),
      toPhoto: r.photoUrl,
      breedId: r.breedId,
      nickname: r.nickname,
      status: r.status,
      resolvedAt: (r.resolvedAt ?? new Date()).toISOString(),
      unread: !reads.has(`giftres:${r.id}`),
    }));
  } catch (e) {
    console.error("getSenderGiftUpdates failed:", e);
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

// Collection roster: ACTIVE + WORKING + GIFTING birds. Working ones show a station
// badge; gifting ones hang in "limbo" (sent as a pending gift) — both stay visible
// on the roster but are locked (can't be sold/worked/gifted). Excludes
// listed/sold/recycled. Newest first.
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
          inArray(roostrs.status, ["active", "working", "gifting"]),
        ),
      )
      .orderBy(desc(roostrs.createdAt));
  } catch (e) {
    console.error("getCollectionRoostrs failed:", e);
    return [];
  }
}

// Global leaderboard pool: every ROSTER bird (active or working) across ALL
// players, each with its owner's display name. The page hydrates these + computes
// the offense/defense/utility sums to rank the top 10. Capped at 300 to stay cheap
// — far above any realistic top-10 cutoff at current scale.
export interface LeaderboardEntry {
  row: RoostrRow;
  ownerId: number;
  ownerName: string;
}

export async function getLeaderboardRoostrs(): Promise<LeaderboardEntry[]> {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { roostrs, users } = await import("@/db/schema");
    const { eq, inArray } = await import("drizzle-orm");
    const rows = await db
      .select({ roostr: roostrs, owner: users })
      .from(roostrs)
      .innerJoin(users, eq(roostrs.ownerId, users.id))
      .where(inArray(roostrs.status, ["active", "working"]))
      .limit(300);
    return rows.map((r) => ({
      row: r.roostr as RoostrRow,
      ownerId: r.owner.id,
      ownerName:
        [r.owner.firstName, r.owner.lastName].filter(Boolean).join(" ") ||
        (r.owner.username ? `@${r.owner.username}` : `#${r.owner.id}`),
    }));
  } catch (e) {
    console.error("getLeaderboardRoostrs failed:", e);
    return [];
  }
}

// Roostr ids that currently rank #1 in ANY leaderboard category (offense /
// defense / utility stat-sum). Powers the "Arena Champion" rooster achievement —
// the detail page passes `topCategory: 1` when the bird's id is in this set.
// Derived live from the same pool as the leaderboard (active + working).
export async function getTopCategoryLeaders(): Promise<Set<string>> {
  const entries = await getLeaderboardRoostrs();
  const kinds = ["offense", "defense", "utility"] as const;
  const best: Record<string, { id?: string; score: number }> = {
    offense: { score: -1 },
    defense: { score: -1 },
    utility: { score: -1 },
  };
  for (const e of entries) {
    if (!e.row.id) continue;
    const { stats } = hydrateRoostr(e.row);
    for (const k of kinds) {
      const sum = SKILLS.filter((s) => s.kind === k).reduce(
        (n, s) => n + (stats[s.id] ?? 0),
        0,
      );
      if (sum > best[k].score) best[k] = { id: e.row.id, score: sum };
    }
  }
  const leaders = new Set<string>();
  for (const k of kinds) if (best[k].id) leaders.add(best[k].id);
  return leaders;
}

// A random enemy bird for the debug PvE mode: any roster bird (active/working)
// NOT owned by the caller, picked at random. Returns the row + owner name, or null
// if nobody else has a bird yet. No matchmaking logic — purely random for now.
export async function getRandomEnemyRoostr(
  excludeOwnerId: number,
): Promise<{ row: RoostrRow; ownerName: string } | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { roostrs, users } = await import("@/db/schema");
    const { and, ne, inArray, sql } = await import("drizzle-orm");
    const rows = await db
      .select({ roostr: roostrs, owner: users })
      .from(roostrs)
      .innerJoin(users, sql`${roostrs.ownerId} = ${users.id}`)
      .where(
        and(
          ne(roostrs.ownerId, excludeOwnerId),
          inArray(roostrs.status, ["active", "working"]),
        ),
      )
      .orderBy(sql`random()`)
      .limit(1);
    const r = rows[0];
    if (!r) return null;
    return {
      row: r.roostr as RoostrRow,
      ownerName:
        [r.owner.firstName, r.owner.lastName].filter(Boolean).join(" ") ||
        (r.owner.username ? `@${r.owner.username}` : `#${r.owner.id}`),
    };
  } catch (e) {
    console.error("getRandomEnemyRoostr failed:", e);
    return null;
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

// Atomically bump ONE gene's level by 1 — but ONLY if its stored level is still
// `expected` (owner-guarded, active-only). The level CAS is the race fix: two
// concurrent upgrades both spend, but only ONE matches `expected` and writes; the
// loser returns false so the caller refunds. Missing gene key = level 1.
export async function bumpGeneLevel(
  id: string,
  ownerId: number,
  geneId: string,
  expected: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq, inArray, sql } = await import("drizzle-orm");
    const res = await db
      .update(roostrs)
      .set({
        geneLevels: sql`jsonb_set(coalesce(${roostrs.geneLevels}, '{}'::jsonb), array[${geneId}], to_jsonb((${expected + 1})::int))`,
      })
      .where(
        and(
          eq(roostrs.id, id),
          eq(roostrs.ownerId, ownerId),
          // Roster birds only (active or working) — gifting/listed/sold are locked.
          inArray(roostrs.status, ["active", "working"]),
          sql`coalesce((${roostrs.geneLevels} ->> ${geneId})::int, 1) = ${expected}`,
        ),
      )
      .returning({ id: roostrs.id });
    return res.length > 0;
  } catch (e) {
    console.error("bumpGeneLevel failed:", e);
    return false;
  }
}

// Splice a synth gene into a bird's DNA — owner-guarded, roster-only (active or
// working), atomic. The WHERE clause is the race fix + slot guard in one shot: it
// appends ONLY if the bird still has a free slot AND doesn't already carry this
// gene, so two concurrent buys can't overfill or double-add. Returns true if it
// was applied (false = not owner / locked status / no free slot / already has it).
// Caller spends science first and refunds on a false return.
export async function applySynthGene(
  id: string,
  ownerId: number,
  geneId: string,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { SYNTH_GENE_MAX_SLOTS } = await import("@/lib/roostr");
    const { and, eq, inArray, sql } = await import("drizzle-orm");
    const res = await db
      .update(roostrs)
      .set({
        synthGeneIds: sql`coalesce(${roostrs.synthGeneIds}, '[]'::jsonb) || to_jsonb(${geneId}::text)`,
      })
      .where(
        and(
          eq(roostrs.id, id),
          eq(roostrs.ownerId, ownerId),
          // Roster birds only (active or working) — gifting/listed/sold are locked.
          inArray(roostrs.status, ["active", "working"]),
          sql`jsonb_array_length(coalesce(${roostrs.synthGeneIds}, '[]'::jsonb)) < ${SYNTH_GENE_MAX_SLOTS}`,
          sql`NOT (coalesce(${roostrs.synthGeneIds}, '[]'::jsonb) @> ${JSON.stringify([geneId])}::jsonb)`,
        ),
      )
      .returning({ id: roostrs.id });
    return res.length > 0;
  } catch (e) {
    console.error("applySynthGene failed:", e);
    return false;
  }
}

// Atomically bump ONE synth gene's level by 1 — owner-guarded, roster-only, and
// only if the gene is actually spliced in AND its stored level is still
// `expected` (the CAS race fix, same as bumpGeneLevel). Missing key = level 1.
// Returns true if it bumped; the caller refunds science on false.
export async function bumpSynthGeneLevel(
  id: string,
  ownerId: number,
  geneId: string,
  expected: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq, inArray, sql } = await import("drizzle-orm");
    const res = await db
      .update(roostrs)
      .set({
        synthGeneLevels: sql`jsonb_set(coalesce(${roostrs.synthGeneLevels}, '{}'::jsonb), array[${geneId}], to_jsonb((${expected + 1})::int))`,
      })
      .where(
        and(
          eq(roostrs.id, id),
          eq(roostrs.ownerId, ownerId),
          inArray(roostrs.status, ["active", "working"]),
          // the gene must actually be spliced into this bird
          sql`coalesce(${roostrs.synthGeneIds}, '[]'::jsonb) @> ${JSON.stringify([geneId])}::jsonb`,
          // level CAS — only the upgrade still at `expected` wins
          sql`coalesce((${roostrs.synthGeneLevels} ->> ${geneId})::int, 1) = ${expected}`,
        ),
      )
      .returning({ id: roostrs.id });
    return res.length > 0;
  } catch (e) {
    console.error("bumpSynthGeneLevel failed:", e);
    return false;
  }
}

// Release a bird to the wild — owner-guarded, ACTIVE-only, atomic. Moves it to the
// "released" limbo status (excluded from every listing — collection, leaderboard,
// PvE, market) and stamps `meta.freed` (drives the "Set Free" rooster achievement).
// ownerId is kept for provenance — the row is NOT deleted. CAS on status="active"
// so it can't race a sell/gift/station-assign. Returns true if it was released.
export async function releaseRoostr(id: string, ownerId: number): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs, roostrReleases } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const cur = await getRoostr(id);
    const meta: Record<string, unknown> = {
      ...((cur?.meta as Record<string, unknown>) ?? {}),
      freed: true,
    };
    const res = await db
      .update(roostrs)
      .set({ status: "released", meta })
      .where(
        and(
          eq(roostrs.id, id),
          eq(roostrs.ownerId, ownerId),
          eq(roostrs.status, "active"),
        ),
      )
      .returning({ id: roostrs.id });
    if (res.length === 0) return false;
    // Append the release-log row (who + when) only after the CAS actually flipped
    // the bird — so a lost race never logs a phantom release.
    await db.insert(roostrReleases).values({ roostrId: id, userId: ownerId });
    return true;
  } catch (e) {
    console.error("releaseRoostr failed:", e);
    return false;
  }
}

// Most recent release of a bird (when it was last set free + when it was adopted
// back, if ever). Powers the "freed on X · N on the loose" readout. Null if the
// bird was never released.
export async function getLatestRelease(
  roostrId: string,
): Promise<{ releasedAt: Date; adoptedAt: Date | null } | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { roostrReleases } = await import("@/db/schema");
    const { desc, eq } = await import("drizzle-orm");
    const [r] = await db
      .select({
        releasedAt: roostrReleases.releasedAt,
        adoptedAt: roostrReleases.adoptedAt,
      })
      .from(roostrReleases)
      .where(eq(roostrReleases.roostrId, roostrId))
      .orderBy(desc(roostrReleases.releasedAt))
      .limit(1);
    return r ?? null;
  } catch (e) {
    console.error("getLatestRelease failed:", e);
    return null;
  }
}

// --- Hospital (heal hurt birds; per-bird, Recovery-paced) ---

// How many birds this owner has in the hospital right now.
export async function countHospitalPatients(ownerId: number): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");
    const [c] = await db
      .select({ n: sql<number>`count(*)` })
      .from(roostrs)
      .where(
        and(
          eq(roostrs.ownerId, ownerId),
          eq(roostrs.status, "working"),
          sql`${roostrs.meta} #>> '{work,kind}' = 'hospital'`,
        ),
      );
    return Number(c?.n ?? 0);
  } catch (e) {
    console.error("countHospitalPatients failed:", e);
    return 0;
  }
}

// Admit a hurt bird to the hospital: owner-guarded, ACTIVE + hurt only, a free bed
// required. Locks it (status working, meta.work.kind="hospital") and stamps the
// heal anchor (hpAt=now). Returns an error code the UI can message.
export async function admitToHospital(
  id: string,
  ownerId: number,
): Promise<{ ok: boolean; error?: "owner" | "locked" | "healthy" | "full" | "db" }> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  try {
    const { db } = await import("@/db");
    const { roostrs, roostrHospitalVisits } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");
    const row = await getRoostr(id);
    if (!row || row.ownerId !== ownerId) return { ok: false, error: "owner" };
    if (row.status !== "active") return { ok: false, error: "locked" };
    const { maxHealth } = hydrateRoostr(row);
    if (row.currentHp == null || row.currentHp >= maxHealth) {
      return { ok: false, error: "healthy" };
    }
    const slots = await getHospitalSlots(ownerId);
    if ((await countHospitalPatients(ownerId)) >= slots) {
      return { ok: false, error: "full" };
    }
    const meta = {
      ...((row.meta as Record<string, unknown>) ?? {}),
      work: { kind: "hospital", since: Date.now() },
    };
    // The bed-count subquery in the WHERE makes the cap atomic: a concurrent admit
    // of another bird can't slip past `slots` — the count is re-checked inside the
    // same UPDATE, not read-then-write. 0 rows now means the cap filled in a race.
    const res = await db
      .update(roostrs)
      .set({ status: "working", meta, hpAt: new Date() })
      .where(
        and(
          eq(roostrs.id, id),
          eq(roostrs.ownerId, ownerId),
          eq(roostrs.status, "active"),
          sql`(select count(*) from roostrs r2 where r2.owner_id = ${ownerId} and r2.status = 'working' and r2.meta #>> '{work,kind}' = 'hospital') < ${slots}`,
        ),
      )
      .returning({ id: roostrs.id });
    if (res.length === 0) return { ok: false, error: "full" };
    // Log the visit (admitHp drives the "nine lives" near-death achievement).
    await db.insert(roostrHospitalVisits).values({
      roostrId: id,
      userId: ownerId,
      admitHp: row.currentHp,
    });
    return { ok: true };
  } catch (e) {
    console.error("admitToHospital failed:", e);
    return { ok: false, error: "db" };
  }
}

// Close the latest OPEN visit for a bird (called on discharge / auto-discharge).
async function closeHospitalVisit(roostrId: string, healedFull: boolean): Promise<void> {
  try {
    const { db } = await import("@/db");
    const { roostrHospitalVisits } = await import("@/db/schema");
    const { and, desc, eq, isNull } = await import("drizzle-orm");
    const [open] = await db
      .select({ id: roostrHospitalVisits.id })
      .from(roostrHospitalVisits)
      .where(
        and(eq(roostrHospitalVisits.roostrId, roostrId), isNull(roostrHospitalVisits.dischargedAt)),
      )
      .orderBy(desc(roostrHospitalVisits.admittedAt))
      .limit(1);
    if (!open) return;
    await db
      .update(roostrHospitalVisits)
      .set({ dischargedAt: new Date(), healedFull })
      .where(eq(roostrHospitalVisits.id, open.id));
  } catch (e) {
    console.error("closeHospitalVisit failed:", e);
  }
}

// Discharge a bird from the hospital: settle its healed HP (write back; null if
// full), unlock to active, clear the work stamp + anchor. Owner-guarded.
export async function dischargeFromHospital(
  id: string,
  ownerId: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const { healedHp } = await import("@/lib/hospital");
    const row = await getRoostr(id);
    if (!row || row.ownerId !== ownerId) return false;
    const work = (row.meta as { work?: { kind?: string } } | null)?.work;
    if (row.status !== "working" || work?.kind !== "hospital") return false;
    const { maxHealth, stats } = hydrateRoostr(row);
    const healed = healedHp(
      row.currentHp,
      maxHealth,
      stats.Recovery ?? 0,
      row.hpAt ? new Date(row.hpAt).getTime() : null,
      Date.now(),
    );
    const meta = { ...((row.meta as Record<string, unknown>) ?? {}) };
    delete meta.work;
    const res = await db
      .update(roostrs)
      .set({
        status: "active",
        meta,
        hpAt: null,
        currentHp: healed >= maxHealth ? null : healed,
      })
      .where(
        and(eq(roostrs.id, id), eq(roostrs.ownerId, ownerId), eq(roostrs.status, "working")),
      )
      .returning({ id: roostrs.id });
    if (res.length === 0) return false;
    await closeHospitalVisit(id, healed >= maxHealth);
    return true;
  } catch (e) {
    console.error("dischargeFromHospital failed:", e);
    return false;
  }
}

// Hospital screen data: current patients (fully-healed ones STAY on the bed until
// the player collects them — no auto-discharge), the owner's admittable hurt birds,
// and the bed count.
export async function getHospitalView(ownerId: number): Promise<{
  patients: Awaited<ReturnType<typeof getRoostrs>>;
  injured: Awaited<ReturnType<typeof getRoostrs>>;
  slots: number;
}> {
  if (!process.env.DATABASE_URL) return { patients: [], injured: [], slots: 2 };
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");

    const patients = await db
      .select()
      .from(roostrs)
      .where(
        and(
          eq(roostrs.ownerId, ownerId),
          eq(roostrs.status, "working"),
          sql`${roostrs.meta} #>> '{work,kind}' = 'hospital'`,
        ),
      );

    const activeRows = await db
      .select()
      .from(roostrs)
      .where(and(eq(roostrs.ownerId, ownerId), eq(roostrs.status, "active")));
    const injured = activeRows.filter((r) => {
      const { maxHealth } = hydrateRoostr(r);
      return r.currentHp != null && r.currentHp < maxHealth;
    });

    return { patients, injured, slots: await getHospitalSlots(ownerId) };
  } catch (e) {
    console.error("getHospitalView failed:", e);
    return { patients: [], injured: [], slots: 1 };
  }
}

// How many of this owner's patients are fully healed and waiting to be collected.
// Drives the "come collect your healed rooster" notification (bell alert).
export async function getHospitalReadyCount(ownerId: number): Promise<number> {
  if (!process.env.DATABASE_URL || !Number.isFinite(ownerId)) return 0;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq, sql } = await import("drizzle-orm");
    const { healedHp } = await import("@/lib/hospital");
    const nowMs = Date.now();
    const rows = await db
      .select()
      .from(roostrs)
      .where(
        and(
          eq(roostrs.ownerId, ownerId),
          eq(roostrs.status, "working"),
          sql`${roostrs.meta} #>> '{work,kind}' = 'hospital'`,
        ),
      );
    let ready = 0;
    for (const row of rows) {
      const { maxHealth, stats } = hydrateRoostr(row);
      const healed = healedHp(
        row.currentHp,
        maxHealth,
        stats.Recovery ?? 0,
        row.hpAt ? new Date(row.hpAt).getTime() : null,
        nowMs,
      );
      if (healed >= maxHealth) ready++;
    }
    return ready;
  } catch (e) {
    console.error("getHospitalReadyCount failed:", e);
    return 0;
  }
}

// Beds this owner has (base 1 + bought). Stored in work_stations kind="hospital"
// (reusing only the slotsOwned column; patients are tracked via meta.work.kind).
export async function getHospitalSlots(ownerId: number): Promise<number> {
  if (!process.env.DATABASE_URL) return 1;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const { HOSPITAL_BASE_SLOTS } = await import("@/lib/hospital");
    const [r] = await db
      .select({ slots: workStations.slotsOwned })
      .from(workStations)
      .where(and(eq(workStations.userId, ownerId), eq(workStations.kind, "hospital")))
      .limit(1);
    return r?.slots ?? HOSPITAL_BASE_SLOTS;
  } catch (e) {
    console.error("getHospitalSlots failed:", e);
    return 1;
  }
}

// Buy the next hospital bed with coins. Server-computes the price + max.
export async function buyHospitalSlot(
  ownerId: number,
): Promise<{ ok: boolean; error?: "max" | "coins" | "db" }> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const { HOSPITAL_BASE_SLOTS, nextHospitalSlotPrice, maxHospitalSlots } =
      await import("@/lib/hospital");
    const [row] = await db
      .select()
      .from(workStations)
      .where(
        and(eq(workStations.userId, ownerId), eq(workStations.kind, "hospital")),
      )
      .limit(1);
    const current = row?.slotsOwned ?? HOSPITAL_BASE_SLOTS;
    const price = nextHospitalSlotPrice(current);
    if (price == null || current >= maxHospitalSlots())
      return { ok: false, error: "max" };
    const coins = await spendCoins(ownerId, price, "hospital_slot");
    if (coins === null) return { ok: false, error: "coins" };
    // Apply +1 pinned to the OBSERVED count (CAS on `slotsOwned = current`), so a
    // concurrent buy that already advanced the count loses the race and refunds —
    // this is what forces each buy onto its own (escalating) price tier, not just
    // a `< max` cap guard (which two racers can both satisfy at the cheap price).
    const applied = row
      ? await db
          .update(workStations)
          .set({ slotsOwned: current + 1 })
          .where(
            and(
              eq(workStations.userId, ownerId),
              eq(workStations.kind, "hospital"),
              eq(workStations.slotsOwned, current),
            ),
          )
          .returning({ s: workStations.slotsOwned })
      : await db
          .insert(workStations)
          .values({ userId: ownerId, kind: "hospital", slotsOwned: current + 1 })
          .onConflictDoNothing()
          .returning({ s: workStations.slotsOwned });
    if (applied.length === 0) {
      // Lost the race (count changed / row appeared) — refund, no bed granted.
      await grantCoins(ownerId, price, "refund", "hospital_slot");
      return { ok: false, error: "max" };
    }
    return { ok: true };
  } catch (e) {
    console.error("buyHospitalSlot failed:", e);
    return { ok: false, error: "db" };
  }
}

// --- Raid party slots (Coop & Dagger, phase 1) — same slot-count reuse of
// work_stations as the hospital: only `slotsOwned`, no accrual. See lib/raids.ts.
export async function getRaidSlots(ownerId: number): Promise<number> {
  const { RAID_BASE_SLOTS } = await import("@/lib/raids");
  if (!process.env.DATABASE_URL) return RAID_BASE_SLOTS;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [r] = await db
      .select({ slots: workStations.slotsOwned })
      .from(workStations)
      .where(and(eq(workStations.userId, ownerId), eq(workStations.kind, "raid")))
      .limit(1);
    return r?.slots ?? RAID_BASE_SLOTS;
  } catch (e) {
    console.error("getRaidSlots failed:", e);
    return RAID_BASE_SLOTS;
  }
}

// Buy the next raider slot with coins. Server-priced + capped (same atomic bump +
// refund-on-lost-race as buyHospitalSlot).
export async function buyRaidSlot(
  ownerId: number,
): Promise<{ ok: boolean; error?: "max" | "coins" | "db" }> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const { RAID_BASE_SLOTS, nextRaidSlotPrice, maxRaidSlots } = await import(
      "@/lib/raids"
    );
    const [row] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, ownerId), eq(workStations.kind, "raid")))
      .limit(1);
    const current = row?.slotsOwned ?? RAID_BASE_SLOTS;
    const price = nextRaidSlotPrice(current);
    if (price == null || current >= maxRaidSlots())
      return { ok: false, error: "max" };
    const coins = await spendCoins(ownerId, price, "raid_slot");
    if (coins === null) return { ok: false, error: "coins" };
    // CAS pinned to the observed count (see buyHospitalSlot) — a concurrent buy
    // that already advanced `slotsOwned` loses and refunds, so each slot is bought
    // at its own escalating price rather than two racers sharing the cheap tier.
    const applied = row
      ? await db
          .update(workStations)
          .set({ slotsOwned: current + 1 })
          .where(
            and(
              eq(workStations.userId, ownerId),
              eq(workStations.kind, "raid"),
              eq(workStations.slotsOwned, current),
            ),
          )
          .returning({ s: workStations.slotsOwned })
      : await db
          .insert(workStations)
          .values({ userId: ownerId, kind: "raid", slotsOwned: current + 1 })
          .onConflictDoNothing()
          .returning({ s: workStations.slotsOwned });
    if (applied.length === 0) {
      // Lost the race (count changed / row appeared) — refund, no slot granted.
      await grantCoins(ownerId, price, "refund", "raid_slot");
      return { ok: false, error: "max" };
    }
    return { ok: true };
  } catch (e) {
    console.error("buyRaidSlot failed:", e);
    return { ok: false, error: "db" };
  }
}

export interface RaidCandidate {
  userId: number;
  name: string;
  watch: number; // Σ Crow of their defense guards (live)
  pool: number; // their coin balance — the loot ceiling (can't grab more than they hold)
}

// A few RANDOM real players eligible to be raided (mixed into the target list with
// bots). Eligible = WITHOUT immunity: not self, past the 3-day new-player shield.
// (Post-raid `raidShieldUntil` + per-pair cooldown are phase-3 columns; not filtered
// yet.) Each carries its live Watch so the picker can show risk.
export async function getRaidCandidates(
  selfId: number,
  limit = 4,
): Promise<RaidCandidate[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(selfId)) return [];
  try {
    const { db } = await import("@/db");
    const { users } = await import("@/db/schema");
    const { and, ne, lt, sql } = await import("drizzle-orm");
    const cutoff = new Date(Date.now() - 3 * 86_400_000);
    const rows = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        coins: users.coins,
      })
      .from(users)
      .where(and(ne(users.id, selfId), lt(users.createdAt, cutoff)))
      .orderBy(sql`random()`)
      .limit(limit);
    const out: RaidCandidate[] = [];
    for (const u of rows) {
      out.push({
        userId: u.id,
        name: displayName(u),
        watch: await getDefenseValue(u.id),
        pool: u.coins,
      });
    }
    return out;
  } catch (e) {
    console.error("getRaidCandidates failed:", e);
    return [];
  }
}

// --- Raid launch / resolve (phase 2 — bot targets, .notes/RAIDS.md) ---

// Settle feather regen lazily, then spend `amount`. current = stored + whole hours
// since the anchor (capped at max); spend writes (current − amount) back and resets
// the anchor. CAS on the previously-read stored value so two concurrent spends
// can't both win off one balance. Returns the new stored count, or null if short.
export async function spendFeathers(
  userId: number,
  amount: number,
): Promise<number | null> {
  if (!process.env.DATABASE_URL) return null;
  if (!Number.isInteger(amount) || amount <= 0) return null;
  try {
    const { db } = await import("@/db");
    const { users, resourceTxns } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const { currentFeathers } = await import("@/lib/feathers");
    const [u] = await db
      .select({
        feathers: users.feathers,
        featherMax: users.featherMax,
        feathersAt: users.feathersAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);
    if (!u) return null;
    const now = Date.now();
    const current = currentFeathers(
      u.feathers,
      u.featherMax,
      new Date(u.feathersAt).getTime(),
      now,
    );
    if (current < amount) return null;
    const next = current - amount;
    const res = await db
      .update(users)
      .set({ feathers: next, feathersAt: new Date(now), updatedAt: new Date(now) })
      .where(and(eq(users.id, userId), eq(users.feathers, u.feathers)))
      .returning({ f: users.feathers });
    if (res.length === 0) return null; // lost a concurrent race — caller retries/fails
    await db.insert(resourceTxns).values({
      userId,
      resource: "feather",
      amount: -amount,
      kind: "raid",
      balanceAfter: next,
    });
    return next;
  } catch (e) {
    console.error("spendFeathers failed:", e);
    return null;
  }
}

// The attacker's raid in flight (or awaiting Collect) — one per player.
export async function getActiveRaid(userId: number) {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { raids } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [r] = await db
      .select()
      .from(raids)
      .where(and(eq(raids.attackerUserId, userId), eq(raids.status, "active")))
      .limit(1);
    return r ?? null;
  } catch (e) {
    console.error("getActiveRaid failed:", e);
    return null;
  }
}

export type LaunchRaidResult =
  | { ok: true; raidId: string; endsAt: number }
  | {
      ok: false;
      reason: "nodb" | "bot" | "busy" | "party" | "feather" | "locked" | "error";
    };

// Launch a raid vs a BOT: validate the party (owned + active), enforce one raid in
// flight, spend 1 feather, CAS-lock every party bird active→raiding, snapshot the
// contest inputs and insert the raids row. Any failure after the feather spend
// refunds it; a partial party lock is fully reverted (no bird orphans in "raiding").
export async function launchRaid(
  userId: number,
  botId: string,
  partyIds: string[],
): Promise<LaunchRaidResult> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  try {
    const { db } = await import("@/db");
    const { raids, roostrs } = await import("@/db/schema");
    const { and, eq, inArray } = await import("drizzle-orm");
    const {
      raidBotById,
      partyPower,
      partyLuck,
      partySpeed,
      raidDurationMs,
      RAID_FEATHER_COST,
    } = await import("@/lib/raids");

    const bot = raidBotById(botId);
    if (!bot) return { ok: false, reason: "bot" };
    const ids = [...new Set(partyIds)].filter(Boolean);
    const slots = await getRaidSlots(userId);
    if (ids.length === 0 || ids.length > slots) return { ok: false, reason: "party" };

    // One raid in flight per player.
    if (await getActiveRaid(userId)) return { ok: false, reason: "busy" };

    // Validate + snapshot the party from the DB (never trust client stats).
    const rows = await db
      .select()
      .from(roostrs)
      .where(and(inArray(roostrs.id, ids), eq(roostrs.ownerId, userId)));
    if (rows.length !== ids.length) return { ok: false, reason: "party" };
    if (rows.some((r) => r.status !== "active")) return { ok: false, reason: "party" };
    const party = rows.map(hydrateRoostr);
    const power = partyPower(party);
    const luck = partyLuck(party);
    const speed = partySpeed(party);
    const durationMs = raidDurationMs(bot.watch, speed);

    // Pay the feather BEFORE locking (cheapest thing to refund on a lost race).
    const feathers = await spendFeathers(userId, RAID_FEATHER_COST);
    if (feathers === null) return { ok: false, reason: "feather" };
    const refundFeather = async () => {
      // Feathers regen to a cap, so a "+1" grant is the honest refund shape.
      try {
        const { users } = await import("@/db/schema");
        const { eq: eq2, sql } = await import("drizzle-orm");
        await db
          .update(users)
          .set({ feathers: sql`${users.feathers} + ${RAID_FEATHER_COST}` })
          .where(eq2(users.id, userId));
      } catch (e) {
        console.error("feather refund failed:", e);
      }
    };

    // CAS-lock the party: every bird must still be active + owned. Anything short
    // of a full lock reverts entirely.
    const locked = await db
      .update(roostrs)
      .set({ status: "raiding" })
      .where(
        and(
          inArray(roostrs.id, ids),
          eq(roostrs.ownerId, userId),
          eq(roostrs.status, "active"),
        ),
      )
      .returning({ id: roostrs.id });
    if (locked.length !== ids.length) {
      await db
        .update(roostrs)
        .set({ status: "active" })
        .where(
          and(
            inArray(roostrs.id, locked.map((l) => l.id)),
            eq(roostrs.status, "raiding"),
          ),
        );
      await refundFeather();
      return { ok: false, reason: "locked" };
    }

    const endsAt = new Date(Date.now() + durationMs);
    try {
      const [r] = await db
        .insert(raids)
        .values({
          attackerUserId: userId,
          botId,
          partyRoostrIds: ids,
          raidPowerSnapshot: power,
          defenseSnapshot: bot.watch,
          luckSnapshot: luck,
          targetPool: bot.coinPool,
          endsAt,
        })
        .returning({ id: raids.id });
      return { ok: true, raidId: r.id, endsAt: endsAt.getTime() };
    } catch (insErr) {
      // Insert failed → free the party + refund; nothing launched.
      await db
        .update(roostrs)
        .set({ status: "active" })
        .where(and(inArray(roostrs.id, ids), eq(roostrs.status, "raiding")));
      await refundFeather();
      console.error("launchRaid insert failed, reverted:", insErr);
      return { ok: false, reason: "error" };
    }
  } catch (e) {
    console.error("launchRaid failed:", e);
    return { ok: false, reason: "error" };
  }
}

export type ResolveRaidResult =
  | {
      ok: true;
      success: boolean;
      lootCoins: number;
      lootEggs: number;
      wasConsolation: boolean;
    }
  | { ok: false; reason: "nodb" | "gone" | "early" | "error" };

// Manual "Collect": resolve a raid whose timer has ended. Single-winner CAS claims
// the row (active→resolved), then: roll success (Stealth vs Watch snapshot), apply
// the flat HP cost to every party bird (floor 1 — a raid never kills), unlock the
// party, and pay the loot (coins kind "raid" — the achievements/metrics ledger key;
// egg drop is a separate faucet grant). Bird unlock comes BEFORE the grants so a
// mid-resolve crash can't orphan the party in "raiding".
export async function resolveRaid(
  raidId: string,
  userId: number,
): Promise<ResolveRaidResult> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  try {
    const { db } = await import("@/db");
    const { raids, roostrs } = await import("@/db/schema");
    const { and, eq, inArray, lte, sql } = await import("drizzle-orm");
    const {
      raidSuccess,
      raidLoot,
      RAID_HP_COST_WIN,
      RAID_HP_COST_LOSS,
      RAID_EGG_CHANCE,
      RAID_EGG_AMOUNT,
      RAID_CONSOLATION_MIN,
      RAID_CONSOLATION_MAX,
    } = await import("@/lib/raids");

    const now = new Date();
    // Pre-read to distinguish "not yours/gone" from "timer not done".
    const [pre] = await db
      .select()
      .from(raids)
      .where(
        and(
          eq(raids.id, raidId),
          eq(raids.attackerUserId, userId),
          eq(raids.status, "active"),
        ),
      )
      .limit(1);
    if (!pre) return { ok: false, reason: "gone" };
    if (pre.endsAt > now) return { ok: false, reason: "early" };

    // Single-winner claim.
    const claimed = await db
      .update(raids)
      .set({ status: "resolved", resolvedAt: now })
      .where(and(eq(raids.id, raidId), eq(raids.status, "active"), lte(raids.endsAt, now)))
      .returning();
    if (claimed.length === 0) return { ok: false, reason: "gone" };
    const raid = claimed[0];

    // The contest roll — snapshots only, as speced.
    const p = raidSuccess(raid.raidPowerSnapshot, raid.defenseSnapshot);
    const success = Math.random() < p;

    // Loot: winners grab Luck×rate capped by the pool; an empty grab still pays a
    // small consolation. Losers get nothing (the hours + HP were the price).
    let lootCoins = 0;
    let wasConsolation = false;
    if (success) {
      lootCoins = raidLoot(raid.luckSnapshot, raid.targetPool);
      if (lootCoins <= 0) {
        lootCoins =
          RAID_CONSOLATION_MIN +
          Math.floor(Math.random() * (RAID_CONSOLATION_MAX - RAID_CONSOLATION_MIN + 1));
        wasConsolation = true;
      }
    }
    const lootEggs =
      success && Math.random() < RAID_EGG_CHANCE ? RAID_EGG_AMOUNT : 0;

    // HP cost + unlock in ONE statement per party: floor at 1, never kill.
    // coalesce(currentHp, maxHealth) handles the "full HP = null" convention.
    const hpCost = success ? RAID_HP_COST_WIN : RAID_HP_COST_LOSS;
    const ids = raid.partyRoostrIds ?? [];
    if (ids.length > 0) {
      await db
        .update(roostrs)
        .set({
          status: "active",
          currentHp: sql`greatest(1, coalesce(${roostrs.currentHp}, ${roostrs.maxHealth}) - ${hpCost})`,
        })
        .where(and(inArray(roostrs.id, ids), eq(roostrs.status, "raiding")));
    }

    // Pay out (bot target = pure faucet; no victim side in phase 2).
    if (lootCoins > 0) await grantResource(userId, "coin", lootCoins, "raid", raid.botId ?? raidId);
    if (lootEggs > 0) await grantResource(userId, "egg", lootEggs, "raid", raid.botId ?? raidId);

    // Stamp the outcome on the row (post-claim, so a crash here loses only display
    // fields, not money or bird state).
    await db
      .update(raids)
      .set({ success, lootCoins, lootEggs, wasConsolation })
      .where(eq(raids.id, raidId));

    return { ok: true, success, lootCoins, lootEggs, wasConsolation };
  } catch (e) {
    console.error("resolveRaid failed:", e);
    return { ok: false, reason: "error" };
  }
}

// 1 when the player's raid timer has ended and the loot awaits Collect, else 0.
// Ephemeral ready-signal (like getHospitalReadyCount) — clears itself on collect,
// no read-tracking rows needed.
export async function getRaidReadyCount(userId: number): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const raid = await getActiveRaid(userId);
    return raid && raid.endsAt <= new Date() ? 1 : 0;
  } catch (e) {
    console.error("getRaidReadyCount failed:", e);
    return 0;
  }
}

// Raid log — the attacker's resolved raids, newest first. The `raids` table is
// append-only, so this IS the full history (who was hit, when, outcome, haul).
export async function getRaidHistory(userId: number, limit = 12) {
  if (!process.env.DATABASE_URL) return [];
  try {
    const { db } = await import("@/db");
    const { raids } = await import("@/db/schema");
    const { and, desc, eq } = await import("drizzle-orm");
    return await db
      .select()
      .from(raids)
      .where(and(eq(raids.attackerUserId, userId), eq(raids.status, "resolved")))
      .orderBy(desc(raids.resolvedAt))
      .limit(limit);
  } catch (e) {
    console.error("getRaidHistory failed:", e);
    return [];
  }
}

// DEV ONLY: knock `damage` HP off a bird (to test the hospital before combat
// exists). Owner + active guarded; result floored at 1; a full result → null.
export async function damageRoostr(
  id: string,
  ownerId: number,
  damage: number,
): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const row = await getRoostr(id);
    if (!row || row.ownerId !== ownerId || row.status !== "active") return false;
    const { maxHealth } = hydrateRoostr(row);
    const target = Math.max(1, maxHealth - Math.floor(damage));
    await db
      .update(roostrs)
      .set({ currentHp: target >= maxHealth ? null : target })
      .where(and(eq(roostrs.id, id), eq(roostrs.ownerId, ownerId)));
    return true;
  } catch (e) {
    console.error("damageRoostr failed:", e);
    return false;
  }
}

// Per-bird hospital stats for rooster achievements: total visits ("frequent
// patient") + whether it ever came in at rock-bottom HP and fully healed ("nine lives").
export async function getRoostrHospitalStats(
  roostrId: string,
): Promise<{ visits: number; nineLives: boolean }> {
  if (!process.env.DATABASE_URL) return { visits: 0, nineLives: false };
  try {
    const { db } = await import("@/db");
    const { roostrHospitalVisits } = await import("@/db/schema");
    const { eq, sql } = await import("drizzle-orm");
    const [c] = await db
      .select({
        visits: sql<number>`count(*)`,
        nine: sql<number>`count(*) filter (where ${roostrHospitalVisits.admitHp} <= 1 and ${roostrHospitalVisits.healedFull})`,
      })
      .from(roostrHospitalVisits)
      .where(eq(roostrHospitalVisits.roostrId, roostrId));
    return { visits: Number(c?.visits ?? 0), nineLives: Number(c?.nine ?? 0) > 0 };
  } catch (e) {
    console.error("getRoostrHospitalStats failed:", e);
    return { visits: 0, nineLives: false };
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
    const { and, eq, sql } = await import("drizzle-orm");
    // Bump meta.renameCount on a real rename (not a clear) — drives the per-bird
    // "Indecisive" achievement. jsonb_set preserves the rest of meta (work stamp).
    const inc = nickname ? 1 : 0;
    const res = await db
      .update(roostrs)
      .set({
        nickname,
        meta: sql`jsonb_set(coalesce(${roostrs.meta}, '{}'::jsonb), '{renameCount}', to_jsonb(coalesce((${roostrs.meta}->>'renameCount')::int, 0) + ${inc}))`,
      })
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

// --- Roostrdex completion rewards (formula in lib/dexRewards.ts) ---

export interface DexRewardGrant {
  key: string; // "group:<id>" | "full"
  resource: ResourceKind;
  amount: number;
}

// Grant any newly-completed Roostrdex rewards (a fully-discovered group → coins
// scaled by group size; the whole dex → eggs). Claim-once via CAS on `dex_rewards`.
// Idempotent — safe to call on every dex visit; returns only the NEW grants (toast).
export async function grantDexRewards(
  userId: number,
): Promise<DexRewardGrant[]> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return [];
  try {
    const { BREEDS_CATALOG } = await import("@/lib/breeds");
    const { groupReward, FULL_DEX_REWARD } = await import("@/lib/dexRewards");
    const discovered = new Set(await getDiscoveredBreeds(userId));

    // Group → breed ids.
    const groups: Record<string, string[]> = {};
    for (const b of BREEDS_CATALOG) (groups[b.group] ??= []).push(b.id);

    const earned: DexRewardGrant[] = [];
    for (const [g, ids] of Object.entries(groups)) {
      if (ids.every((id) => discovered.has(id))) {
        earned.push({ key: `group:${g}`, ...groupReward(ids.length) });
      }
    }
    if (BREEDS_CATALOG.every((b) => discovered.has(b.id))) {
      earned.push({ key: "full", ...FULL_DEX_REWARD });
    }
    if (!earned.length) return [];

    const { db } = await import("@/db");
    const { dexRewards } = await import("@/db/schema");
    const inserted = await db
      .insert(dexRewards)
      .values(earned.map((e) => ({ userId, rewardKey: e.key })))
      .onConflictDoNothing()
      .returning({ rewardKey: dexRewards.rewardKey });
    const fresh = new Set(inserted.map((r) => r.rewardKey));

    const granted: DexRewardGrant[] = [];
    for (const e of earned) {
      if (fresh.has(e.key)) {
        await grantResource(userId, e.resource, e.amount, "dex", e.key);
        granted.push(e);
      }
    }
    return granted;
  } catch (e) {
    console.error("grantDexRewards failed:", e);
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
  unread?: boolean; // for derived "new friend" notifications (vs the read cursor)
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

// All per-item read keys for a user → drives the `unread` flag on every feed
// source. Cheap single-table fetch (PK-prefixed by userId).
export async function getNotificationReads(
  userId: number,
): Promise<Set<string>> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return new Set();
  try {
    const { db } = await import("@/db");
    const { notificationReads } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select({ key: notificationReads.key })
      .from(notificationReads)
      .where(eq(notificationReads.userId, userId));
    return new Set(rows.map((r) => r.key));
  } catch (e) {
    console.error("getNotificationReads failed:", e);
    return new Set();
  }
}

// Mark ONE feed item read (idempotent). `key` = "<source>:<id>" (see schema).
export async function markNotificationRead(
  userId: number,
  key: string,
): Promise<void> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId) || !key) return;
  try {
    const { db } = await import("@/db");
    const { notificationReads } = await import("@/db/schema");
    await db
      .insert(notificationReads)
      .values({ userId, key })
      .onConflictDoNothing();
  } catch (e) {
    console.error("markNotificationRead failed:", e);
  }
}

// Count UNREAD notifications for the HUD bell badge. Reuses the feed getters so
// the badge count matches exactly what the page shows: informational items
// (news / achievements / dex / new friends) that have no per-item read row, plus
// the ACTIONABLE ones — incoming friend requests, claimable quests, full stations
// — which clear by being resolved, not by a read mark.
export async function countUnreadNotifications(userId: number): Promise<number> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return 0;
  try {
    const [news, ach, dex, friends, requests, gifts, giftUpdates, synth, readyQ, stations, hospitalReady, raidReady] =
      await Promise.all([
        getNews(userId),
        getNewAchievements(userId),
        getRecentDiscoveries(userId),
        getNewFriends(userId),
        getIncomingFriendRequests(userId),
        getIncomingGifts(userId),
        getSenderGiftUpdates(userId),
        getSynthGeneNotifications(userId),
        countReadyQuests(userId),
        getStationAlerts(userId),
        getHospitalReadyCount(userId),
        getRaidReadyCount(userId),
      ]);
    const unread =
      news.filter((n) => n.unread).length +
      ach.filter((a) => a.unread).length +
      dex.filter((d) => d.unread).length +
      friends.filter((f) => f.unread).length +
      gifts.filter((g) => g.unread).length +
      giftUpdates.filter((g) => g.unread).length +
      synth.filter((s) => s.unread).length;
    return unread + requests.length + readyQ + stations.length + hospitalReady + raidReady;
  } catch (e) {
    console.error("countUnreadNotifications failed:", e);
    return 0;
  }
}

export interface StationAlert {
  kind: "farm" | "lab"; // accrual stations only (defense never buffers)
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
    for (const kind of ["farm", "lab"] as ("farm" | "lab")[]) {
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
  unread?: boolean;
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
    const reads = await getNotificationReads(userId);
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
      unread: !reads.has(`dex:${r.breedId}`),
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
    const { desc, eq, or, sql } = await import("drizzle-orm");
    const reads = await getNotificationReads(userId);
    const mine = or(
      eq(friendships.userAId, userId),
      eq(friendships.userBId, userId),
    );
    // Return RECENT friendships (read + unread); flag those newer than the cursor.
    const rows = await db
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
      .where(mine)
      .orderBy(desc(friendships.createdAt))
      .limit(30);
    return rows.map((r) => ({
      ...r,
      unread: !reads.has(`friend:${r.id}`),
    }));
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
  unread?: boolean;
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
    const reads = await getNotificationReads(userId);
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
      unread: !reads.has(`news:${r.id}`),
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
): Promise<{ ok: boolean; resource?: ResourceKind; amount?: number }> {
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
    if (!n || !n.active) return { ok: false };
    // CTA type → which resource is granted. claim_egg → eggs, claim_sci → science.
    const resource: ResourceKind | null =
      n.ctaType === "claim_egg" ? "egg" : n.ctaType === "claim_sci" ? "sci" : null;
    if (!resource) return { ok: false };
    const claimed = await db
      .insert(newsClaims)
      .values({ newsId, userId })
      .onConflictDoNothing()
      .returning({ newsId: newsClaims.newsId });
    if (claimed.length === 0) return { ok: false }; // already claimed
    const amount = n.ctaAmount ?? 0;
    if (amount > 0) await grantResource(userId, resource, amount, "news");
    return { ok: true, resource, amount };
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
        collectionPublic: users.collectionPublic,
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

// Active roosters for MANY owners in ONE query (batched), newest first. Used by
// the friends page to preview each friend's public collection without N queries.
// Same "active only" visibility as getRoostrs (listed/working/… stay hidden).
export async function getRoostrsForOwners(ownerIds: number[]) {
  if (!process.env.DATABASE_URL || ownerIds.length === 0) return [];
  try {
    const { db } = await import("@/db");
    const { roostrs } = await import("@/db/schema");
    const { and, desc, eq, inArray } = await import("drizzle-orm");
    return await db
      .select()
      .from(roostrs)
      .where(and(inArray(roostrs.ownerId, ownerIds), eq(roostrs.status, "active")))
      .orderBy(desc(roostrs.createdAt));
  } catch (e) {
    console.error("getRoostrsForOwners failed:", e);
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

export interface GlobalStats {
  players: number;
  roostrsHatched: number;
  coinsEarned: number;
  sciEarned: number;
  battles: number;
}

// Aggregate, project-wide promo numbers for the guest landing page. Lifetime totals
// (earned = positive ledger rows). Best-effort: any failure returns zeros.
export async function getGlobalStats(): Promise<GlobalStats> {
  const empty: GlobalStats = {
    players: 0,
    roostrsHatched: 0,
    coinsEarned: 0,
    sciEarned: 0,
    battles: 0,
  };
  if (!process.env.DATABASE_URL) return empty;
  try {
    const { db } = await import("@/db");
    const { users, roostrs, resourceTxns } = await import("@/db/schema");
    const { and, eq, gt, sql, notInArray } = await import("drizzle-orm");
    const { ADMIN_IDS } = await import("@/lib/admin");

    // Exclude admin/dev accounts — their faucet grants would skew the public promo
    // totals. (notInArray on an empty list is a no-op guard.)
    const adminIds = [...ADMIN_IDS];
    const notAdmin = (col: Parameters<typeof notInArray>[0]) =>
      adminIds.length ? notInArray(col, adminIds) : undefined;

    const [p] = await db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .where(notAdmin(users.id));
    const [h] = await db
      .select({ n: sql<number>`count(*)` })
      .from(roostrs)
      .where(and(eq(roostrs.origin, "hatch"), notAdmin(roostrs.ownerId)));
    const earned = (resource: "coin" | "sci") =>
      db
        .select({ s: sql<number>`coalesce(sum(${resourceTxns.amount}), 0)` })
        .from(resourceTxns)
        .where(
          and(
            eq(resourceTxns.resource, resource),
            gt(resourceTxns.amount, 0),
            notAdmin(resourceTxns.userId),
          ),
        );
    const [coin] = await earned("coin");
    const [sci] = await earned("sci");
    // Each battle is recorded on both participants → halve the summed records.
    const [b] = await db
      .select({
        s: sql<number>`coalesce(sum(${users.wins} + ${users.losses} + ${users.draws}), 0)`,
      })
      .from(users)
      .where(notAdmin(users.id));

    return {
      players: Number(p?.n ?? 0),
      roostrsHatched: Number(h?.n ?? 0),
      coinsEarned: Number(coin?.s ?? 0),
      sciEarned: Number(sci?.s ?? 0),
      battles: Math.floor(Number(b?.s ?? 0) / 2),
    };
  } catch (e) {
    console.error("getGlobalStats failed:", e);
    return empty;
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
// Live base-defense value = Σ Crow of the roosters currently on watch. No accrual —
// it exists only while guards are assigned to the defense station.
export async function getDefenseValue(userId: number): Promise<number> {
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return 0;
  try {
    const { hydrateRoostr } = await import("@/lib/roostr");
    const view = await getStationView(userId, "defense");
    return view.workers.reduce(
      (s, r) => s + (hydrateRoostr(r).stats.Crow ?? 0),
      0,
    );
  } catch (e) {
    console.error("getDefenseValue failed:", e);
    return 0;
  }
}

// One consolidated read for the resource HUD: base defense (Σ Crow) + the live
// sci/day (lab) and egg/day (farm) income rates. Single stations query + a single
// batched roostr fetch — cheaper than three getStationView round-trips per page.
export async function getHudStationStats(
  userId: number,
): Promise<{ defenseValue: number; sciPerDay: number; eggPerDay: number }> {
  const zero = { defenseValue: 0, sciPerDay: 0, eggPerDay: 0 };
  if (!process.env.DATABASE_URL || !Number.isFinite(userId)) return zero;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    const rows = await db
      .select()
      .from(workStations)
      .where(eq(workStations.userId, userId));
    if (rows.length === 0) return zero;
    const byId = new Map(
      (await roostrsByIds(rows.flatMap((r) => r.roostrIds))).map((r) => [
        r.id,
        r,
      ]),
    );
    const out = { ...zero };
    for (const row of rows) {
      const kind = row.kind as StationKind;
      const def = STATIONS[kind];
      if (!def) continue;
      const workers = row.roostrIds
        .map((id) => byId.get(id))
        .filter((r): r is NonNullable<typeof r> => !!r);
      const total = totalStat(workers, kind);
      if (kind === "lab") out.sciPerDay = def.ratePerDay(total, workers.length);
      else if (kind === "farm")
        out.eggPerDay = def.ratePerDay(total, workers.length);
      else if (kind === "defense") out.defenseValue = total; // Σ Crow
    }
    return out;
  } catch (e) {
    console.error("getHudStationStats failed:", e);
    return zero;
  }
}

export async function getStationView(userId: number, kind: StationKind) {
  const empty = {
    slotsOwned: STATIONS[kind].baseSlots,
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
    const slots = st?.slotsOwned ?? STATIONS[kind].baseSlots;
    if (ids.includes(roostrId)) return { ok: true };
    if (ids.length >= slots) return { ok: false, error: "full" };

    if (st) {
      await db
        .update(workStations)
        .set({ roostrIds: [...ids, roostrId] })
        .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)));
    } else {
      // Seed slotsOwned from the kind's base (defense = 1, not the column default 2).
      await db.insert(workStations).values({
        userId,
        kind,
        roostrIds: [roostrId],
        slotsOwned: STATIONS[kind].baseSlots,
      });
    }
    // Lock the bird as the AUTHORITY for "is it working": CAS status active→working,
    // RETURNING the row. A bird can join only ONE station — two concurrent assigns
    // (e.g. defense + lab on the same bird) both append above, but only ONE wins this
    // CAS; the loser sees 0 rows and ROLLS BACK its append, so the bird is never
    // double-counted across stations. (neon-http has no interactive tx → CAS + undo.)
    const locked = await db
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
      )
      .returning({ id: roostrs.id });
    if (locked.length === 0) {
      // Lost the lock (bird grabbed by another station, or no longer active) — undo
      // our append so it doesn't linger in this station's roster while owned elsewhere.
      await db
        .update(workStations)
        .set({ roostrIds: ids })
        .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)));
      return { ok: false, error: "locked" };
    }
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

// +1 worker-slot unlock, priced by a per-station ladder (slot 3 = 100, slot 4 =
// 500), paid in the station's `slotCost` resource (farm = coins, lab = science).
// Spend is CAS (atomic, returns null if short); the slot bump is guarded against a
// concurrent double-buy and refunds if it loses the race.
export async function buyStationSlot(
  userId: number,
  kind: StationKind,
): Promise<BuySlotResult> {
  if (!process.env.DATABASE_URL) return { ok: false, error: "db" };
  const { resource } = STATIONS[kind].slotCost;
  try {
    const { db } = await import("@/db");
    const { workStations } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const [st] = await db
      .select()
      .from(workStations)
      .where(and(eq(workStations.userId, userId), eq(workStations.kind, kind)))
      .limit(1);
    const current = st?.slotsOwned ?? STATIONS[kind].baseSlots;
    const price = nextSlotPrice(kind, current);
    if (price === null || current >= maxSlots(kind))
      return { ok: false, error: "maxed" };

    // Charge first (atomic CAS on balance).
    const bal = await spendResource(userId, resource, price, "slot", kind);
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
      await grantResource(userId, resource, price, "refund", kind);
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

// Lazy sweep (no cron): flip any market listing past its expiresAt to "expired"
// and return its bird from "listed" limbo back to "active" (owner never changed
// while listed). Mirrors expireStaleGifts. Idempotent + cheap when nothing's
// stale. Called from the market/collection/detail surfaces so state is fresh.
export async function expireStaleListings(): Promise<void> {
  if (!process.env.DATABASE_URL) return;
  try {
    const { db } = await import("@/db");
    const { listings, roostrs } = await import("@/db/schema");
    const { and, eq, inArray, lt } = await import("drizzle-orm");
    const stale = await db
      .select({ id: listings.id, roostrId: listings.roostrId })
      .from(listings)
      .where(and(eq(listings.status, "active"), lt(listings.expiresAt, new Date())));
    if (stale.length === 0) return;
    const ids = stale.map((s) => s.id);
    const roostrIds = stale.map((s) => s.roostrId);
    await db
      .update(listings)
      .set({ status: "expired", closedAt: new Date() })
      .where(inArray(listings.id, ids));
    // Only unlock birds still parked in "listed" (don't clobber another status).
    await db
      .update(roostrs)
      .set({ status: "active" })
      .where(and(inArray(roostrs.id, roostrIds), eq(roostrs.status, "listed")));
  } catch (e) {
    console.error("expireStaleListings failed:", e);
  }
}

// List an ACTIVE bird the caller owns on the market. Owner + status are enforced
// by CAS (active → listed); the price is re-clamped SERVER-SIDE to the bird's
// sellPriceBounds (never trust the client). On a lost CAS or a failed insert the
// lock is reverted so the bird can't orphan in "listed" limbo. Returns the new
// listing id or a reason.
export async function createListing(
  roostrId: string,
  sellerId: number,
  price: number,
): Promise<{ ok: boolean; reason?: string; listingId?: string }> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  if (!Number.isInteger(price) || price <= 0) return { ok: false, reason: "price" };
  try {
    const { db } = await import("@/db");
    const { listings, roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const { hydrateRoostr, sellPriceBounds, LISTING_TTL_MS } = await import("@/lib/roostr");
    // Server-side price clamp: recompute the allowed band from the DB row so a
    // tampered client price can't list at 0 / negative / above the hard cap.
    const row = await getRoostr(roostrId);
    if (!row) return { ok: false, reason: "notfound" };
    if (row.ownerId !== sellerId) return { ok: false, reason: "owner" };
    if (row.status !== "active") return { ok: false, reason: "unavailable" };
    const h = hydrateRoostr(row);
    const { min, max } = sellPriceBounds(h.genes, h.geneLevels, h.weightClass);
    if (price < min || price > max) return { ok: false, reason: "price" };

    // CAS lock: only an ACTIVE bird still owned by the seller flips to "listed".
    const locked = await db
      .update(roostrs)
      .set({ status: "listed" })
      .where(
        and(
          eq(roostrs.id, roostrId),
          eq(roostrs.ownerId, sellerId),
          eq(roostrs.status, "active"),
        ),
      )
      .returning({ id: roostrs.id });
    if (locked.length === 0) return { ok: false, reason: "unavailable" };
    // Bird now locked to "listed"; if the insert fails, undo the lock.
    try {
      const [l] = await db
        .insert(listings)
        .values({
          roostrId,
          sellerId,
          price,
          expiresAt: new Date(Date.now() + LISTING_TTL_MS),
        })
        .returning({ id: listings.id });
      return { ok: true, listingId: l?.id };
    } catch (insErr) {
      await db
        .update(roostrs)
        .set({ status: "active" })
        .where(and(eq(roostrs.id, roostrId), eq(roostrs.status, "listed")));
      console.error("createListing insert failed, lock reverted:", insErr);
      return { ok: false, reason: "error" };
    }
  } catch (e) {
    console.error("createListing failed:", e);
    return { ok: false, reason: "error" };
  }
}

// Cancel one's own ACTIVE listing early: CAS the listing to "cancelled" and
// return the bird from "listed" to "active". Seller-guarded via sellerId in the
// CAS. Returns ok even if already gone (idempotent-ish → reports notfound).
export async function cancelListing(
  listingId: string,
  sellerId: number,
): Promise<{ ok: boolean; reason?: string }> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  try {
    const { db } = await import("@/db");
    const { listings, roostrs } = await import("@/db/schema");
    const { and, eq } = await import("drizzle-orm");
    const closed = await db
      .update(listings)
      .set({ status: "cancelled", closedAt: new Date() })
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.sellerId, sellerId),
          eq(listings.status, "active"),
        ),
      )
      .returning({ roostrId: listings.roostrId });
    if (closed.length === 0) return { ok: false, reason: "notfound" };
    await db
      .update(roostrs)
      .set({ status: "active" })
      .where(and(eq(roostrs.id, closed[0].roostrId), eq(roostrs.status, "listed")));
    return { ok: true };
  } catch (e) {
    console.error("cancelListing failed:", e);
    return { ok: false, reason: "error" };
  }
}

// Buy a live listing. Single-winner CAS on the listing row (status active→sold)
// decides who gets the bird, so two concurrent buyers can't both win. Then:
// charge the buyer, pay the seller, move ownership, write the market transfer
// (with price), unlock the bird, and grant the buyer the dex unlock. On an
// insufficient-coin buyer the sale is fully rolled back (listing → active, bird
// stays listed). Guards: can't buy your own bird, listing must be live/unexpired.
export async function buyListing(
  listingId: string,
  buyerId: number,
): Promise<{ ok: boolean; reason?: string; price?: number }> {
  if (!process.env.DATABASE_URL) return { ok: false, reason: "nodb" };
  try {
    const { db } = await import("@/db");
    const { listings, roostrs } = await import("@/db/schema");
    const { and, eq, gt } = await import("drizzle-orm");
    // Read the listing (live + unexpired) and pre-check the self-buy guard before
    // we claim it, so we don't needlessly lock a listing we'll just release.
    const [pre] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.status, "active")))
      .limit(1);
    if (!pre) return { ok: false, reason: "gone" };
    if (pre.expiresAt <= new Date()) return { ok: false, reason: "expired" };
    if (pre.sellerId === buyerId) return { ok: false, reason: "self" };

    // Single-winner CAS: claim the listing. Only one concurrent buyer flips it.
    const claimed = await db
      .update(listings)
      .set({ status: "sold", buyerId, closedAt: new Date() })
      .where(
        and(
          eq(listings.id, listingId),
          eq(listings.status, "active"),
          gt(listings.expiresAt, new Date()),
        ),
      )
      .returning({ roostrId: listings.roostrId, sellerId: listings.sellerId, price: listings.price });
    if (claimed.length === 0) return { ok: false, reason: "gone" };
    const { roostrId, sellerId, price } = claimed[0];

    // Charge the buyer. If they can't afford it, roll the listing back to active.
    const paid = await spendResource(buyerId, "coin", price, "market", roostrId);
    if (paid === null) {
      await db
        .update(listings)
        .set({ status: "active", buyerId: null, closedAt: null })
        .where(and(eq(listings.id, listingId), eq(listings.status, "sold")));
      return { ok: false, reason: "coins" };
    }
    // Pay the seller (ledger row kind "market_sale" → drives sale achievements).
    await grantResource(sellerId, "coin", price, "market_sale", roostrId);
    // Move ownership + unlock the bird (guard on "listed" so we don't clobber).
    await db
      .update(roostrs)
      .set({ ownerId: buyerId, status: "active" })
      .where(and(eq(roostrs.id, roostrId), eq(roostrs.status, "listed")));
    // Provenance + buyer's dex unlock.
    await recordTransfer(roostrId, sellerId, buyerId, "market", price);
    const bought = await getRoostr(roostrId);
    if (bought) await recordDiscovery(buyerId, bought.breedId);
    return { ok: true, price };
  } catch (e) {
    console.error("buyListing failed:", e);
    return { ok: false, reason: "error" };
  }
}

// Current streak of consecutive UNSOLD listings for a bird — how many times in a
// row it was listed and expired (nobody bought), counting back from the latest
// closed listing until a "sold" breaks the streak. A cancel doesn't count as a
// sale but does end the visible attempt, so we count only "expired" and stop at
// the first "sold". Drives the per-bird "The Curse" achievement. Active (still
// live) listings aren't counted — the attempt isn't over yet.
export async function getUnsoldStreak(roostrId: string): Promise<number> {
  if (!process.env.DATABASE_URL) return 0;
  try {
    const { db } = await import("@/db");
    const { listings } = await import("@/db/schema");
    const { and, desc, eq, inArray } = await import("drizzle-orm");
    const closed = await db
      .select({ status: listings.status })
      .from(listings)
      .where(
        and(
          eq(listings.roostrId, roostrId),
          inArray(listings.status, ["expired", "sold"]),
        ),
      )
      .orderBy(desc(listings.closedAt));
    let streak = 0;
    for (const row of closed) {
      if (row.status === "sold") break; // a sale breaks the cursed streak
      streak++;
    }
    return streak;
  } catch (e) {
    console.error("getUnsoldStreak failed:", e);
    return 0;
  }
}

// The bird's current live listing (active + unexpired), if any. Powers the
// "cancel listing" affordance on the detail page. Null when not listed.
export async function getActiveListingForRoostr(
  roostrId: string,
): Promise<{ id: string; price: number; expiresAt: Date } | null> {
  if (!process.env.DATABASE_URL) return null;
  try {
    const { db } = await import("@/db");
    const { listings } = await import("@/db/schema");
    const { and, desc, eq, gt } = await import("drizzle-orm");
    const [l] = await db
      .select({ id: listings.id, price: listings.price, expiresAt: listings.expiresAt })
      .from(listings)
      .where(
        and(
          eq(listings.roostrId, roostrId),
          eq(listings.status, "active"),
          gt(listings.expiresAt, new Date()),
        ),
      )
      .orderBy(desc(listings.createdAt))
      .limit(1);
    return l ?? null;
  } catch (e) {
    console.error("getActiveListingForRoostr failed:", e);
    return null;
  }
}

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
