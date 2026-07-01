"use client";

import Card from "@mui/material/Card";
import { alpha } from "@mui/material/styles";
import ArtPanel from "@/components/roostr-card/ArtPanel";
import InfoPanel from "@/components/roostr-card/InfoPanel";
import { cosmeticForRoostr } from "@/lib/avatarV2";
import { computeRating, tierFor, type RolledRoostr } from "@/lib/roostr";

// Full "DNA passport" card shown on hatch (and the debug preview). Compact + wide:
// art panel on the left, info on the right (stacks on mobile). The two halves are
// split into their own components — see roostr-card/.
export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const { breed, weightClass, genes, maxHealth, stats, role, seed } = roostr;
  // V2 look: breed features + colorway from seed (+ weight for the belly scale).
  const cosmetic = { ...cosmeticForRoostr(breed.id, seed), weight: weightClass.id };
  const rating = computeRating(stats, maxHealth);
  const tier = tierFor(rating);

  return (
    <Card
      data-testid="roostr-card"
      data-breed={breed.id}
      sx={(theme) => ({
        width: "100%",
        maxWidth: 1100,
        overflow: "hidden",
        boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.06)}`,
        border: 1,
        borderColor: alpha(tier.color, 0.48),
        borderRadius: 0,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        background: `linear-gradient(180deg, ${alpha(tier.color, 0.08)}, ${theme.palette.background.paper} 34%)`,
      })}
    >
      <ArtPanel
        cosmetic={cosmetic}
        tier={tier}
        rating={rating}
        seed={seed}
        weightClass={weightClass}
      />
      <InfoPanel
        breed={breed}
        role={role}
        weightClass={weightClass}
        maxHealth={maxHealth}
        genes={genes}
        rating={rating}
      />
    </Card>
  );
}
