import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import { skillLabel, type StatMods } from "@/lib/roostr";
import type { Locale } from "@/i18n/config";

// Stat buffs/debuffs as colored badges: green for +, red for −.
// e.g. +1 HP · +1 Guard · -1 Damage. Works in server and client components
// (no hooks / function props). Renders nothing when there are no nonzero mods.
export default function StatModBadges({
  mods,
  locale,
}: {
  mods?: StatMods;
  locale: Locale;
}) {
  const entries = Object.entries(mods ?? {}).filter(
    (e): e is [string, number] => typeof e[1] === "number" && e[1] !== 0,
  );
  if (entries.length === 0) return null;

  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {entries.map(([stat, v]) => (
        <Chip
          key={stat}
          size="small"
          variant="outlined"
          color={v > 0 ? "success" : "error"}
          label={`${v > 0 ? "+" : ""}${v} ${skillLabel(stat, locale)}`}
          sx={{ height: 22, fontWeight: 700 }}
        />
      ))}
    </Stack>
  );
}
