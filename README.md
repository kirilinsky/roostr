# Roostr — foundation

Telegram-authed web app foundation. Phase: **auth shell only** (see
[NEXTGEN-SPEC.md](./NEXTGEN-SPEC.md) §13.2). Sign in with Telegram → see your
avatar, name, and Telegram ID.

Stack: Next.js 15 (App Router) · TypeScript · MUI (bare Material baseline) ·
Telegram **Login Widget** · stateless session JWT (httpOnly cookie). No DB yet.

> Auth note: this uses the website **Login Widget**
> (`secret = SHA256(bot_token)`), not the Mini App `initData` scheme. Swap later
> when moving into Telegram (spec §5).

## Setup

1. **Create a bot** with [@BotFather](https://t.me/BotFather) → copy the token.
2. **Link your domain** to the bot: in BotFather send `/setdomain`, pick the
   bot, send the domain the site runs on (e.g. `localhost` won't work for the
   widget — use a real domain or a tunnel like `https://<id>.ngrok.app`). The
   widget only renders on the domain registered here.
3. **Env:** copy `.env.example` → `.env` and fill:
   - `TELEGRAM_BOT_TOKEN` — from BotFather
   - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` — bot username without `@`
   - `JWT_SECRET` — `openssl rand -hex 32`
4. **Run:**
   ```bash
   npm install
   npm run dev
   ```

## Flow

```
/ (page.tsx)            login card + Telegram Login Widget
  └─ widget callback ──▶ POST /api/auth/telegram
                          verify HMAC(SHA256(bot_token)) + auth_date freshness
                          sign JWT → httpOnly cookie
  └─ redirect ─────────▶ /profile  (avatar, name, @username, Telegram ID)
                          POST /api/auth/logout  clears cookie
```

## Files

| Path | Role |
|------|------|
| `src/lib/telegram.ts` | verify Login Widget hash + freshness |
| `src/lib/auth.ts` | JWT sign / session read (jose) |
| `src/app/api/auth/telegram/route.ts` | verify + set session cookie |
| `src/app/api/auth/logout/route.ts` | clear session |
| `src/components/TelegramLoginButton.tsx` | injects widget script, posts to API |
| `src/app/page.tsx` | login page |
| `src/app/profile/page.tsx` | the win: avatar + name + ID |
