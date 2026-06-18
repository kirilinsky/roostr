"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import StatModBadges from "@/components/StatModBadges";
import { STAT_KIND_COLOR, type StatKind } from "@/lib/statKinds";
import { tierBackground } from "@/lib/tierBg";
import { MONO_FONT } from "@/lib/tokens";
import {
  BODY_COLOR_HEX,
  COLOR_HEX,
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  colorLabel,
  computeRating,
  formatTraitEffects,
  patternLabel,
  roleLabel,
  skillLabel,
  tierFor,
  type CosmeticLayer,
  type RolledRoostr,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Stat bar color by skill kind — shared map (red attack / blue defense / green).
const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, StatKind>;

const COLOR_ROWS: { key: CosmeticLayer; labelKey: string }[] = [
  { key: "body", labelKey: "card.body" },
  { key: "tail", labelKey: "card.tail" },
  { key: "hackle", labelKey: "card.hackle" },
  { key: "wing", labelKey: "card.wing" },
  { key: "comb", labelKey: "card.comb" },
  { key: "beak", labelKey: "card.beak" },
  { key: "leg", labelKey: "card.leg" },
  { key: "eye", labelKey: "card.eye" },
];

export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const t = useT();
  const locale = useLocale();
  const { breed, weightClass, genes, maxHealth, stats, colors, pattern, role, seed } =
    roostr;
  const bodyHex = BODY_COLOR_HEX[colors.body] ?? "#888";
  const seedId = `#${seed.toString(16).padStart(6, "0").toUpperCase()}`;
  const rating = computeRating(stats, maxHealth);
  const tier = tierFor(rating);
  const weightLabel = `${weightClass.kg} ${locale === "ru" ? "кг" : "kg"}`;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1040,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        border: 4,
        borderColor: "neutral.main",
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: 4,
        bgcolor: "background.paper",
      }}
    >
      {/* LEFT — art panel, tinted by body color */}
      <Box
        sx={{
          position: "relative",
          width: { xs: "100%", sm: 300 },
          flexShrink: 0,
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: `linear-gradient(160deg, ${bodyHex}, ${bodyHex}cc)`,
        }}
      >
        {/* top chips */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={0.5} alignItems="flex-start">
            <Chip
              label={patternLabel(pattern, locale)}
              size="small"
              sx={{ bgcolor: "neutral.main", color: "common.white", fontWeight: 700 }}
            />
            <Chip
              label={weightClass.name[locale]}
              size="small"
              title={weightLabel}
              sx={{
                bgcolor: "neutral.main",
                color: "common.white",
                fontWeight: 700,
                cursor: "help",
              }}
            />
          </Stack>
          <Stack spacing={0.5} alignItems="flex-end">
            <Chip
              label={seedId}
              size="small"
              sx={{ bgcolor: "background.paper", fontFamily: MONO_FONT }}
            />
            <Chip
              label={`${tier.id} · ${rating}`}
              size="small"
              title={`${t("card.rating")} ${rating}`}
              sx={(theme) => ({
                bgcolor: tier.color,
                color: theme.palette.getContrastText(tier.color),
                fontWeight: 800,
              })}
            />
          </Stack>
        </Stack>

        {/* art — deterministic SVG avatar composited from this roostr's params */}
        <Box
          sx={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 180,
            aspectRatio: "1 / 1",
            border: 3,
            borderColor: "neutral.main",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: tierBackground(tier.color),
          }}
        >
          <RoostrAvatarPixel
            colors={colors}
            pattern={pattern}
            breed={breed}
            weightClass={weightClass}
            seed={seed}
            size={172}
          />
        </Box>

        {/* Marble traits (cosmetic colors) — fill the space under the art */}
        <Stack direction="row" flexWrap="wrap" justifyContent="center" sx={{ gap: 0.5 }}>
          {COLOR_ROWS.map(({ key, labelKey }) => (
            <Chip
              key={key}
              size="small"
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    flexShrink: 0,
                    bgcolor: COLOR_HEX[key]?.[colors[key]] ?? "#888",
                    border: "1px solid",
                    borderColor: "divider",
                  }}
                />
              }
              label={`${t(labelKey)}: ${colorLabel(key, colors[key], locale)}`}
              sx={{ bgcolor: "background.paper" }}
            />
          ))}
        </Stack>
      </Box>

      {/* RIGHT — info */}
      <Box sx={{ flexGrow: 1, p: 1.5, minWidth: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, textTransform: "uppercase", minWidth: 0 }}
            noWrap
          >
            {breed.name[locale]}
          </Typography>
          <Chip
            label={roleLabel(role, locale).toUpperCase()}
            color="primary"
            sx={{ flexShrink: 0, fontWeight: 800, letterSpacing: 1 }}
          />
        </Stack>

        <Stack direction="row" sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
          <Chip label={`♥ HP ${maxHealth}`} variant="outlined" />
          <Chip
            label={`☆ ${breed.trait.name[locale]}`}
            variant="outlined"
            color="secondary"
            title={breed.trait.description[locale]}
          />
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            {formatTraitEffects(breed.trait.effects, locale)}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Stats (starting values: base + weight + gene mods) */}
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {t("card.stats")}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
            columnGap: 1.5,
            rowGap: 0.25,
          }}
        >
          {SKILL_IDS.map((id) => (
            <Box key={id}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  {skillLabel(id, locale)}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                >
                  {stats[id]}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (stats[id] / STAT_BAR_MAX) * 100)}
                color={STAT_KIND_COLOR[SKILL_KIND[id]] ?? "primary"}
                sx={{ height: 5, borderRadius: 1 }}
              />
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Key genes */}
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {t("card.keyGenes")} ({genes.length})
        </Typography>
        <Stack spacing={0.75} sx={{ mt: 0.5 }}>
          {genes.map((g) => (
            <Stack
              key={g.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                py: 0.75,
                px: 1,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <GeneIcon no={g.no} family={g.family} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: MONO_FONT,
                      fontWeight: 400,
                      fontSize: "0.75em",
                      color: "text.secondary",
                      mr: 0.5,
                    }}
                  >
                    #{String(g.no).padStart(2, "0")}
                  </Box>
                  {g.name[locale]}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block" }}
                >
                  {g.boosts.map((b) => skillLabel(b, locale)).join(" · ")}
                </Typography>
                <Box sx={{ mt: 0.25 }}>
                  <StatModBadges mods={g.statMods} locale={locale} />
                </Box>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
