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
- V3 — Roostr has 2-4 key genes. Not fewer (too poor), not more (too universal).
- V4 — Color/pattern = cosmetic only. No battle bonus (avoid "right color for meta").
- V5 — Daily hatch: 1 free per 24h cooldown. Boost = pay currency to skip wait.
- V6 — Code comments English-only.
- V7 — Debug/admin features gated by Telegram-id allowlist (`src/lib/admin.ts`, default `339784494`).
  `/debug` SERVER-gated (redirect non-admins, not just hidden nav). Admin-only UI (debug nav,
  roostrdex "reveal") hidden otherwise. Client admin flag = `AdminProvider`, sourced from server session.
- V8 — Dev fake-auth (`/api/auth/dev`, `DevLoginButtons`, JWT dev-secret fallback) is DEV-ONLY:
  ALL disabled when `NODE_ENV=production` (endpoint 404s, buttons render null, prod still needs real
  `JWT_SECRET`). Used to test admin vs non-admin locally without real Telegram.
- V9 — Each breed has exactly ONE fixed innate trait (buff/debuff), grounded in look/habitat/
  character, NOT upgradeable. Lives in `BREEDS.json` `trait` (`effects` = signed stat mods for the
  future battle sim). Distinct from genes (genes = upgrade branches; trait = permanent identity).

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
| T18 | x | friendships table + add/remove friend on public profile + since date | C |

## §B — Bugs

| id | date | cause | fix |
|----|------|-------|-----|
