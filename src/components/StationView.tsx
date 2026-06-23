"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard, { type CardMetric } from "@/components/CollectionCard";
import Popup from "@/components/Popup";
import type { HydratedRoostr } from "@/lib/roostr";
import {
  STATIONS,
  settlePending,
  MAX_SLOTS,
  type StationKind,
} from "@/lib/stations";
import {
  assignWorkerAction,
  removeWorkerAction,
  claimStationAction,
} from "@/app/stations/actions";
import { useT } from "@/i18n/I18nProvider";

const rid = (r: HydratedRoostr) => String(r.id ?? r.seed);

// Per-kind UI config — the engine (rate/stat/resource/cap) lives in lib/stations;
// this only maps visuals + i18n keys. Add a station = one entry here + in STATIONS.
const UI: Record<
  StationKind,
  {
    metric: CardMetric;
    bg: string;
    icon: string;
    titleKey: string;
    rateKey: string;
    hintKey: string;
    workersKey: string;
    emptyKey: string;
    addKey: string;
    buyKey: string;
    pickKey: string;
    selectKey: string;
    noneKey: string;
  }
> = {
  farm: {
    metric: "fertility",
    bg: "/bg/farm.png",
    icon: "/eggs.png",
    titleKey: "farm.production",
    rateKey: "farm.eggsPerDay",
    hintKey: "farm.hint",
    workersKey: "farm.workers",
    emptyKey: "farm.workersEmpty",
    addKey: "farm.addWorker",
    buyKey: "farm.buySlot",
    pickKey: "farm.pickTitle",
    selectKey: "farm.select",
    noneKey: "farm.noneAvailable",
  },
  lab: {
    metric: "intellect",
    bg: "/bg/lab.png",
    icon: "/sci.png",
    titleKey: "lab.research",
    rateKey: "lab.sciPerDay",
    hintKey: "lab.productivityHint",
    workersKey: "lab.workers",
    emptyKey: "lab.workersEmpty",
    addKey: "lab.addWorkers",
    buyKey: "lab.buySlot",
    pickKey: "lab.pickTitle",
    selectKey: "lab.select",
    noneKey: "lab.noneAvailable",
  },
};

// Shared station UI (lab / farm): top block = live production buffer + claim,
// bottom = workers (slot-capped) with a picker. Server-driven; mutations go through
// the shared actions then refresh. Buffer ticks live off the server timestamps.
export default function StationView({
  kind,
  workers,
  available,
  pending,
  lastSettleAtMs,
  slotsOwned,
}: {
  kind: StationKind;
  workers: HydratedRoostr[];
  available: HydratedRoostr[];
  pending: number;
  lastSettleAtMs: number;
  slotsOwned: number;
}) {
  const t = useT();
  const router = useRouter();
  const def = STATIONS[kind];
  const ui = UI[kind];

  const [busy, startBusy] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [now, setNow] = useState(lastSettleAtMs);

  // Tick the live buffer once a second.
  useEffect(() => {
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [pending, lastSettleAtMs]);

  const totalStat = useMemo(
    () => workers.reduce((s, r) => s + (r.stats[def.stat] ?? 0), 0),
    [workers, def.stat],
  );
  const ratePerDay = def.ratePerDay(totalStat, workers.length);
  const livePending = settlePending(
    def,
    pending,
    totalStat,
    workers.length,
    lastSettleAtMs,
    now,
  );
  const claimable = Math.floor(livePending);
  const bufferPct = Math.min(100, (livePending / def.bufferCap) * 100);
  const canAdd = workers.length < slotsOwned;

  function act(fn: () => Promise<unknown>) {
    startBusy(async () => {
      await fn();
      router.refresh();
    });
  }
  const assign = (id: string) => act(() => assignWorkerAction(kind, id));
  const remove = (id: string) => act(() => removeWorkerAction(kind, id));
  const claim = () => act(() => claimStationAction(kind));

  const closePicker = () => {
    setPickerOpen(false);
    setPickedId(null);
  };
  const confirmPick = () => {
    if (!pickedId) return;
    const id = pickedId;
    closePicker();
    assign(id);
  };

  return (
    <Stack spacing={3}>
      {/* ── Top: live production buffer + claim ── */}
      <Card
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { xs: 220, md: 300 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: "17%", md: "20%" },
          py: { xs: "12%", md: "13%" },
        }}
      >
        <Image
          src={ui.bg}
          alt=""
          fill
          priority
          sizes="(max-width: 900px) 100vw, 720px"
          style={{ objectFit: "fill", zIndex: 0 }}
        />
        <Stack spacing={2} sx={{ position: "relative", zIndex: 1 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
          >
            <Typography variant="h6">{t(ui.titleKey)}</Typography>
            <Chip
              color="success"
              label={t(ui.rateKey, { n: ratePerDay.toFixed(2) })}
              sx={{ fontWeight: 800 }}
            />
          </Stack>

          <Box>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="body2" color="text.secondary">
                {t("station.ready")}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Image
                  src={ui.icon}
                  alt=""
                  width={18}
                  height={18}
                  style={{ height: 18, width: "auto" }}
                />
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  {claimable} / {def.bufferCap}
                </Typography>
              </Stack>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={bufferPct}
              sx={{ height: 14, borderRadius: 7 }}
            />
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            <Typography variant="caption" color="text.secondary">
              {t(ui.hintKey)}
            </Typography>
            <Button
              variant="contained"
              onClick={claim}
              disabled={busy || claimable < 1}
            >
              {t("station.claim")}
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* ── Bottom: workers ── */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
          spacing={1}
          flexWrap="wrap"
        >
          <Typography variant="h6">
            {t(ui.workersKey)} ({workers.length}/{slotsOwned})
          </Typography>
          {slotsOwned < MAX_SLOTS && (
            <Button
              variant="outlined"
              color="neutral"
              disabled
              endIcon={
                <Chip label={t("pedia.soon")} size="small" variant="outlined" />
              }
            >
              {t(ui.buyKey)}
            </Button>
          )}
        </Stack>

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
          {workers.map((r) => (
            <CollectionCard
              key={rid(r)}
              roostr={r}
              metric={ui.metric}
              onClick={() => !busy && remove(rid(r))}
            />
          ))}

          {canAdd && (
            <Card
              component="button"
              type="button"
              disabled={busy}
              onClick={() => setPickerOpen(true)}
              sx={{
                minHeight: 180,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
                cursor: "pointer",
                border: "2px dashed",
                borderColor: "divider",
                bgcolor: "transparent",
                color: "text.secondary",
                transition: "border-color 0.15s, color 0.15s",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              <Typography sx={{ fontSize: 40, lineHeight: 1 }}>＋</Typography>
              <Typography variant="caption">{t(ui.addKey)}</Typography>
            </Card>
          )}
        </Box>

        {workers.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t(ui.emptyKey)}
          </Typography>
        )}
      </Box>

      {/* ── Picker: pick ONE rooster, confirm below ── */}
      <Popup
        open={pickerOpen}
        onClose={closePicker}
        title={t(ui.pickKey)}
        maxWidth="lg"
      >
        <Stack spacing={2}>
          {available.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t(ui.noneKey)}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "repeat(4, minmax(0, 1fr))",
                  sm: "repeat(6, minmax(0, 1fr))",
                },
              }}
            >
              {available.map((r) => (
                <CollectionCard
                  key={rid(r)}
                  roostr={r}
                  metric={ui.metric}
                  compact
                  selected={pickedId === rid(r)}
                  onClick={() => setPickedId(rid(r))}
                />
              ))}
            </Box>
          )}

          <Button
            variant="contained"
            size="large"
            fullWidth
            disabled={!pickedId || busy}
            onClick={confirmPick}
            sx={{ position: "sticky", bottom: 0 }}
          >
            {t(ui.selectKey)}
          </Button>
        </Stack>
      </Popup>
    </Stack>
  );
}
