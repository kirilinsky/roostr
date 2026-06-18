# Roostr

Telegram-authed collectible roosters. Next.js 15 (App Router) · MUI v6 · TypeScript · i18n (en/ru).
Product spec lives in `.notes/NEXTGEN-SPEC.md`; SDD invariants in `SPEC.md`.

## Design system (binding)

The app has a **design system** and it is the single source of truth for all UI. Source:
`src/theme.ts` — one MUI theme ("Neo-Arcade, Day Mode"): palette (`primary`, `secondary`, augmented
`tertiary`/`neutral`), `shape.borderRadius`, headline/body font CSS vars, component defaults.

**Every edit and every new feature must follow it:**

- Use **theme tokens + MUI components**. Do not hardcode colors, spacing, radii, or fonts in `sx`.
- Need a new token / color / variant? **Extend `theme.ts`** (augment custom palette colors there),
  then use it — never inline ad-hoc values. The theme stays the single source.
- Reuse existing components and patterns (`AppShell`, `StubPage`, `RoostrCard`) instead of
  re-inventing them.
- All user-facing text goes through the i18n dictionaries (`src/i18n/dictionaries.ts`, en + ru) —
  no hardcoded strings.
- A visual change the current tokens can't express is a **theme change first**, then usage — so the
  design system never drifts from the code.

## Commands

- `npm run dev` — local dev server
- `npm run build` — production build
- `npm run typecheck` — `tsc --noEmit`
- `npm run lint` — `next lint`
