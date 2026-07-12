import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// SPEC §V24 (backprop of §B2): MUI sx responsive breakpoint values must be PLAIN
// values — a theme function nested INSIDE a breakpoint object (e.g.
// `bgcolor: { xs: (theme) => alpha(...) }`) is never resolved by MUI; emotion
// serializes the function source into the CSS, whose text differs between the
// server and client bundles under Turbopack → emotion class-hash mismatch →
// hydration failure → React removeChild crash. Theme access belongs in a
// TOP-LEVEL sx callback: `sx={(theme) => ({ ... })}`.

const SRC = join(__dirname, "..");
const OFFENDER = /\b(xs|sm|md|lg|xl)\s*:\s*\(\s*theme\s*\)\s*=>/;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name) && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

describe("TestV24: no per-breakpoint theme functions in sx", () => {
  it("no source file nests a (theme) => fn inside a breakpoint object", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (OFFENDER.test(line)) offenders.push(`${file}:${i + 1}  ${line.trim()}`);
      });
    }
    expect(offenders, `Per-breakpoint theme fns found (SPEC §V24):\n${offenders.join("\n")}`).toEqual([]);
  });
});
