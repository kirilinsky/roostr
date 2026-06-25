"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
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
  { key: "saddle", labelKey: "card.saddle" },
  { key: "wing", labelKey: "card.wing" },
  { key: "comb", labelKey: "card.comb" },
  { key: "beak", labelKey: "card.beak" },
  { key: "leg", labelKey: "card.leg" },
  { key: "eye", labelKey: "card.eye" },
];

// Full "DNA passport" card shown on hatch (and the debug preview). Compact + wide:
// art panel on the left, info on the right (stacks on mobile). Cosmetic colors are a
// tight swatch strip (hover for the name) instead of a tall list of labelled chips.
export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const t = useT();
  const locale = useLocale();
  const { breed, weightClass, genes, maxHealth, stats, colors, pattern, role, seed } =
    roostr;
  const bodyHex = BODY_COLOR_HEX[colors.body.color] ?? "#888";
  const seedId = `#${seed.toString(16).padStart(6, "0").toUpperCase()}`;
  const rating = computeRating(stats, maxHealth);
  const tier = tierFor(rating);
  const weightLabel = `${weightClass.kg} ${locale === "ru" ? "кг" : "kg"}`;

  return (
    <Card
      sx={{
        width: "100%",
        maxWidth: 1100,
        overflow: "hidden",
        boxShadow: "none",
        border: 1,
        borderColor: "divider",
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
      }}
    >
      {/* LEFT — art panel, tinted by body color */}
      <Box
        sx={{
          width: { xs: "100%", md: 230 },
          flexShrink: 0,
          p: { xs: 2, md: 1.75 },
          display: "flex",
          flexDirection: "column",
          gap: 1.25,
          background: `linear-gradient(160deg, ${bodyHex}, ${bodyHex}cc)`,
        }}
      >
        {/* top chips */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
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

        {/* art — deterministic pixel avatar composited from this roostr's params */}
        <Box
          sx={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 200,
            aspectRatio: "1 / 1",
            borderRadius: 2,
            overflow: "hidden",
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
            size={196}
          />
        </Box>

        {/* Cosmetic colors — compact swatch strip (hover for the name). */}
        <Stack
          direction="row"
          flexWrap="wrap"
          justifyContent="center"
          sx={{ gap: 0.75 }}
        >
          {COLOR_ROWS.map(({ key, labelKey }) => (
            <Box
              key={key}
              title={`${t(labelKey)}: ${colorLabel(key, colors[key].color, locale)}`}
              sx={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                flexShrink: 0,
                cursor: "help",
                bgcolor: COLOR_HEX[key]?.[colors[key].color] ?? "#888",
                border: "2px solid",
                borderColor: "background.paper",
                boxShadow: 1,
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* RIGHT — info */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 2.5 }, minWidth: 0 }}>
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
            size="small"
            sx={{ flexShrink: 0, fontWeight: 800, letterSpacing: 1 }}
          />
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          sx={{ mt: 1, gap: 0.75 }}
        >
          <Chip size="small" label={`♥ ${maxHealth}`} variant="outlined" />
          <Chip
            size="small"
            label={`☆ ${breed.trait.name[locale]}`}
            variant="outlined"
            color="secondary"
            title={breed.trait.description[locale]}
          />
          <Typography variant="caption" color="text.secondary">
            {formatTraitEffects(breed.trait.effects, locale)}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Stats (starting values: base + weight + gene mods) */}
        <Typography variant="overline" color="text.secondary">
          {t("card.stats")}
        </Typography>
        <Box
          sx={{
            mt: 0.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
            columnGap: 2,
            rowGap: 0.5,
          }}
        >
          {SKILL_IDS.map((id) => (
            <Box key={id}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" noWrap>
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

        <Divider sx={{ my: 1.5 }} />

        {/* Key genes — side by side on wide screens, stacked on mobile */}
        <Typography variant="overline" color="text.secondary">
          {t("card.keyGenes")} ({genes.length})
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 0.5 }}
        >
          {genes.map((g) => (
            <Stack
              key={g.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                flex: 1,
                minWidth: 0,
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
                <Box sx={{ mt: 0.25 }}>
                  <StatModBadges mods={g.statMods} locale={locale} />
                </Box>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Card>
  );
}
