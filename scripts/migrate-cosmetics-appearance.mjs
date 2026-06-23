// Data migration: legacy flat `roostrs.colors` → per-part RoosterAppearance
// (COSMETICS.json v6). Same logic as src/lib/roostr.ts `toAppearance`. Idempotent:
// only old-shape rows (colors->'body' is a string) are rewritten. Uses the same
// Neon HTTP driver as the app, so no local psql/socket needed.
//
// Run (Node 20.6+ loads .env for you):
//   node --env-file=.env scripts/migrate-cosmetics-appearance.mjs
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error(
    "DATABASE_URL not set. Run: node --env-file=.env scripts/migrate-cosmetics-appearance.mjs",
  );
  process.exit(1);
}

const sql = neon(url);
const rows = await sql.query(`
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
  WHERE jsonb_typeof(colors->'body') = 'string'
  RETURNING id
`);

console.log(`migrated ${rows.length} roostr(s) to per-part appearance`);
