"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import { SKILLS, type HydratedRoostr } from "@/lib/roostr";
import { STAT_KIND_COLOR, STAT_KIND_ORDER, type StatKind } from "@/lib/statKinds";
import { countryFlag } from "@/lib/flag";
import { tierBackground } from "@/lib/tierBg";
import { groupName } from "@/lib/breeds";
import { useLocale } from "@/i18n/I18nProvider";

// Footer readout mode: "kinds" = stat-by-category sums (collection); "intellect"
// = single Intellect score (lab roster / picker).
export type CardMetric = "kinds" | "intellect";

// Reusable roster card. Default: links to the rooster page with the per-category
// stat lean. Pass `onClick` to use it as a button (lab worker / picker), and
// `metric="intellect"` to surface the Intellect score instead.
export default function CollectionCard({
  roostr,
  metric = "kinds",
  onClick,
  selected = false,
  href,
  price,
}: {
  roostr: HydratedRoostr;
  metric?: CardMetric;
  onClick?: () => void;
  selected?: boolean;
  href?: string;
  price?: number;
}) {
  const locale = useLocale();
  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;
  const intellect = roostr.stats.Intellect ?? 0;

  // Sum of stats per kind → shows where the build leans.
  const kindSum = useMemo(() => {
    const sum: Record<StatKind, number> = { offense: 0, defense: 0, utility: 0 };
    for (const s of SKILLS) sum[s.kind] += roostr.stats[s.id] ?? 0;
    return sum;
  }, [roostr.stats]);

  const inner: ReactNode = (
    <>
      {/* avatar on the checkered chamber backdrop */}
      <Box
        sx={{
          position: "relative",
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
        {selected && (
          <Chip
            label="✓"
            size="small"
            color="primary"
            sx={{ position: "absolute", top: 6, right: 6, fontWeight: 800 }}
          />
        )}
      </Box>

      {/* name + origin flag + tier·rating */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
            {countryFlag(roostr.breed.region.iso)} {name}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
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

      {/* footer readout: Intellect score (lab) or stat-by-category lean */}
      {metric === "intellect" ? (
        <Stack direction="row" spacing={0.5} justifyContent="center" alignItems="center">
          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: "success.main" }} />
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            🧠 {intellect}
          </Typography>
        </Stack>
      ) : (
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
              <Typography
                variant="caption"
                sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
              >
                {kindSum[kind]}
              </Typography>
            </Stack>
          ))}
        </Stack>
      )}

      {/* market price tag */}
      {typeof price === "number" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            py: 0.5,
            borderRadius: 1,
            bgcolor: "background.default",
          }}
        >
          <Image
            src="/corn-coin.png"
            alt=""
            width={16}
            height={15}
            style={{ height: 14, width: "auto" }}
          />
          <Typography
            variant="body2"
            sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            {price.toLocaleString()}
          </Typography>
        </Box>
      )}
    </>
  );

  const baseSx: SxProps<Theme> = {
    p: 1.5,
    display: "flex",
    flexDirection: "column",
    gap: 1,
    textDecoration: "none",
    color: "inherit",
    textAlign: "left",
    ...(selected ? { borderColor: "primary.main" } : {}),
    transition: "border-color 0.15s, transform 0.15s",
    "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
  };

  // Button mode (lab worker / picker) vs link mode (collection).
  if (onClick) {
    return (
      <Card
        component="button"
        type="button"
        onClick={onClick}
        sx={[baseSx, { font: "inherit", width: "100%", cursor: "pointer" }] as SxProps<Theme>}
      >
        {inner}
      </Card>
    );
  }
  return (
    <Card component={Link} href={href ?? `/collection/${roostr.id}`} sx={baseSx}>
      {inner}
    </Card>
  );
}
