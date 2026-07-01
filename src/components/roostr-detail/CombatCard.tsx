"use client";

import { useState } from "react";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StatInfoModal from "@/components/StatInfoModal";
import StatList from "@/components/stats/StatList";
import { skillLabel, type HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Right column: the combat stats (source-broken-down pips, no ceiling) and the
// breed trait card. Owns the stat-kinds legend modal.
export default function CombatCard({ roostr }: { roostr: HydratedRoostr }) {
  const t = useT();
  const locale = useLocale();
  const breedName = roostr.breed.name[locale];
  const [statInfoOpen, setStatInfoOpen] = useState(false);

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

        <StatList roostr={roostr} />
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
