"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import RoostrAvatar from "@/components/RoostrAvatar";
import CollectionCard from "@/components/CollectionCard";
import Popup from "@/components/Popup";
import { useNowTick } from "@/hooks/useNowTick";
import {
  healedHp,
  healEtaMs,
  maxHospitalSlots,
  nextHospitalSlotPrice,
} from "@/lib/hospital";
import type { HydratedRoostr } from "@/lib/roostr";
import {
  admitToHospitalAction,
  dischargeFromHospitalAction,
  buyHospitalSlotAction,
} from "@/app/hospital/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

function fmtEta(ms: number): string {
  if (ms <= 0) return "";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

const DASHED_TILE = {
  minHeight: 190,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  cursor: "pointer",
  border: "2px dashed",
  borderColor: "divider",
  bgcolor: "transparent",
  boxShadow: "none",
  color: "text.secondary",
  transition: "border-color 0.15s, color 0.15s",
} as const;

export default function HospitalView({
  patients,
  injured,
  slots,
}: {
  patients: HydratedRoostr[];
  injured: HydratedRoostr[];
  slots: number;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [pickOpen, setPickOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  const nowMs = useNowTick(4000, { enabled: patients.length > 0 }) ?? 0;

  const freeBeds = Math.max(0, slots - patients.length);
  const canBuy = slots < maxHospitalSlots();
  const slotPrice = nextHospitalSlotPrice(slots);

  // Most-wounded first (lowest HP ratio) so the neediest bird is easiest to pick.
  const sortedInjured = [...injured].sort(
    (a, b) =>
      (a.currentHp ?? a.maxHealth) / a.maxHealth - (b.currentHp ?? b.maxHealth) / b.maxHealth,
  );

  // Ward health = Σ healed / Σ max. Ward ETA = the SLOWEST patient (whole-ward heal).
  let wardEta = 0;
  const totals = patients.reduce(
    (acc, p) => {
      acc.cur += healedHp(p.currentHp, p.maxHealth, p.stats.Recovery ?? 0, p.hpAtMs, nowMs);
      acc.max += p.maxHealth;
      wardEta = Math.max(
        wardEta,
        healEtaMs(p.currentHp, p.maxHealth, p.stats.Recovery ?? 0, p.hpAtMs, nowMs),
      );
      return acc;
    },
    { cur: 0, max: 0 },
  );
  const wardPct = totals.max > 0 ? (totals.cur / totals.max) * 100 : 100;

  function admit() {
    if (!picked) return;
    start(async () => {
      const res = await admitToHospitalAction(picked);
      if (res.ok) {
        setPickOpen(false);
        setPicked(null);
        router.refresh();
      }
    });
  }
  function discharge(id: string) {
    start(async () => {
      const res = await dischargeFromHospitalAction(id);
      if (res.ok) router.refresh();
    });
  }
  function buySlot() {
    start(async () => {
      const res = await buyHospitalSlotAction();
      if (res.ok) router.refresh();
    });
  }

  return (
    <Stack spacing={2}>
      {/* ── Top: bg block with the whole-ward recovery progress ── */}
      <Card
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { xs: 180, md: 380 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 2, md: "20%" },
          py: { xs: 2, md: "13%" },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: "url(/bg/hospital.png)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: { xs: "cover", md: "100% 100%" },
          }}
        />
        <Stack
          spacing={1}
          sx={(theme) => ({
            position: "relative",
            zIndex: 1,
            bgcolor: {
              xs: alpha(theme.palette.background.paper, 0.78),
              md: "transparent",
            },
            borderRadius: { xs: 2, md: 0 },
            py: { xs: 1.5, md: 0 },
            px: { xs: "calc(12px + 10px)", md: "10px" },
          })}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Typography variant="h6" sx={{ fontWeight: 800 }}>
              🏥 {t("hospital.ward")}
            </Typography>
            <Chip
              label={`${patients.length} / ${slots}`}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ fontWeight: 800 }}
            />
          </Stack>

          {patients.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              {t("hospital.empty")}
            </Typography>
          ) : (
            <>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="text.secondary">
                  {t("hospital.wardHealth")}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  {totals.cur} / {totals.max} ♥
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                color="error"
                value={wardPct}
                sx={{ height: 14, borderRadius: 0 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                {wardEta > 0 ? t("hospital.fullIn", { time: fmtEta(wardEta) }) : t("hospital.allHealed")}
              </Typography>
            </>
          )}
        </Stack>
      </Card>

      {/* ── Bottom: patients + admit-patient + buy-bed (no bg, like the worker grid) ── */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 800 }}>
          {t("hospital.patients")} ({patients.length}/{slots})
        </Typography>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          {patients.map((p) => {
            const cur = healedHp(p.currentHp, p.maxHealth, p.stats.Recovery ?? 0, p.hpAtMs, nowMs);
            const eta = healEtaMs(p.currentHp, p.maxHealth, p.stats.Recovery ?? 0, p.hpAtMs, nowMs);
            const pct = p.maxHealth > 0 ? (cur / p.maxHealth) * 100 : 100;
            const ready = eta <= 0;
            return (
              <Card key={p.id} sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
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
                  onClick={() => discharge(p.id!)}
                >
                  {ready ? t("hospital.collect") : t("hospital.discharge")}
                </Button>
              </Card>
            );
          })}

          {freeBeds > 0 && (
            <Card
              component="button"
              type="button"
              disabled={busy}
              onClick={() => setPickOpen(true)}
              sx={{ ...DASHED_TILE, "&:hover": { borderColor: "primary.main", color: "primary.main" } }}
            >
              <Box sx={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Typography sx={{ fontSize: 28, lineHeight: 1 }}>＋</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("hospital.admit")}
              </Typography>
            </Card>
          )}

          {canBuy && slotPrice != null && (
            <Card
              component="button"
              type="button"
              disabled={busy}
              onClick={buySlot}
              sx={{ ...DASHED_TILE, "&:hover": { borderColor: "secondary.main", color: "secondary.main" } }}
            >
              <Box sx={{ width: 56, height: 56, borderRadius: "50%", border: "2px solid currentColor", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: (theme) => `3px 3px 0 ${theme.palette.neutral.main}` }}>
                <Typography sx={{ fontSize: 28, lineHeight: 1 }}>＋</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("hospital.buyBed")}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{slotPrice}</Typography>
                <Image src="/corn-coin.png" alt="" width={16} height={16} style={{ height: 14, width: "auto" }} />
              </Stack>
            </Card>
          )}
        </Box>
      </Box>

      <Popup
        open={pickOpen}
        onClose={() => !busy && setPickOpen(false)}
        title={t("hospital.pickTitle")}
        maxWidth="md"
        fullScreenOnMobile
      >
        <Stack spacing={2}>
          {injured.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t("hospital.noHurt")}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1.5,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {sortedInjured.map((r) => (
                <CollectionCard
                  key={r.id}
                  roostr={r}
                  compact
                  metric="hp"
                  selected={picked === r.id}
                  onClick={() => setPicked(picked === r.id ? null : (r.id ?? null))}
                />
              ))}
            </Box>
          )}
          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!picked || busy}
            onClick={admit}
            sx={{ position: "sticky", bottom: 0 }}
          >
            {busy ? <CircularProgress size={20} color="inherit" /> : t("hospital.admitConfirm")}
          </Button>
        </Stack>
      </Popup>
    </Stack>
  );
}
