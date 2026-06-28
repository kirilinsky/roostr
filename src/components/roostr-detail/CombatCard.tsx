"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StatInfoModal from "@/components/StatInfoModal";
import { STAT_KIND_COLOR, type StatKind } from "@/lib/statKinds";
import {
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  computeStats,
  skillLabel,
  type HydratedRoostr,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, StatKind>;

// Right column: the combat stat bars (base + gene-upgrade portion) and the breed
// trait card. Owns the stat-kinds legend modal.
export default function CombatCard({ roostr }: { roostr: HydratedRoostr }) {
  const t = useT();
  const locale = useLocale();
  const breedName = roostr.breed.name[locale];
  const [statInfoOpen, setStatInfoOpen] = useState(false);
  // Innate stats (base + weight, no genes) — the dark part of each bar.
  const baseStats = useMemo(
    () => computeStats([], {}, roostr.weightClass),
    [roostr.weightClass],
  );

  return (
    <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
      <Card sx={{ p: { xs: 1.5, md: 2 }, flexGrow: 1 }}>
        <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
          <Typography variant="h6">{t("detail.combatStats")}</Typography>
          {/* legend: red attack / blue defense / green utility */}
          <IconButton
            size="small"
            aria-label={t("stats.kindsTitle")}
            onClick={() => setStatInfoOpen(true)}
            sx={{ color: "primary.main" }}
          >
            ⓘ
          </IconButton>
        </Stack>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "minmax(0, 1fr) minmax(0, 1fr)",
            },
            columnGap: 2,
            rowGap: 0.75,
          }}
        >
          {SKILL_IDS.map((id) => {
            const total = roostr.stats[id];
            const base = baseStats[id];
            const color = STAT_KIND_COLOR[SKILL_KIND[id]] ?? "primary";
            const basePct = Math.min(100, (Math.min(base, total) / STAT_BAR_MAX) * 100);
            const buffPct = Math.min(
              100 - basePct,
              (Math.max(0, total - base) / STAT_BAR_MAX) * 100,
            );
            return (
              <Box key={id}>
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    {skillLabel(id, locale)}
                  </Typography>
                  <br />
                  <Typography
                    variant="caption"
                    sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                  >
                    {total}
                  </Typography>
                </Stack>
                {/* base (solid) + gene-upgrade portion (lighter) stacked */}
                <Box
                  sx={{
                    display: "flex",
                    height: 6,
                    borderRadius: 0,
                    overflow: "hidden",
                    bgcolor: "action.hover",
                  }}
                >
                  <Box sx={{ width: `${basePct}%`, bgcolor: `${color}.main` }} />
                  <Box sx={{ width: `${buffPct}%`, bgcolor: `${color}.light` }} />
                </Box>
              </Box>
            );
          })}
        </Box>
      </Card>

      {/* Breed trait — innate, non-upgradeable buff/debuff */}
      <Card sx={{ p: { xs: 1.5, md: 2 } }}>
        <Typography variant="overline" color="text.secondary">
          {t("detail.breedTrait")} · {breedName}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.25 }}>
          ☆ {roostr.breed.trait.name[locale]}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {roostr.breed.trait.description[locale]}
        </Typography>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
          {roostr.breed.trait.effects.map((e) => {
            const pct = Math.round(e.mod * 100);
            return (
              <Chip
                key={e.stat}
                size="small"
                variant="outlined"
                color={pct >= 0 ? "success" : "error"}
                label={`${pct > 0 ? "+" : ""}${pct}% ${skillLabel(e.stat, locale)}`}
              />
            );
          })}
        </Stack>
      </Card>

      <StatInfoModal open={statInfoOpen} onClose={() => setStatInfoOpen(false)} />
    </Stack>
  );
}
