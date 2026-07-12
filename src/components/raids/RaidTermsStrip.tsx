"use client";

import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  RAID_FEATHER_COST,
  RAID_HP_COST_WIN,
  RAID_HP_COST_LOSS,
  RAID_EGG_CHANCE,
} from "@/lib/raids";
import { useT } from "@/i18n/I18nProvider";

// The raid contract — every cost and chance, flat and visible before committing.
export default function RaidTermsStrip({ feathers }: { feathers: number }) {
  const t = useT();
  return (
    <Card variant="surface" sx={{ p: { xs: 1.25, md: 1.5 } }}>
      <Stack
        direction="row"
        spacing={{ xs: 1.5, md: 3 }}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
      >
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          📜 {t("raids.rulesTitle")}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          🪶 {t("raids.ruleCost", { n: RAID_FEATHER_COST, have: feathers })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          ❤️ {t("raids.ruleHp", { win: RAID_HP_COST_WIN, loss: RAID_HP_COST_LOSS })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          🥚 {t("raids.ruleEgg", { pct: Math.round(RAID_EGG_CHANCE * 100) })}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          💀 {t("raids.ruleFail")}
        </Typography>
      </Stack>
    </Card>
  );
}
