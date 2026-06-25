"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import StatModBadges from "@/components/StatModBadges";
import { STAT_KIND_COLOR, type StatKind } from "@/lib/statKinds";
import { MONO_FONT } from "@/lib/tokens";
import {
  GENE_MAX_LEVEL,
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  canUpgradeGene,
  computeMaxHealth,
  computeRating,
  computeStats,
  geneLevelOf,
  geneUpgradeCost,
  skillLabel,
  upgradeGeneLevel,
  tierFor,
  type GeneLevels,
  type RolledRoostr,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

const SKILL_KIND = Object.fromEntries(SKILLS.map((s) => [s.id, s.kind])) as Record<
  string,
  StatKind
>;

const START_COINS = 1000;

// Debug-only: spend mock coins to level genes and watch stats recompute live.
// Shows the upgrade logic (gene level scales its mods) + rising cost. No DB.
export default function GeneLab({ roostr }: { roostr: RolledRoostr }) {
  const t = useT();
  const locale = useLocale();
  const [levels, setLevels] = useState<GeneLevels>(() =>
    Object.fromEntries(roostr.genes.map((g) => [g.id, 1])),
  );
  const [coins, setCoins] = useState(START_COINS);

  const stats = computeStats(roostr.genes, levels, roostr.weightClass);
  const hp = computeMaxHealth(roostr.breed, roostr.weightClass, roostr.genes, levels);
  const rating = computeRating(stats, hp);
  const tier = tierFor(rating);

  function upgrade(geneId: string) {
    const lvl = geneLevelOf(levels, geneId);
    if (!canUpgradeGene(lvl)) return;
    const cost = geneUpgradeCost(lvl);
    if (coins < cost) return;
    setCoins((c) => c - cost);
    setLevels((l) => upgradeGeneLevel(l, geneId));
  }

  return (
    <Box
      sx={{
        width: 360,
        maxWidth: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: 0,
        p: 2,
        bgcolor: "background.paper",
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography sx={{ fontWeight: 800 }}>{t("lab.title")}</Typography>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Chip
            label={`${tier.id} · ${rating}`}
            size="small"
            sx={(theme) => ({
              bgcolor: tier.color,
              color: theme.palette.getContrastText(tier.color),
              fontWeight: 800,
            })}
          />
          <Chip
            label={`🌽 ${coins}`}
            size="small"
            sx={{
              bgcolor: "tertiary.main",
              color: "tertiary.contrastText",
              fontWeight: 700,
            }}
          />
        </Stack>
      </Stack>

      {/* Live stats */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 1.5,
          rowGap: 0.5,
          mt: 1.5,
        }}
      >
        <Box sx={{ gridColumn: "1 / -1" }}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              HP
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              {hp}
            </Typography>
          </Stack>
        </Box>
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
              sx={{ height: 6, borderRadius: 0 }}
            />
          </Box>
        ))}
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Gene upgrade rows */}
      <Stack spacing={1}>
        {roostr.genes.map((g) => {
          const lvl = levels[g.id] ?? 1;
          const maxed = lvl >= GENE_MAX_LEVEL;
          const cost = geneUpgradeCost(lvl);
          const affordable = coins >= cost;
          return (
            <Stack key={g.id} direction="row" alignItems="center" spacing={1}>
              <GeneIcon no={g.no} family={g.family} size={28} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  <Typography
                    component="span"
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontFamily: MONO_FONT, mr: 0.5 }}
                  >
                    #{String(g.no).padStart(2, "0")}
                  </Typography>
                  {g.name[locale]}{" "}
                  <Typography component="span" variant="caption" color="text.secondary">
                    {t("lab.level")} {lvl}/{GENE_MAX_LEVEL}
                  </Typography>
                </Typography>
                <StatModBadges mods={g.statMods} locale={locale} />
              </Box>
              <Button
                size="small"
                variant="outlined"
                disabled={maxed || !affordable}
                onClick={() => upgrade(g.id)}
                sx={{ flexShrink: 0, minWidth: 88 }}
              >
                {maxed ? t("lab.max") : `🌽 ${cost}`}
              </Button>
            </Stack>
          );
        })}
      </Stack>
    </Box>
  );
}
