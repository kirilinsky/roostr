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
