import {
  bigint,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// First-cut schema. Roostr columns mirror RolledRoostr (src/lib/roostr.ts).
// Battle / farm / expedition detail is kept in jsonb until those systems are
// fully designed — tighten once the rules settle.

export const users = pgTable("users", {
  id: bigint("id", { mode: "number" }).primaryKey(), // Telegram id
  username: text("username"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  photoUrl: text("photo_url"),
  languageCode: text("language_code"),
  coins: integer("coins").notNull().default(0),
  feathers: integer("feathers").notNull().default(0),
  tonAddress: text("ton_address"),
  lastHatchAt: timestamp("last_hatch_at", { withTimezone: true }), // daily hatch cooldown (off localStorage)
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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
  colors: jsonb("colors").$type<Record<string, string>>().notNull(),
  pattern: text("pattern").notNull(),
  role: text("role").notNull(),
  maxHealth: integer("max_health").notNull(),
  seed: integer("seed").notNull(),
  nickname: text("nickname"),
  origin: text("origin").notNull().default("hatch"), // hatch | evolution | event | ...
  // Lifecycle state. Recycling/selling sets a non-active status instead of
  // hard-deleting the row, so the rooster's history (and provenance below)
  // survives. breed_discoveries already assumes the dex unlock outlives the bird.
  status: text("status").notNull().default("active"), // active | recycled | listed | sold
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
  at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
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
