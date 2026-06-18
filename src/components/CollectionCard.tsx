"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import type { HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Minimal roster card: avatar + name + breed + level (tier). No stat readout —
// the full RoostrCard is for the detail view. Just enough to scan a collection.
export default function CollectionCard({ roostr }: { roostr: HydratedRoostr }) {
  const t = useT();
  const locale = useLocale();
  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;
  const seedId = `#${roostr.seed.toString(16).padStart(6, "0").toUpperCase()}`;

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
          backgroundColor: "#1c1c22",
          backgroundImage:
            "repeating-conic-gradient(#26262e 0% 25%, #1c1c22 0% 50%)",
          backgroundSize: "16px 16px",
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

      {/* name + breed + level */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {/* show breed under a custom nickname; otherwise the seed passport */}
            {roostr.nickname ? breedName : seedId}
          </Typography>
        </Box>
        <Chip
          label={`${t("collection.level")} ${roostr.tier.id}`}
          size="small"
          sx={(theme) => ({
            flexShrink: 0,
            fontWeight: 800,
            bgcolor: roostr.tier.color,
            color: theme.palette.getContrastText(roostr.tier.color),
          })}
        />
      </Stack>
    </Card>
  );
}
