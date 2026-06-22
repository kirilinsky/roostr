"use client";

import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import type { Variant } from "@mui/material/styles/createTypography";
import { useT } from "@/i18n/I18nProvider";

// Reusable win/loss readout: "W/L" as plain numbers — wins green, losses red.
// Hover shows the labelled breakdown (and draws, when any). Used on the roster
// card footer and the rooster page; pass `variant` to size it to its context.
export default function BattleRecord({
  wins,
  losses,
  draws = 0,
  variant = "caption",
}: {
  wins: number;
  losses: number;
  draws?: number;
  variant?: Variant;
}) {
  const t = useT();
  const tip =
    `${t("card.wins")}: ${wins} · ${t("card.losses")}: ${losses}` +
    (draws > 0 ? ` · ${t("card.draws")}: ${draws}` : "");

  const num = { fontWeight: 800, fontVariantNumeric: "tabular-nums" } as const;

  return (
    <Tooltip title={tip}>
      <Stack
        direction="row"
        spacing={0.25}
        alignItems="center"
        component="span"
        sx={{ cursor: "default" }}
      >
        <Typography variant={variant} sx={{ ...num, color: "success.main" }}>
          {wins}
        </Typography>
        <Typography variant={variant} color="text.secondary" sx={num}>
          /
        </Typography>
        <Typography variant={variant} sx={{ ...num, color: "error.main" }}>
          {losses}
        </Typography>
      </Stack>
    </Tooltip>
  );
}
