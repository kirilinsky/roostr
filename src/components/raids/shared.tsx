"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Shared bits of the raids UI (RaidsView + its extracted sections).

// The attacker's raid in flight (server snapshot, display-ready). `targetName` is
// resolved server-side (bot flavor OR anonymized coop) so the UI never needs to
// know bot-vs-player; `isPvp` only tints the label.
export interface ActiveRaidUi {
  id: string;
  targetName: { en: string; ru: string };
  isPvp: boolean;
  endsAt: number; // ms epoch
  power: number;
  defense: number;
  luck: number;
  pool: number;
  partySize: number;
}

// Collect outcome for the result popup — the full debrief (who went, what it
// cost, what came back).
export interface RaidOutcome {
  success: boolean;
  lootCoins: number;
  lootEggs: number;
  wasConsolation: boolean;
  hpCost: number;
  isPvp: boolean;
  targetName: { en: string; ru: string };
  party: {
    id: string;
    nickname: string | null;
    breedName: { en: string; ru: string };
    stealth: number;
    luck: number;
    hpBefore: number;
    hpAfter: number;
    maxHealth: number;
  }[];
}

// One resolved raid for the log (display-ready).
export interface RaidLogEntry {
  id: string;
  targetName: { en: string; ru: string };
  isPvp: boolean;
  success: boolean;
  lootCoins: number;
  lootEggs: number;
  at: number; // ms epoch (resolvedAt)
}

// ms → compact "Nh Nm" / "Nч Nм".
export function fmtDuration(ms: number, locale: string): string {
  const totalMin = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  const hU = locale === "ru" ? "ч" : "h";
  const mU = locale === "ru" ? "м" : "m";
  if (h > 0 && m > 0) return `${h}${hU} ${m}${mU}`;
  if (h > 0) return `${h}${hU}`;
  return `${m}${mU}`;
}

// A labeled readout tile: icon + caption label on top, bold value under — reads at
// a glance instead of an emoji soup.
export function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string | number;
  color?: string;
}) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center" sx={{ minWidth: 0 }}>
      <Box component="span" sx={{ fontSize: 18, lineHeight: 1 }}>
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", lineHeight: 1.1 }} noWrap>
          {label}
        </Typography>
        <Typography
          variant="body2"
          sx={{ fontWeight: 800, lineHeight: 1.2, color, fontVariantNumeric: "tabular-nums" }}
          noWrap
        >
          {value}
        </Typography>
      </Box>
    </Stack>
  );
}

// Dashed "empty/add/buy" tile styling shared by the party grid cells.
export const dashedSx = {
  minHeight: 132,
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "center",
  justifyContent: "center",
  gap: 0.5,
  cursor: "pointer",
  border: "2px dashed",
  borderColor: "divider",
  borderRadius: 0,
  bgcolor: "transparent",
  color: "text.secondary",
  transition: "border-color .15s, color .15s",
  "&:hover": { borderColor: "primary.main", color: "primary.main" },
};
