"use client";

import { useMemo } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import { SKILLS, type HydratedRoostr } from "@/lib/roostr";
import { STAT_KIND_COLOR, STAT_KIND_ORDER, type StatKind } from "@/lib/statKinds";
import { countryFlag } from "@/lib/flag";
import { tierBackground } from "@/lib/tierBg";
import { groupName } from "@/lib/breeds";
import { useLocale } from "@/i18n/I18nProvider";

// Minimal roster card: avatar + name + origin flag + level (tier · rating) + a
// short stat-by-category readout (red attack / blue defense / green utility) so
// the upgrade lean is visible at a glance. Full detail lives on the rooster page.
export default function CollectionCard({ roostr }: { roostr: HydratedRoostr }) {
  const locale = useLocale();
  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;

  // Sum of stats per kind → shows where the build leans.
  const kindSum = useMemo(() => {
    const sum: Record<StatKind, number> = { offense: 0, defense: 0, utility: 0 };
    for (const s of SKILLS) sum[s.kind] += roostr.stats[s.id] ?? 0;
    return sum;
  }, [roostr.stats]);

  return (
    <Card
      component={Link}
      href={`/collection/${roostr.id}`}
      sx={{
        p: 1.5,
        display: "flex",
        flexDirection: "column",
        gap: 1,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, transform 0.15s",
        "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
      }}
    >
      {/* avatar on the checkered chamber backdrop */}
      <Box
        sx={{
          alignSelf: "center",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 2,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tierBackground(roostr.tier.color),
        }}
      >
        <RoostrAvatarPixel
          colors={roostr.colors}
          pattern={roostr.pattern}
          breed={roostr.breed}
          weightClass={roostr.weightClass}
          seed={roostr.seed}
          size={140}
        />
      </Box>

      {/* name + origin flag + tier·rating */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {countryFlag(roostr.breed.region.iso)} {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {/* breed when a nickname overrides the title, plus the group */}
            {roostr.nickname ? `${breedName} · ` : ""}
            {groupName(roostr.breed.group, locale)}
          </Typography>
        </Box>
        <Chip
          label={`${roostr.tier.id} · ${roostr.rating}`}
          size="small"
          variant="outlined"
          sx={{ flexShrink: 0, fontWeight: 800 }}
        />
      </Stack>

      {/* stat-by-category sums — the build's lean */}
      <Stack direction="row" spacing={1.5} justifyContent="center">
        {STAT_KIND_ORDER.map((kind) => (
          <Stack key={kind} direction="row" alignItems="center" spacing={0.5}>
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                bgcolor: `${STAT_KIND_COLOR[kind]}.main`,
              }}
            />
            <Typography variant="caption" sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>
              {kindSum[kind]}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
