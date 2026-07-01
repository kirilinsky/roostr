"use client";

import Box from "@mui/material/Box";
import type { StatContribution } from "@/lib/roostr";

// One pip = one stat point. Colored by SOURCE (not by stat kind): base = innate,
// gene = key-gene upgrade, synth = lab splice. NO track/rail behind the pips, so
// there's no implied ceiling. Pips always sum to `total`; a gene DEBUFF is not a
// pip (it removes points) — it's surfaced as a red tag in StatRow.
//
// Pips are grouped in fives (tally style) and wrap; the number beside them stays
// the source of truth, so a heavily-upgraded stat that wraps is still unambiguous.

const PIP = 7; // px, square (theme borderRadius is 0 → sharp arcade pip)
const GROUP = 5; // pips per tally cluster
const MAX_PIPS = 45; // hard cap; overflow shown as "+N" so nothing runs away

type Src = "base" | "gene" | "synth";

const SRC_COLOR: Record<Src, string> = {
  base: "text.secondary", // muted grey — innate
  gene: "secondary.main", // magenta — key-gene upgrade
  synth: "tertiary.main", // gold — lab splice
};

// Split a contribution into an ordered pip list that sums to `total`. A debuff
// (gene < 0) eats into the base pips instead of adding red ones.
function pipCounts({ base, gene, total }: StatContribution): {
  base: number;
  gene: number;
  synth: number;
} {
  const baseN = gene >= 0 ? base : Math.max(0, base + gene);
  const geneN = Math.max(0, gene);
  const synthN = Math.max(0, total - baseN - geneN);
  return { base: baseN, gene: geneN, synth: synthN };
}

export default function StatPips({ c }: { c: StatContribution }) {
  const counts = pipCounts(c);
  const order: Src[] = ["base", "gene", "synth"];
  const pips: Src[] = [];
  for (const src of order) for (let i = 0; i < counts[src]; i++) pips.push(src);

  const shown = pips.slice(0, MAX_PIPS);
  const overflow = pips.length - shown.length;

  // Chunk into tally groups of five.
  const groups: Src[][] = [];
  for (let i = 0; i < shown.length; i += GROUP) groups.push(shown.slice(i, i + GROUP));

  return (
    <Box
      sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "5px", mt: 0.5 }}
    >
      {groups.map((group, gi) => (
        <Box key={gi} sx={{ display: "flex", gap: "2px" }}>
          {group.map((src, i) => (
            <Box
              key={i}
              sx={{
                width: PIP,
                height: PIP,
                bgcolor: SRC_COLOR[src],
                // debuff-eaten base still reads as base; sources stay distinct.
              }}
            />
          ))}
        </Box>
      ))}
      {overflow > 0 && (
        <Box
          component="span"
          sx={{
            fontSize: "0.6875rem",
            fontWeight: 700,
            color: "text.secondary",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          +{overflow}
        </Box>
      )}
    </Box>
  );
}
