"use client";

import { useMemo } from "react";
import Box from "@mui/material/Box";
import StatRow from "./StatRow";
import StatSourceLegend from "./StatSourceLegend";
import { SKILLS, SKILL_IDS, statContributions, type HydratedRoostr } from "@/lib/roostr";
import type { StatKind } from "@/lib/statKinds";

const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, StatKind>;

// The full stat block: a source legend + a responsive grid of per-stat rows.
// Points are shown as source-colored pips (base / gene / synth) with no ceiling.
export default function StatList({ roostr }: { roostr: HydratedRoostr }) {
  const contrib = useMemo(
    () =>
      statContributions({
        genes: roostr.genes,
        geneLevels: roostr.geneLevels,
        synthGenes: roostr.synthGenes,
        synthGeneLevels: roostr.synthGeneLevels,
        weightClass: roostr.weightClass,
        trait: roostr.breed.trait,
      }),
    [
      roostr.genes,
      roostr.geneLevels,
      roostr.synthGenes,
      roostr.synthGeneLevels,
      roostr.weightClass,
      roostr.breed.trait,
    ],
  );

  return (
    <>
      <StatSourceLegend />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "minmax(0, 1fr) minmax(0, 1fr)",
          },
          columnGap: 2,
          rowGap: 1,
        }}
      >
        {SKILL_IDS.map((id) => (
          <StatRow key={id} id={id} kind={SKILL_KIND[id]} c={contrib[id]} />
        ))}
      </Box>
    </>
  );
}
