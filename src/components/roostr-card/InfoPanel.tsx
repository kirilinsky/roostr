"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import StatModBadges from "@/components/StatModBadges";
import StatRow from "@/components/stats/StatRow";
import { type StatKind } from "@/lib/statKinds";
import { MONO_FONT } from "@/lib/tokens";
import {
  SKILLS,
  SKILL_IDS,
  formatTraitEffects,
  roleLabel,
  statContributions,
  type Breed,
  type Gene,
  type WeightClass,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Stat kind by skill id — feeds the per-row label tint (red attack / blue defense
// / green utility). Points themselves are colored by SOURCE via StatRow's pips.
const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, StatKind>;

// Right side of the DNA-passport card: name + role + weight, the breed trait,
// the starting stat grid, and the key genes.
export default function InfoPanel({
  breed,
  role,
  weightClass,
  maxHealth,
  genes,
  rating,
}: {
  breed: Breed;
  role: string;
  weightClass: WeightClass;
  maxHealth: number;
  genes: Gene[];
  rating: number;
}) {
  const t = useT();
  const locale = useLocale();
  const weightLabel = `${weightClass.kg} ${locale === "ru" ? "кг" : "kg"}`;
  // Passport = a fresh roll (level 1, no synth) → this breakdown's totals equal
  // `stats`. Points render as source pips (base / gene) instead of a capped bar.
  const contrib = statContributions({ genes, weightClass });

  return (
    <Box sx={{ flexGrow: 1, p: { xs: 2, md: 2.75 }, minWidth: 0 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", sm: "center" }}
        spacing={1}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="h4"
            component="h2"
            sx={{
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 1.05,
              minWidth: 0,
            }}
            noWrap
          >
            {breed.name[locale]}
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
          <Chip
            label={roleLabel(role, locale).toUpperCase()}
            color="primary"
            size="small"
            sx={{ flexShrink: 0, fontWeight: 900, letterSpacing: 1, borderRadius: 0.75 }}
          />
          <Chip
            label={weightLabel}
            variant="outlined"
            size="small"
            sx={{ flexShrink: 0, fontWeight: 800, borderRadius: 0.75 }}
          />
        </Stack>
      </Stack>

      <Stack direction="row" alignItems="center" flexWrap="wrap" sx={{ mt: 1.5, gap: 0.75 }}>
        <Chip
          size="small"
          label={`♥ ${maxHealth}`}
          variant="outlined"
          sx={{ borderRadius: 0.75, fontWeight: 800 }}
        />
        <Chip
          size="small"
          label={`☆ ${breed.trait.name[locale]}`}
          variant="outlined"
          color="secondary"
          title={breed.trait.description[locale]}
          sx={{ borderRadius: 0.75, fontWeight: 800 }}
        />
        <Typography variant="caption" color="text.secondary">
          {formatTraitEffects(breed.trait.effects, locale)}
        </Typography>
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      {/* Stats (starting values: base + weight + gene mods) */}
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="overline" color="text.secondary">
          {t("card.stats")}
        </Typography>
        <Typography variant="overline" color="text.secondary">
          {t("card.rating")} {rating}
        </Typography>
      </Stack>
      <Box
        sx={{
          mt: 0.5,
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
          gap: 1,
        }}
      >
        {SKILL_IDS.map((id) => (
          <Box
            key={id}
            sx={{
              minWidth: 0,
              p: 1,
              border: 1,
              borderColor: "divider",
              borderRadius: 0,
              bgcolor: "background.default",
            }}
          >
            <StatRow id={id} kind={SKILL_KIND[id]} c={contrib[id]} />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Key genes — side by side on wide screens, stacked on mobile */}
      <Typography variant="overline" color="text.secondary">
        {t("card.keyGenes")} ({genes.length})
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 0.5 }}>
        {genes.map((g) => (
          <Stack
            key={g.id}
            direction="row"
            alignItems="center"
            spacing={1}
            sx={{
              flex: 1,
              minWidth: 0,
              py: 1,
              px: 1.25,
              border: 1,
              borderColor: "divider",
              borderRadius: 0,
              bgcolor: "background.default",
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
  );
}
