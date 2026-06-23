# Roostr

Collect, hatch and raise quirky roosters. A Telegram-authed web game built with
Next.js — work in progress.

> **Status:** early development. Core systems are landing; some screens are still
> placeholders and some state is client-side until the DB wiring is finished.

## Stack

- **Next.js 15** (App Router) · **React 19** · **TypeScript**
- **MUI v6** — all UI flows from one design system (`src/theme.ts`)
- **i18n** (en / ru), cookie-based locale
- **Neon** (serverless Postgres) + **Drizzle ORM**
- **Auth:** Telegram Web Login / OIDC → stateless JWT session (httpOnly cookie)

## Features

- **Incubator** — one free hatch per day (24h cooldown) + pay-to-skip boost.
- **Hatch model** — every roostr hatches *Common*; what's unique is the combo:
  breed + weight class + 2–4 key genes + cosmetic colors/pattern + one innate
  breed trait (buff/debuff). Power comes from upgrades, not the egg.
- **Roostrdex** — breed bestiary (38 breeds from `src/data/BREEDS.json`),
  discovered by hatching, filterable by group.
- **Friends** — share a link to your public profile (`/<telegramId>`).
- **Admin tools** — id-gated debug page + Roostrdex "reveal".
- *Planned:* market, arena, farm, expeditions, TON NFT mint (see `.notes/`).

## Quick start

```bash
npm install
cp .env.example .env      # fill in values (see below)
npm run db:push           # create tables in your Neon database
npm run dev               # http://localhost:3000
```

**Local without Telegram:** a dev-only **DEV LOGIN** panel (sidebar) signs you in
as a fake **Admin**, **User**, or **Guest**. Disabled in production.

### Environment (`.env`)

| Var | Purpose |
|-----|---------|
| `DATABASE_URL` | Neon Postgres connection string |
| `TELEGRAM_CLIENT_ID` | Telegram Web Login client id from [@BotFather](https://t.me/BotFather) |
| `NEXT_PUBLIC_TELEGRAM_CLIENT_ID` | same client id; optional for client-side widgets, kept in env for parity |
| `TELEGRAM_CLIENT_SECRET` | Telegram Web Login client secret from BotFather |
| `TELEGRAM_BOT_TOKEN` | optional bot token for Bot API calls; not used by OIDC login |
| `JWT_SECRET` | session signing secret (`openssl rand -hex 32`); dev has a fallback |
| `NEXT_PUBLIC_APP_URL` | public base URL for share links |
| `NEXT_PUBLIC_ADMIN_IDS` | extra admin Telegram ids (comma-separated, optional) |

In BotFather, open `Bot Settings > Web Login` and set the `Redirect URL` to
`https://roostr-two.vercel.app/api/auth/telegram/callback` for production.
Use the same `/api/auth/telegram/callback` path for any custom domain.
`Native Login` is only for native iOS/Android SDKs and is not needed here.

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |
| `npm run db:push` / `db:generate` / `db:migrate` / `db:studio` | Drizzle (needs `DATABASE_URL`) |

## Docs

- [`SPEC.md`](./SPEC.md) — invariants and task ledger.
- [`CLAUDE.md`](./CLAUDE.md) — contributor/agent notes (design system is binding).
- [`.notes/`](./.notes/) — product spec, game design, gene & visual systems.
