"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useT } from "@/i18n/I18nProvider";

// Tiny legend for the pip SOURCE colors (base / gene / synth) + the debuff tag.
// Keeps the pip meaning discoverable without a modal.
const ITEMS: { key: string; color: string }[] = [
  { key: "stats.src.base", color: "text.secondary" },
  { key: "stats.src.gene", color: "secondary.main" },
  { key: "stats.src.synth", color: "tertiary.main" },
];

export default function StatSourceLegend() {
  const t = useT();
  return (
    <Stack direction="row" spacing={1.25} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
      {ITEMS.map(({ key, color }) => (
        <Stack key={key} direction="row" spacing={0.5} alignItems="center">
          <Box sx={{ width: 8, height: 8, bgcolor: color }} />
          <Typography variant="caption" color="text.secondary">
            {t(key)}
          </Typography>
        </Stack>
      ))}
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography variant="caption" sx={{ color: "error.main", fontWeight: 700 }}>
          ▼
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {t("stats.src.debuff")}
        </Typography>
      </Stack>
    </Stack>
  );
}
