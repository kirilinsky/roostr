import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  type AnyPgColumn,
  uuid,
} from "drizzle-orm/pg-core";

// First-cut schema. Roostr columns mirror RolledRoostr (src/lib/roostr.ts).
// Battle / farm / expedition detail is kept in jsonb until those systems are
// fully designed — tighten once the rules settle.

export const users = pgTable(
  "users",
  {
    id: bigint("id", { mode: "number" }).primaryKey(), // Telegram id
    username: text("username"),
    firstName: text("first_name"),
    lastName: text("last_name"),
    photoUrl: text("photo_url"),
    languageCode: text("language_code"),
    coins: integer("coins").notNull().default(0),
    // Feathers = battle energy. Regenerate 1/hour up to `featherMax` (settled
    // lazily off `feathersAt`, the last-settle anchor). `featherMax` is a per-user
    // cap (default 10) that a shop upgrade can raise later. Spending battles will
    // settle current → store, reset the anchor; for now regen is display-only.
    feathers: integer("feathers").notNull().default(0),
    featherMax: integer("feather_max").notNull().default(10),
    feathersAt: timestamp("feathers_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    eggs: integer("eggs").notNull().default(0),
    // Lifetime egg-shop purchases → drives the escalating price. Authoritative
    // serialization point for the buy: incremented atomically inside buyShopEgg so
    // concurrent buys claim distinct price tiers (can't all pay the base price).
    eggsBought: integer("eggs_bought").notNull().default(0),
    sci: integer("sci").notNull().default(0), // science points (lab research)
    // Denormalized lifetime battle record (source of truth = the `battles` log).
    // Bumped on each resolve so profiles read W/L without a COUNT over battles.
    wins: integer("wins").notNull().default(0),
    losses: integer("losses").notNull().default(0),
    draws: integer("draws").notNull().default(0),
    // Privacy: when false, other users can't see this player's collection.
    collectionPublic: boolean("collection_public").notNull().default(true),
    referredById: bigint("referred_by_id", { mode: "number" }).references(
      (): AnyPgColumn => users.id,
      { onDelete: "set null" },
    ),
    referredAt: timestamp("referred_at", { withTimezone: true }),
    // Read-cursor for the notifications feed: anything newer than this is "unread"
    // and lights the HUD bell badge. Visiting /notifications bumps it to now.
    notificationsSeenAt: timestamp("notifications_seen_at", {
      withTimezone: true,
    }),
    tonAddress: text("ton_address"),
    // PvP raids: while set to a future time this player can't be targeted by
    // ANYONE (post-raid 24h immunity, .notes/RAIDS.md §Shields). New-player
    // immunity is derived from createdAt, not stored here.
    raidShieldUntil: timestamp("raid_shield_until", { withTimezone: true }),
    lastHatchAt: timestamp("last_hatch_at", { withTimezone: true }), // legacy/unused: hatching is egg-gated now (no cooldown)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("users_referred_by_id_idx").on(t.referredById)],
);

// Successful referral attribution: one row per invited account after signup.
// `users.referred_by_id` is the quick denormalized lookup; this table is the
// inviter-facing list and future reward attribution source.
export const referrals = pgTable(
  "referrals",
  {
    referrerId: bigint("referrer_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    refereeId: bigint("referee_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .primaryKey(),
    registeredAt: timestamp("registered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // Per-referee milestone reward flags (paid to the REFERRER once each, V17).
    // Signup reward fires at insert time (no flag needed). hatch-3 + first-battle
    // are gated by these so a milestone never double-pays.
    rewardedHatch3: boolean("rewarded_hatch3").notNull().default(false),
    rewardedFirstBattle: boolean("rewarded_first_battle")
      .notNull()
      .default(false),
  },
  (t) => [
    index("referrals_referrer_id_idx").on(t.referrerId),
  ],
);

// System / promo announcements (the notifications "News" feed). Global rows shown
// to everyone; "unread" is derived vs `users.notificationsSeenAt`. An optional CTA
// (`ctaType`, e.g. "claim_egg" + `ctaAmount`) is claimable ONCE per user — tracked
// in `news_claims`. Authored by an admin (see createNewsAction).
export const news = pgTable(
  "news",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Bilingual content (shown by the viewer's locale).
    titleEn: text("title_en").notNull(),
    titleRu: text("title_ru").notNull(),
    bodyEn: text("body_en").notNull(),
    bodyRu: text("body_ru").notNull(),
    link: text("link"), // optional CTA link (read more / go somewhere)
    ctaType: text("cta_type"), // null | "claim_egg" (extensible: claim_coin, …)
    ctaAmount: integer("cta_amount"), // reward amount for claim CTAs
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("news_created_at_idx").on(t.createdAt)],
);

// One row per (news, user) that claimed the CTA → idempotent claim-once.
export const newsClaims = pgTable(
  "news_claims",
  {
    newsId: uuid("news_id")
      .notNull()
      .references(() => news.id, { onDelete: "cascade" }),
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.newsId, t.userId] })],
);

// Per-item "read" marks for the notifications feed. Presence of a row = that
// specific item has been read by the user (clears it from the unread badge).
// `key` is "<source>:<id>" — news:<uuid> | ach:<achievementId> | dex:<breedId> |
// friend:<userId>. Replaces the old single read-cursor with per-message reads.
export const notificationReads = pgTable(
  "notification_reads",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    readAt: timestamp("read_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] })],
);

// Onboarding quests: one row per (user, quest) that CLAIMED its reward. Quest defs
// live in src/data/QUESTS.json; completion is derived from profile metrics, the
// reward is granted once via the ledger on claim (CAS on this PK). Linear chain:
// quest N unlocks when quest N-1 is claimed.
export const questClaims = pgTable(
  "quest_claims",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    questId: text("quest_id").notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.questId] })],
);

// Roostrdex completion rewards already granted (claim-once). `rewardKey` is
// "group:<groupId>" (all breeds of a group discovered) or "full" (the whole dex).
export const dexRewards = pgTable(
  "dex_rewards",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rewardKey: text("reward_key").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.rewardKey] })],
);

export const roostrs = pgTable("roostrs", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: bigint("owner_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Rolled composition (see rollRoostr):
  breedId: text("breed_id").notNull(),
  weightClassId: text("weight_class_id").notNull(),
  geneIds: jsonb("gene_ids").$type<string[]>().notNull(),
  // Gene upgrade levels (geneId -> level). Missing/empty = every gene at level 1.
  // This is the mutable progression on top of the immutable rolled DNA above.
  geneLevels: jsonb("gene_levels")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  // Synthetic genes spliced in at the lab (bought with science). Separate from the
  // rolled `geneIds` DNA above: these are purchased lab add-ons, max 2 per bird,
  // each pumps one skill with no debuff. Upgrade levels (later) will mirror
  // geneLevels. Empty = no synth genes.
  synthGeneIds: jsonb("synth_gene_ids")
    .$type<string[]>()
    .notNull()
    .default([]),
  // Synth-gene upgrade levels (synthGeneId -> level). Missing/empty = level 1.
  // Separate from geneLevels: synth-gene upgrades cost SCIENCE on a much steeper
  // curve (synthGeneUpgradeCost) than the coin-priced rolled-gene upgrades.
  synthGeneLevels: jsonb("synth_gene_levels")
    .$type<Record<string, number>>()
    .notNull()
    .default({}),
  // Health tracking. `currentHp` null = full/undamaged (the common case) — combat
  // (raids/battles) sets it below the computed maxHealth. While a bird is in the
  // hospital (meta.work.kind="hospital"), HP regenerates from `hpAt` at a rate set
  // by its Recovery skill; on discharge the healed value is written back.
  currentHp: integer("current_hp"),
  hpAt: timestamp("hp_at", { withTimezone: true }), // heal anchor while healing; null otherwise

  // LEGACY cosmetic columns (pre-V2 per-part colors). No longer written or read —
  // the look now lives in `meta.cosmetic` (V2). Kept nullable so old rows survive;
  // safe to drop later.
  colors: jsonb("colors"),
  pattern: text("pattern"),
  role: text("role").notNull(),
  maxHealth: integer("max_health").notNull(),
  seed: integer("seed").notNull(),
  nickname: text("nickname"),
  // Denormalized per-roostr battle record (source of truth = the `battles` log).
  // Bumped on resolve so cards/pages show W/L without counting battles each read.
  wins: integer("wins").notNull().default(0),
  losses: integer("losses").notNull().default(0),
  draws: integer("draws").notNull().default(0),
  origin: text("origin").notNull().default("hatch"), // hatch | evolution | event | ...
  // Lifecycle state. Recycling/selling sets a non-active status instead of
  // hard-deleting the row, so the rooster's history (and provenance below)
  // survives. breed_discoveries already assumes the dex unlock outlives the bird.
  status: text("status").notNull().default("active"), // active | working | raiding (party away on a raid, V14) | gifting | listed | sold | recycled | released (freed to the wild — ownerless limbo, excluded from all listings)
  // Forward catch-all for small, evolving per-rooster fields (achievements,
  // flags, aura cache, …). Add keys here WITHOUT a migration; promote to a typed
  // column once a field's shape is stable. Keep big/queried data in real columns.
  meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(), // = hatch/mint time
});

// Owner provenance — append-only ledger, one row per ownership change. The
// current owner stays denormalized on roostrs.ownerId (fast "whose is it");
// this table is the full chain of custody (for trades, gifts, market, NFT
// passport). Genesis row is written on hatch (fromUserId = null). We start
// collecting from the first hatch so there's never a backfill.
export const roostrTransfers = pgTable("roostr_transfers", {
  id: uuid("id").primaryKey().defaultRandom(),
  roostrId: uuid("roostr_id")
    .notNull()
    .references(() => roostrs.id, { onDelete: "cascade" }),
  // null = genesis (the bird was minted/hatched, no prior owner).
  fromUserId: bigint("from_user_id", { mode: "number" }).references(
    () => users.id,
    { onDelete: "set null" },
  ),
  // Nullable only so a user deletion can null it out (set null) while keeping
  // the history row; in practice every non-genesis transfer has a recipient.
  toUserId: bigint("to_user_id", { mode: "number" }).references(() => users.id, {
    onDelete: "set null",
  }),
  kind: text("kind").notNull(), // hatch | market | gift | trade | reward | ...
  // Sale price in coins for market transfers; null for hatch/gift/release/reward.
  // With `at`, two consecutive rows give each owner's hold duration AND the
  // buy/sell price — the full ownership-stats chain.
  price: integer("price"),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// Market listing — a fixed-price, 24h offer (NO bids). Lifecycle via `status`:
//   active  → live on the market until expiresAt
//   sold    → a buyer paid `price`; ownership moved to buyerId (writes a
//             roostr_transfers row with kind=market + price)
//   expired → 24h passed, nobody bought → the roostr returns to the seller
//   cancelled → seller pulled it early
// While active the roostr's own status is "listed". closedAt stamps the end.
export const listings = pgTable("listings", {
  id: uuid("id").primaryKey().defaultRandom(),
  roostrId: uuid("roostr_id")
    .notNull()
    .references(() => roostrs.id, { onDelete: "cascade" }),
  sellerId: bigint("seller_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  price: integer("price").notNull(),
  status: text("status").notNull().default("active"), // active | sold | expired | cancelled
  buyerId: bigint("buyer_id", { mode: "number" }).references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(), // createdAt + LISTING_TTL_HOURS (72h)
  closedAt: timestamp("closed_at", { withTimezone: true }), // sold / expired / cancelled
});

// Persisted Roostrdex unlocks — survives recycling/selling the roostr.
export const breedDiscoveries = pgTable(
  "breed_discoveries",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    breedId: text("breed_id").notNull(),
    discoveredAt: timestamp("discovered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.breedId] })],
);

// Resource movement ledger — the single source of truth for EVERY currency
// change (corn coins, science points, eggs, feathers). Append-only:
// grantResource/spendResource write a row here on each mutation. Derive
// "earned" (Σ positive), "spent" (Σ |negative|), and a full audit trail from it.
// `resource` tags which currency moved; amount is signed (+ earned, − spent);
// balanceAfter snapshots the post-op balance of THAT resource so the chain is
// self-auditing per currency.
export const resourceTxns = pgTable("resource_txns", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // coin | sci | egg | feather. Default 'coin' so adding this column to the
  // already-populated old coin_txns table backfills cleanly (no truncate);
  // every insert passes `resource` explicitly, so the default never actually fires.
  resource: text("resource").notNull().default("coin"),
  amount: integer("amount").notNull(), // + earned, − spent
  // hatch | battle | expedition | farm | upgrade | refund | market | gift | faucet | admin_grant | lab
  kind: text("kind").notNull(),
  ref: text("ref"), // optional reference id (roostrId, battleId, …)
  balanceAfter: integer("balance_after").notNull(), // balance of `resource` after this op
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// Synth-gene splice log — one row per gene successfully spliced into a bird
// (written by buySynthGeneAction AFTER the splice succeeds, so refunded/failed
// attempts never appear). Powers the "gene applied" entries in the notifications
// Lab tab. Append-only; unread = no per-item read row (key `synth:<id>`).
export const synthGeneEvents = pgTable("synth_gene_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roostrId: uuid("roostr_id")
    .notNull()
    .references(() => roostrs.id, { onDelete: "cascade" }),
  geneId: text("gene_id").notNull(),
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
});

// Release log — append-only, one row per time a bird is set free (a bird can be
// released more than once over its life, and by different owners after future
// re-adoption, so this is a history, not a column on roostrs). `userId` = who
// released it THAT time (roostrs.ownerId only keeps the latest owner). Time on the
// loose = (adoptedAt ?? now) − releasedAt; `adoptedAt` stays null while still free
// (set when the bird is re-owned — adoption is a future feature).
export const roostrReleases = pgTable("roostr_releases", {
  id: uuid("id").primaryKey().defaultRandom(),
  roostrId: uuid("roostr_id")
    .notNull()
    .references(() => roostrs.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  releasedAt: timestamp("released_at", { withTimezone: true }).notNull().defaultNow(),
  adoptedAt: timestamp("adopted_at", { withTimezone: true }),
});

// Hospital visit log — append-only, one row per admission. Powers hospital
// achievements: profile "admitted a bird" / "fully healed N", rooster "visited N
// times" / "nine lives" (admitted at rock-bottom HP and fully healed). Closed on
// discharge (dischargedAt + healedFull set); open while the bird is still healing.
export const roostrHospitalVisits = pgTable("roostr_hospital_visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  roostrId: uuid("roostr_id")
    .notNull()
    .references(() => roostrs.id, { onDelete: "cascade" }),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  admitHp: integer("admit_hp").notNull(), // HP at admission (1 = near-death)
  admittedAt: timestamp("admitted_at", { withTimezone: true }).notNull().defaultNow(),
  dischargedAt: timestamp("discharged_at", { withTimezone: true }), // null = still healing
  healedFull: boolean("healed_full").notNull().default(false), // reached max HP on discharge
  // HP at discharge (null while healing / for legacy rows). With admitHp this gives
  // the visit's healed amount → the per-bird "total HP restored" achievement metric.
  dischargeHp: integer("discharge_hp"),
});

export const battles = pgTable("battles", {
  id: uuid("id").primaryKey().defaultRandom(),
  attackerUserId: bigint("attacker_user_id", { mode: "number" }).references(
    () => users.id,
    { onDelete: "set null" },
  ),
  defenderUserId: bigint("defender_user_id", { mode: "number" }).references(
    () => users.id,
    { onDelete: "set null" },
  ),
  attackerRoostrId: uuid("attacker_roostr_id").references(() => roostrs.id, {
    onDelete: "set null",
  }),
  defenderRoostrId: uuid("defender_roostr_id").references(() => roostrs.id, {
    onDelete: "set null",
  }),
  winnerRoostrId: uuid("winner_roostr_id").references(() => roostrs.id, {
    onDelete: "set null",
  }),
  log: jsonb("log").$type<unknown>(), // round-by-round, shape TBD
  coinsReward: integer("coins_reward").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Idle "send a roostr out to earn". Farm and expeditions share this shape but
// stay separate tables (different cooldowns/rewards/UX).
export const expeditions = pgTable("expeditions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roostrId: uuid("roostr_id")
    .notNull()
    .references(() => roostrs.id, { onDelete: "cascade" }),
  kind: text("kind").notNull(), // expedition type / region
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"), // active | claimed | cancelled
  reward: jsonb("reward").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Raid missions ("Coop & Dagger", .notes/RAIDS.md) — append-only, one row per
// launched raid. Contest inputs are SNAPSHOTTED at launch (raidPower/defense) so a
// target changing their Watch mid-flight doesn't rewrite an in-progress raid.
// Phase 2: bot targets only (botId set, defenderUserId null). Phase 3 (PvP) will
// set defenderUserId instead. Resolve is a manual "Collect" after endsAt.
export const raids = pgTable("raids", {
  id: uuid("id").primaryKey().defaultRandom(),
  attackerUserId: bigint("attacker_user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  // Exactly one of (defenderUserId, botId) is set — bot raids have no victim row.
  defenderUserId: bigint("defender_user_id", { mode: "number" }).references(
    () => users.id,
    { onDelete: "set null" },
  ),
  botId: text("bot_id"),
  partyRoostrIds: jsonb("party_roostr_ids").$type<string[]>().notNull(),
  // Launch-time snapshots (the contest is decided by these, not live values).
  raidPowerSnapshot: integer("raid_power_snapshot").notNull(), // Σ party Stealth
  defenseSnapshot: integer("defense_snapshot").notNull(), // target Watch (Σ Crow)
  luckSnapshot: integer("luck_snapshot").notNull(), // Σ party Luck → loot size
  targetPool: integer("target_pool").notNull(), // coins grabbable at launch
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"), // active | resolved
  // Resolution outcome (null until resolved).
  success: boolean("success"),
  lootCoins: integer("loot_coins"),
  lootEggs: integer("loot_eggs"), // faucet egg drop (never stolen from a victim)
  wasConsolation: boolean("was_consolation"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// Mutual friendship, one row per pair. Stored canonically (userAId < userBId)
// so a pair can't be duplicated. createdAt = when the friendship started.
export const friendships = pgTable(
  "friendships",
  {
    userAId: bigint("user_a_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: bigint("user_b_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userAId, t.userBId] })],
);

// Pending friend requests (directed): `fromUserId` asked `toUserId` to be friends.
// Accept → delete the row + write a `friendships` row; decline → just delete it.
// PK on the directed pair prevents duplicate requests; index for the recipient's
// incoming list (the notifications feed).
export const friendRequests = pgTable(
  "friend_requests",
  {
    fromUserId: bigint("from_user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: bigint("to_user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.fromUserId, t.toUserId] }),
    index("friend_requests_to_user_id_idx").on(t.toUserId),
  ],
);

// Rooster gifts (directed, accept/decline). Sender gifts an ACTIVE bird to a
// friend → the bird locks (`roostrs.status="gifting"`) and a PENDING row is
// written here. Recipient ACCEPTS (owner changes + a `roostr_transfers` gift row
// + `meta.gifted`) or DECLINES (bird returns to sender unchanged + `meta.giftRejected`).
// One pending gift per bird at a time (enforced by the lock). Status:
// pending | accepted | declined | cancelled.
export const gifts = pgTable(
  "gifts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roostrId: uuid("roostr_id")
      .notNull()
      .references(() => roostrs.id, { onDelete: "cascade" }),
    fromUserId: bigint("from_user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    toUserId: bigint("to_user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }), // accept/decline time
  },
  (t) => [
    index("gifts_to_user_id_idx").on(t.toUserId),
    index("gifts_from_user_id_idx").on(t.fromUserId),
    index("gifts_roostr_id_idx").on(t.roostrId),
  ],
);

// Work stations — the shared accrual engine's persistent state (one row per
// user × station kind: lab, farm, …). See src/lib/stations.ts. A rooster placed
// here gets roostrs.status="working" (locked from the roster/pickers). Accrual is
// time-in-service: `pending` is the buffered resource (incl. fraction), settled
// (pending += elapsed × rate) on every worker-set change + claim. `lastSettleAt`
// is the integration anchor. Claim moves floor(pending) to the wallet (ledger).
export const workStations = pgTable(
  "work_stations",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(), // lab | farm | ...
    roostrIds: jsonb("roostr_ids").$type<string[]>().notNull().default([]),
    slotsOwned: integer("slots_owned").notNull().default(2),
    pending: doublePrecision("pending").notNull().default(0), // buffered resource
    lastSettleAt: timestamp("last_settle_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.kind] })],
);

// Persisted achievement unlocks — presence = unlocked, permanently (an unlock
// outlives a metric dropping back below its threshold). One row per
// (user, achievement); `unlockedAt` stamps when it was first earned. The unlock
// sync inserts with onConflictDoNothing, so it's safe to re-run every page load
// and `returning()` yields exactly the newly-earned ones (→ fire a toast once).
// `scope` future-proofs per-rooster achievements (profile only for now).
export const achievementUnlocks = pgTable(
  "achievement_unlocks",
  {
    userId: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    achievementId: text("achievement_id").notNull(),
    scope: text("scope").notNull().default("profile"), // profile | rooster
    // For rooster-scope unlocks: the bird that triggered it → notification links
    // there. Null for profile scope (or legacy rows). set-null so the unlock
    // survives if the bird is later released/deleted.
    roostrId: uuid("roostr_id").references(() => roostrs.id, {
      onDelete: "set null",
    }),
    unlockedAt: timestamp("unlocked_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.achievementId] })],
);

export const farmSessions = pgTable("farm_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  roostrId: uuid("roostr_id").references(() => roostrs.id, {
    onDelete: "set null",
  }),
  plot: integer("plot").notNull().default(0), // plot index
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
  status: text("status").notNull().default("active"), // active | claimed
  yieldReward: jsonb("yield").$type<unknown>(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
