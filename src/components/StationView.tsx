"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard, { type CardMetric } from "@/components/CollectionCard";
import StationWorkerCard from "@/components/StationWorkerCard";
import Popup from "@/components/Popup";
import type { HydratedRoostr } from "@/lib/roostr";
import {
  STATIONS,
  settlePending,
  maxSlots,
  nextSlotPrice,
  type StationKind,
} from "@/lib/stations";
import {
  assignWorkerAction,
  removeWorkerAction,
  claimStationAction,
  buyStationSlotAction,
} from "@/app/stations/actions";
import type { ResourceKind } from "@/db/queries";
import { syncProfileAchievementsAction } from "@/app/achievements/actions";
import { useAchievementToasts } from "@/components/useAchievementToasts";
import { useT } from "@/i18n/I18nProvider";

const rid = (r: HydratedRoostr) => String(r.id ?? r.seed);

// Resource icons for the slot-cost label — same art as the HUD (ResourceBar).
const SLOT_ICON: Record<ResourceKind, string> = {
  coin: "/corn-coin.png",
  sci: "/sci.png",
  egg: "/eggs.png",
  feather: "/feather.png",
};

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
  // Just-claimed amount → a floating "+N" that rises over the buffer. `key` restarts
  // the CSS animation on repeat claims.
  const [reward, setReward] = useState<{ n: number; key: number } | null>(null);

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
  // Per-worker hourly contribution — the station's daily rate split by stat share.
  const workerRateHr = (r: HydratedRoostr) => {
    const s = r.stats[def.stat] ?? 0;
    return totalStat > 0 ? (ratePerDay * (s / totalStat)) / 24 : 0;
  };
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

  // Countdown to the next WHOLE unit (continuous accrual → next integer crossing).
  const dayShort = t("station.dayShort");
  const fmt = (ms: number) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const d = Math.floor(s / 86400);
    const pad = (n: number) => String(n).padStart(2, "0");
    const hms = `${pad(Math.floor((s % 86400) / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
    return d > 0 ? `${d}${dayShort} ${hms}` : hms;
  };
  const nextWhole = claimable + 1;
  const countdown =
    workers.length === 0 || ratePerDay <= 0
      ? t("station.idle")
      : livePending >= def.bufferCap || nextWhole > def.bufferCap
        ? t("station.bufferFull")
        : t("station.nextIn", {
            time: fmt(((nextWhole - livePending) / ratePerDay) * 86_400_000),
          });

  function act(fn: () => Promise<unknown>) {
    startBusy(async () => {
      await fn();
      router.refresh();
    });
  }
  const remove = (id: string) => act(() => removeWorkerAction(kind, id));
  // One-time +1 slot unlock. Funds error → alert; success → refresh (cap reflects).
  const buySlot = () =>
    startBusy(async () => {
      const res = await buyStationSlotAction(kind);
      if (!res.ok) {
        if (res.error === "funds") window.alert(t("station.slotFunds"));
        return;
      }
      router.refresh();
    });
  // Claim, then immediately sync profile achievements so an unlock (e.g. first
  // science point → "first-sci") toasts right here at claim time, not only when
  // the player next opens their profile.
  const toastAchievements = useAchievementToasts();
  const claim = () =>
    startBusy(async () => {
      const amount = claimable; // snapshot before the buffer resets
      const res = await claimStationAction(kind);
      router.refresh();
      if (res.ok) {
        if (amount > 0) setReward({ n: amount, key: Date.now() });
        const newlyUnlocked = await syncProfileAchievementsAction();
        toastAchievements(newlyUnlocked);
      }
    });

  const closePicker = () => {
    setPickerOpen(false);
    setPickedId(null);
  };
  // Keep the modal open with a loader until the assign response lands, then close.
  const confirmPick = () => {
    if (!pickedId) return;
    const id = pickedId;
    startBusy(async () => {
      const res = await assignWorkerAction(kind, id);
      if (!res.ok) {
        // TODO: replace with a proper notification/toast later
        window.alert(
          res.error === "full" ? t("station.full") : t("station.assignError"),
        );
        return; // keep the modal open so the player can retry
      }
      router.refresh();
      closePicker();
    });
  };

  return (
    <Stack spacing={2}>
      {/* Title + rate above the hero on mobile (off the image), so the card stays
          the visible artwork. On desktop the title/rate live inside the card. */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        spacing={1}
        flexWrap="wrap"
        sx={{ display: { xs: "flex", md: "none" } }}
      >
        <Typography variant="h6">{t(ui.titleKey)}</Typography>
        <Chip
          color="success"
          label={t(ui.rateKey, { n: ratePerDay.toFixed(2) })}
          sx={{ fontWeight: 800 }}
        />
      </Stack>

      {/* ── Top: live production buffer + claim ── */}
      <Card
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { xs: 150, md: 300 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          px: { xs: 2, md: "20%" },
          py: { xs: 2, md: "13%" },
        }}
      >
        {/* Decorative bg — stretch-to-fill on desktop (unchanged), cover on mobile
            so the art isn't squished by the card's shape. */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: `url(${ui.bg})`,
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: { xs: "cover", md: "100% 100%" },
          }}
        />
        <Stack
          spacing={2}
          sx={{
            position: "relative",
            zIndex: 1,
            // Mobile: a translucent panel behind the text so it stays readable over
            // the busy artwork. Desktop is unchanged (no panel).
            bgcolor: {
              xs: (theme) => alpha(theme.palette.background.paper, 0.78),
              md: "transparent",
            },
            borderRadius: { xs: 2, md: 0 },
            p: { xs: 1.5, md: 0 },
          }}
        >
          {/* Title + rate — desktop only here; on mobile they're above the card. */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            sx={{ display: { xs: "none", md: "flex" } }}
          >
            <Typography variant="h6">{t(ui.titleKey)}</Typography>
            <Chip
              color="success"
              label={t(ui.rateKey, { n: ratePerDay.toFixed(2) })}
              sx={{ fontWeight: 800 }}
            />
          </Stack>

          <Box sx={{ position: "relative" }}>
            {/* Floating "+N" reward that rises over the bar on claim. */}
            {reward && (
              <Box
                key={reward.key}
                onAnimationEnd={() => setReward(null)}
                sx={{
                  position: "absolute",
                  top: -2,
                  left: "50%",
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  fontWeight: 900,
                  fontSize: "1.1rem",
                  color: "secondary.main",
                  pointerEvents: "none",
                  zIndex: 2,
                  textShadow: (theme) =>
                    `0 1px 4px ${theme.palette.background.paper}`,
                  animation: "roostrClaimRise 1.1s ease-out forwards",
                  "@keyframes roostrClaimRise": {
                    "0%": {
                      opacity: 0,
                      transform: "translate(-50%, 10px) scale(0.8)",
                    },
                    "18%": { opacity: 1 },
                    "100%": {
                      opacity: 0,
                      transform: "translate(-50%, -30px) scale(1.12)",
                    },
                  },
                }}
              >
                +{reward.n}
                <Image
                  src={ui.icon}
                  alt=""
                  width={18}
                  height={18}
                  style={{ height: 16, width: "auto" }}
                />
              </Box>
            )}
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
              sx={{
                height: 14,
                borderRadius: 0,
                // Smooth, eased rollback when the buffer resets after a claim.
                "& .MuiLinearProgress-bar": {
                  transition: "transform .6s cubic-bezier(.4,0,.2,1)",
                },
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mt: 0.5, display: "block", fontVariantNumeric: "tabular-nums" }}
            >
              {countdown}
            </Typography>
          </Box>

          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
          >
            {/* Hint hidden here on mobile — it's rendered below the card instead. */}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: { xs: "none", md: "block" } }}
            >
              {t(ui.hintKey)}
            </Typography>
            <Button
              variant="contained"
              onClick={claim}
              disabled={busy || claimable < 1}
              sx={{ width: { xs: "100%", md: "auto" } }}
            >
              {t("station.claim")}
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* Hint moved out of the hero on mobile so the card stays compact + uncrowded. */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: { xs: "block", md: "none" }, mt: -1.5 }}
      >
        {t(ui.hintKey)}
      </Typography>

      {/* ── Bottom: workers ── */}
      <Box>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          sx={{ mb: 1.5 }}
          spacing={1}
        >
          <Typography variant="h6" noWrap sx={{ minWidth: 0 }}>
            {t(ui.workersKey)} ({workers.length}/{slotsOwned})
          </Typography>
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
            <StationWorkerCard
              key={rid(r)}
              roostr={r}
              statId={def.stat}
              rateHr={workerRateHr(r)}
              busy={busy}
              onRemove={() => !busy && remove(rid(r))}
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
                gap: 1.5,
                cursor: "pointer",
                border: "2px dashed",
                borderColor: "divider",
                bgcolor: "transparent",
                boxShadow: "none",
                color: "text.secondary",
                transition: "border-color 0.15s, color 0.15s",
                "&:hover": { borderColor: "primary.main", color: "primary.main" },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "2px solid currentColor",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Typography sx={{ fontSize: 28, lineHeight: 1 }}>＋</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t(ui.addKey)}
              </Typography>
            </Card>
          )}

          {/* Buy / unlock the next worker slot — same dashed slot, shows the price. */}
          {slotsOwned < maxSlots(kind) && (
            <Card
              component="button"
              type="button"
              disabled={busy}
              onClick={buySlot}
              sx={{
                minHeight: 180,
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
                "&:hover": {
                  borderColor: "secondary.main",
                  color: "secondary.main",
                },
              }}
            >
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  border: "2px solid currentColor",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: (theme) => `3px 3px 0 ${theme.palette.neutral.main}`,
                }}
              >
                <Typography sx={{ fontSize: 28, lineHeight: 1 }}>＋</Typography>
              </Box>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t(ui.buyKey)}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  {nextSlotPrice(kind, slotsOwned)}
                </Typography>
                <Image
                  src={SLOT_ICON[def.slotCost.resource]}
                  alt=""
                  width={16}
                  height={16}
                  style={{ height: 14, width: "auto" }}
                />
              </Stack>
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
            {busy ? (
              <CircularProgress size={26} color="inherit" />
            ) : (
              t(ui.selectKey)
            )}
          </Button>
        </Stack>
      </Popup>
    </Stack>
  );
}
