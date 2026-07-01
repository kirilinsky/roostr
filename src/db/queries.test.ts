import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// V15 (backprop B1): the work-station settle optimistic-lock must NOT compare a
// Postgres `timestamptz` by exact equality against a JS `Date` (micros vs ms →
// silently never matches → settle no-ops → `pending` never persists → claim
// always grants 0). It must compare at millisecond precision. This is a DB-driver
// precision pitfall, not pure logic, so the regression guard greps the source.
describe("V15 — station settle timestamp CAS precision", () => {
  const src = readFileSync(
    fileURLToPath(new URL("./queries.ts", import.meta.url)),
    "utf8",
  );

  it("settleStation compares lastSettleAt at millisecond precision", () => {
    expect(src).toContain("date_trunc('milliseconds'");
  });

  it("does NOT regress to a plain timestamptz equality CAS", () => {
    expect(src).not.toMatch(/eq\(\s*workStations\.lastSettleAt/);
  });
});

// Hospital bed caps must hold under concurrency. Both fixes are SQL-level (an
// atomic re-check inside the guarded write, not read-then-write), so — like V15 —
// they aren't reachable by pure unit tests without a live DB; grep the source to
// guard against a regression back to a racy read-then-write.
describe("hospital — bed-cap races (source guard)", () => {
  const src = readFileSync(
    fileURLToPath(new URL("./queries.ts", import.meta.url)),
    "utf8",
  );

  it("admit re-checks the bed count INSIDE the UPDATE (atomic cap, not read-then-write)", () => {
    // The count subquery lives in the WHERE of the admit UPDATE, comparing live
    // working-hospital patients against `slots` — a concurrent admit can't slip past.
    expect(src).toMatch(/select count\(\*\) from roostrs r2/);
    expect(src).toContain("#>> '{work,kind}' = 'hospital'");
    expect(src).toMatch(/<\s*\$\{slots\}/);
  });

  it("buy caps beds with a setWhere and refunds the lost race", () => {
    // Atomic bump guarded by setWhere `< max`; a lost race applies nothing
    // (0 rows) and must refund the already-spent coins.
    expect(src).toMatch(/setWhere:\s*sql`\$\{workStations\.slotsOwned\}\s*<\s*\$\{max\}`/);
    expect(src).toMatch(/grantCoins\(ownerId,\s*price,\s*"refund",\s*"hospital_slot"\)/);
  });
});
