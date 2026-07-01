"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StatPips from "./StatPips";
import { STAT_KIND_COLOR, type StatKind } from "@/lib/statKinds";
import { skillLabel, type Skill, type StatContribution } from "@/lib/roostr";
import { useLocale } from "@/i18n/I18nProvider";

// One stat line: kind-tinted label + total value (with a red gene-debuff tag when
// a gene drags it down), and the source-colored pips below.
export default function StatRow({
  id,
  kind,
  c,
}: {
  id: Skill;
  kind: StatKind;
  c: StatContribution;
}) {
  const locale = useLocale();
  const kindColor = STAT_KIND_COLOR[kind] ?? "primary";
  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="caption" sx={{ color: `${kindColor}.main`, fontWeight: 600 }}>
          {skillLabel(id, locale)}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="baseline">
          {c.gene < 0 && (
            <Typography
              variant="caption"
              sx={{ color: "error.main", fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
            >
              ▼{Math.abs(c.gene)}
            </Typography>
          )}
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
          >
            {c.total}
          </Typography>
        </Stack>
      </Stack>
      <StatPips c={c} />
    </Box>
  );
}
