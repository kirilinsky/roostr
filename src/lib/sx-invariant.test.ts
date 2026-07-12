import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// SPEC §V24 (backprop of §B2, extended after the /raids prod crash): a theme
// function NESTED anywhere inside an sx object literal — a breakpoint object
// (`bgcolor: { xs: (theme) => … }`) OR a selector object
// (`"&:hover": { boxShadow: (theme) => … }`) — is never resolved by MUI; emotion
// serializes the function source into the CSS. In dev (Turbopack) the source can
// even match between server and client, hiding the bug — but the PROD build
// minifies the server and client bundles differently, so the emotion class hash
// diverges → hydration failure → React removeChild crash, prod-only.
// Theme access belongs in a TOP-LEVEL sx callback: `sx={(theme) => ({ ... })}`.
// (Top-level PROPERTY fns — `boxShadow: (theme) => …` at depth 1 — are resolved
// by MUI before emotion and stay legal.)

const SRC = join(__dirname, "..");

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts)$/.test(name) && !name.endsWith(".test.ts")) out.push(p);
  }
  return out;
}

// Depth-aware scan: inside every `sx={{ … }}` literal, flag `(theme) =>` at
// brace depth > 1 (i.e. inside a nested breakpoint/selector object).
function nestedThemeFns(source: string, file: string): string[] {
  const out: string[] = [];
  const re = /sx=\{\{/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    let depth = 0;
    for (let i = m.index + m[0].length - 1; i < source.length; i++) {
      const c = source[i];
      if (c === "{") depth += 1;
      else if (c === "}") {
        depth -= 1;
        if (depth === 0) break;
      } else if (
        depth > 1 &&
        (source.startsWith("(theme) =>", i) || source.startsWith("(theme)=>", i))
      ) {
        const line = source.slice(0, i).split("\n").length;
        out.push(`${file}:${line} (depth ${depth})`);
      }
    }
  }
  return out;
}

describe("TestV24: no theme functions nested inside sx object literals", () => {
  it("every (theme) => inside sx sits at the top level (or the whole sx is a callback)", () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      offenders.push(...nestedThemeFns(readFileSync(file, "utf8"), file));
    }
    expect(
      offenders,
      `Nested sx theme fns found (SPEC §V24 — prod-only hydration crash):\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
