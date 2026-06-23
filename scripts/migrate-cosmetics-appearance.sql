-- Data migration: adapt legacy flat `roostrs.colors` → the per-part RoosterAppearance
-- shape introduced with COSMETICS.json v6. Mirrors src/lib/roostr.ts `toAppearance`:
--   { part: "ColorId" } + a single `pattern`  →
--   { part: { color, pattern?/effect? } }, body/wing carry the legacy pattern,
--   saddle (new) mirrors the hackle color, tail effect left unset.
--
-- Idempotent: only rows still in the old shape (colors->'body' is a string) are
-- rewritten, so re-running is a no-op. Run manually (NOT via db:migrate — the
-- migrations folder has drifted; this is a one-off data fix):
--
--   psql "$DATABASE_URL" -f scripts/migrate-cosmetics-appearance.sql
--
-- New rows hatched after the v6 deploy are already in the new shape and untouched.

UPDATE roostrs SET colors = jsonb_build_object(
  'body',   jsonb_build_object('color', colors->>'body',   'pattern', pattern),
  'wing',   jsonb_build_object('color', colors->>'wing',   'pattern', pattern),
  'tail',   jsonb_build_object('color', colors->>'tail'),
  'hackle', jsonb_build_object('color', colors->>'hackle'),
  'saddle', jsonb_build_object('color', colors->>'hackle'),
  'comb',   jsonb_build_object('color', colors->>'comb'),
  'leg',    jsonb_build_object('color', colors->>'leg'),
  'eye',    jsonb_build_object('color', colors->>'eye'),
  'beak',   jsonb_build_object('color', colors->>'beak')
)
WHERE jsonb_typeof(colors->'body') = 'string';
