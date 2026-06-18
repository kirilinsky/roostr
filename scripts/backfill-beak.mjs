// One-off: add a default beak color to roostrs rows minted before the beak
// cosmetic layer existed. Idempotent — only touches rows missing colors.beak.
import "dotenv/config";
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}
const sql = neon(url);
const rows = await sql`
  UPDATE roostrs
  SET colors = colors || '{"beak":"Yellow"}'::jsonb
  WHERE colors->>'beak' IS NULL
  RETURNING id`;
console.log(`backfilled beak on ${rows.length} roostr(s)`);
