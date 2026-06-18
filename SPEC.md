# Roostr — SPEC

Main SDD spec. Invariants (§V) bind all work. Product detail: `.notes/NEXTGEN-SPEC.md`.
Status legend: `.` todo · `~` wip · `x` done.

## §G — Goal

Telegram-auth collectible roosters. Hatch common rooster w/ unique gene combo → collect, upgrade,
arena, market; mint TON NFT later. Premium look via shared design system.

## §C — Constraints

- Stack: Next.js 15 (App Router) · MUI v6 · TS · i18n en/ru. Host: Vercel.
- DB: **Neon** (serverless Postgres) + **Drizzle ORM**, layer in `src/db/`. Picked for free-no-card +
  relational data + Stars ledgers later. Pages still on localStorage until migrated (→ T7).
- All UI on design system → see V1.
- Auth = Telegram `initData` → session JWT. No passwords.
- Code comments English-only.

## §I — Interfaces

- Routes: `/incubator` `/collection` `/roostrdex` `/market` `/arena` `/farm` `/friends` `/bank`
  `/about` `/debug` `/support` `/settings` `/profile` · `/[telegramid]` (public profile by id).
- API: `POST /api/auth/telegram` · `POST /api/auth/logout`.
- Design tokens: `src/theme.ts` (single MUI theme).
- i18n dicts: `src/i18n/dictionaries.ts` (en+ru).
- Game data (`src/data/`): `BREEDS.json`, `SKILLS.json` (12 stats incl Stealth + Fertility),
  `GENES.json` (26; 3/family, Work has 5 incl 2 Fertility), `RELATIONS.json` (families↔skills↔roles,
  archetypes incl Thief, weight classes w/ statMods), `COSMETICS.json` (colors
  w/ fixed hex + per-color drop `weight` — exotics rare; + patterns). Genes + colors use bilingual
  `name {en,ru}` (name.en = canonical id, matches breed `geneAffinities` keys + `COLOR_HEX`).
  `roostr.ts`/`breeds.ts` read these — see V11.
- Hatch lib: `rollRoostr() → RolledRoostr` in `src/lib/roostr.ts`.
- Shared UI: `AppShell` · `StubPage` · `RoostrCard`.
- DB: `src/db/schema.ts` (users, roostrs, breed_discoveries, battles, expeditions, farm_sessions,
  friendships) +
  `src/db/index.ts` (Neon+Drizzle client). Scripts `db:generate|migrate|push|studio`. Env `DATABASE_URL`.

## §V — Invariants

- V1 — DESIGN SYSTEM = single source of truth for all UI. Every edit + feature built on it.
  Source `src/theme.ts` (one MUI theme "Neo-Arcade, Day Mode": palette w/ augmented `tertiary`
  `neutral`, `borderRadius`, headline/body font vars, component defaults). Use theme tokens + MUI
  components. No hardcoded color/space/radius/font in `sx`. New token/color/variant → extend
  `theme.ts` (augment custom palette there), then use — never inline ad-hoc. Reuse `AppShell`
  `StubPage` `RoostrCard`. User text → i18n dicts (en+ru). Visual not expressible by tokens =
  theme change FIRST, then usage. No drift between code + system.
- V2 — Every roostr hatches COMMON. Never born rare/legendary. Unique = combination only
  (breed + weight + colors + pattern + 2-4 genes). Power from прокачка, not egg. [.notes/GENE-MODIFIERS.md]
- V3 — Roostr has 1-4 key genes, weighted hard to 2 (~99.7%): 3 uncommon (~0.3%), 1 and 4 both
  super-rare (~1/50000 each). `GENE_COUNT_WEIGHTS` in `lib/roostr.ts` sums to 100000 = direct odds.
- V4 — Color/pattern = cosmetic only. No battle bonus (avoid "right color for meta").
- V5 — Daily hatch: 1 free per 24h cooldown. Boost = pay currency to skip wait.
- V6 — Code comments English-only.
- V7 — Debug/admin features gated by Telegram-id allowlist (`src/lib/admin.ts`, default `339784494`).
  `/debug` SERVER-gated (redirect non-admins, not just hidden nav). Admin-only UI (debug nav,
  roostrdex "reveal") hidden otherwise. Client admin flag = `AdminProvider`, sourced from server session.
- V8 — Dev fake-auth (`/api/auth/dev`, `DevLoginButtons`, JWT dev-secret fallback) is DEV-ONLY:
  ALL disabled when `NODE_ENV=production` (endpoint 404s, buttons render null, prod still needs real
  `JWT_SECRET`). Used to test admin vs non-admin locally without real Telegram. Dev login upserts
  with `overwrite:false` (insert-if-absent) so the fake admin can't clobber the real Telegram
  profile sharing id 339784494; real Telegram login upserts with `overwrite:true`.
- V9 — Each breed has exactly ONE fixed innate trait (buff/debuff), grounded in look/habitat/
  character, NOT upgradeable. Lives in `BREEDS.json` `trait` (`effects` = signed stat mods for the
  future battle sim). Distinct from genes (genes = upgrade branches; trait = permanent identity).
- V10 — Logged-in-only routes are SERVER-gated in `src/middleware.ts` (guests redirect → `/`):
  incubator, collection, roostrdex, market, arena, farm, friends, bank, settings, profile. Public:
  `/`, `/about`, `/support`, `/[telegramid]`. `/debug` gated separately by admin (V7). Sidebar
  visibility (layout.tsx) mirrors this gate.
- V11 — `src/data/*.json` is the single source of truth for game data (breeds, skills, genes,
  relations, cosmetics). Code reads/maps these; do NOT hardcode rosters or color hexes in `.ts`.
  Cosmetic colors are fixed (name = id, hex pinned) but the palette is broad on purpose.
- V12 — A roostr IS its "DNA passport" = `RolledRoostr` (breed, weight, colors, pattern, genes,
  stats, maxHealth, role, trait, seed). Stats derive: `BASE_STAT + Σ(geneLevel × statMods)`;
  leveling a gene scales its buffs AND debuffs (balance). Upgrade cost `round(10×1.6^(L-1))`, cap
  `GENE_MAX_LEVEL=10`. Logic in `roostr.ts` (`computeStats`/`computeMaxHealth`/`geneUpgradeCost`),
  not hardcoded per-screen. Overall level = TIER (D<C<B<A<S<R<X, thresholds in `RELATIONS.json`
  `tiers`) from `computeRating` = Σ stats + maxHealth — monotonic (debuffed stats floor at 1, so
  upgrades only add). No birth rarity (V2). Each gene has a sequential `no` = its DNA passport code.

## §T — Tasks

| id | status | task | cites |
|----|--------|------|-------|
| T1 | x | design system theme | V1 |
| T2 | x | Telegram auth + session | I.api |
| T3 | x | hatch model: breed/weight/genes/colors, always common | V2,V3,V4 |
| T4 | x | incubator page: daily hatch + boost | V5,V1 |
| T5 | x | debug hatch page shows real stats | V2,V1 |
| T6 | . | collection: persist + list hatched roostrs | V1 |
| T7 | . | server-authoritative hatch + cooldown (move off localStorage) | V5 |
| T8 | . | market / arena real screens | V1 |
| T9 | x | roostrdex bestiary: breeds from BREEDS.json, discovery on hatch | V1 |
| T10 | x | admin gating: id allowlist, /debug server-gate, roostrdex reveal | V7 |
| T11 | x | dev fake-auth: admin/user/guest sidebar buttons, dev-only endpoint | V8 |
| T12 | x | per-breed innate trait (buff/debuff) in BREEDS.json + dex/hatch card | V9 |
| T13 | x | DB scaffold: Neon+Drizzle, schema (users/roostrs/battles/farm/expeditions/dex) | C |
| T14 | x | wire DB: upsert users row on login (Telegram + dev), best-effort | C |
| T15 | . | server hatch: cooldown + persist roostr + dex discovery (off localStorage) | C,V5 |
| T16 | . | roostrdex + collection read from DB | C |
| T17 | x | friends page + share-profile link (clipboard) + public profile /[telegramid] | C |
| T18 | x | friendships: add/remove on profile, since date, friends list on /friends | C |
| T20 | x | extract game data to JSON: SKILLS, GENES, RELATIONS, COSMETICS (source of truth) | V11 |
| T21 | x | genes to 3/family (21); fill stat gaps (Luck/Accuracy native), buff+debuff mix | C |
| T22 | x | gene leveling model (stats from levels, cost curve) + debug upgrade lab (GeneLab) | V12 |
| T24 | x | tier ladder (D..X) from rating + sequential gene `no`; card shows tier not rarity | V12 |
| T25 | x | Stealth stat: 3 genes + Stealth family + Thief archetype; weight statMods (Huge -Stealth) | V12 |
| T26 | . | thieving mode (uses Stealth) | C |
| T23 | . | persist gene levels + real coin spend on upgrade (off mock/localStorage) | C,V12 |
| T19 | x | middleware: server-side guest gate for logged-in-only routes | V10 |

## §B — Bugs

| id | date | cause | fix |
|----|------|-------|-----|
