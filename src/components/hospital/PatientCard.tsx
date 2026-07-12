"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatar from "@/components/RoostrAvatar";
import { healedHp, healEtaMs } from "@/lib/hospital";
import { fmtEta } from "@/components/hospital/shared";
import type { HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// One occupied hospital bed: the patient, its live-healing HP bar + ETA, and the
// discharge/collect button (Collect once fully healed).
export default function PatientCard({
  patient,
  nowMs,
  busy,
  onDischarge,
}: {
  patient: HydratedRoostr;
  nowMs: number;
  busy: boolean;
  onDischarge: (id: string) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const p = patient;
  const cur = healedHp(p.currentHp, p.maxHealth, p.stats.Recovery ?? 0, p.hpAtMs, nowMs);
  const eta = healEtaMs(p.currentHp, p.maxHealth, p.stats.Recovery ?? 0, p.hpAtMs, nowMs);
  const pct = p.maxHealth > 0 ? (cur / p.maxHealth) * 100 : 100;
  const ready = eta <= 0;

  return (
    <Card sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
      <Box sx={{ aspectRatio: "1 / 1", border: 2, borderColor: "neutral.main", overflow: "hidden" }}>
        <RoostrAvatar traits={p.cosmetic} fill />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
        {p.nickname || p.breed.name[locale]}
      </Typography>
      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography
          variant="caption"
          sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums", color: "error.main" }}
        >
          ♥ {cur}/{p.maxHealth}
        </Typography>
        <Typography variant="caption" color={ready ? "success.main" : "text.secondary"}>
          {ready ? "✓" : fmtEta(eta)}
        </Typography>
      </Stack>
      <LinearProgress variant="determinate" color="error" value={pct} sx={{ height: 8, borderRadius: 0 }} />
      <Button
        size="small"
        variant={ready ? "contained" : "outlined"}
        color={ready ? "primary" : "neutral"}
        disabled={busy}
        onClick={() => onDischarge(p.id!)}
      >
        {ready ? t("hospital.collect") : t("hospital.discharge")}
      </Button>
    </Card>
  );
}
