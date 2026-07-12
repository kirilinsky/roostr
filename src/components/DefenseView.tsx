"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import StationWorkerCard from "@/components/StationWorkerCard";
import Popup from "@/components/Popup";
import { STATIONS, maxSlots, nextSlotPrice } from "@/lib/stations";
import {
  assignWorkerAction,
  removeWorkerAction,
  buyStationSlotAction,
} from "@/app/stations/actions";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

const rid = (r: HydratedRoostr) => String(r.id ?? r.seed);
const DEF_STAT = STATIONS.defense.stat; // "Crow" — Крик

// Base defense (дозор): a LIVE, no-accrual station. Guards on watch sum their Crow
// into the base's defense value; remove a guard and that defense is gone. One base
// slot + coin-bought expansions. Reuses the shared assign/remove/slot actions.
export default function DefenseView({
  workers,
  available,
  slotsOwned,
}: {
  workers: HydratedRoostr[];
  available: HydratedRoostr[];
  slotsOwned: number;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const defenseValue = workers.reduce(
    (s, r) => s + (r.stats[DEF_STAT] ?? 0),
    0,
  );
  const canAdd = workers.length < slotsOwned;
  // Pick list sorted by Crow (the defense stat), strongest first.
  const sortedAvailable = [...available].sort(
    (a, b) => (b.stats[DEF_STAT] ?? 0) - (a.stats[DEF_STAT] ?? 0),
  );

  function act(fn: () => Promise<unknown>) {
    start(async () => {
      await fn();
      router.refresh();
    });
  }
  const remove = (id: string) => act(() => removeWorkerAction("defense", id));
  const buySlot = () =>
    start(async () => {
      const res = await buyStationSlotAction("defense");
      if (!res.ok) {
        if (res.error === "funds") window.alert(t("station.slotFunds"));
        return;
      }
      router.refresh();
    });

  const closePicker = () => {
    setPickerOpen(false);
    setPickedId(null);
  };
  const confirmPick = () => {
    if (!pickedId) return;
    const id = pickedId;
    start(async () => {
      const res = await assignWorkerAction("defense", id);
      if (!res.ok) {
        window.alert(
          res.error === "full" ? t("station.full") : t("station.assignError"),
        );
        return;
      }
      router.refresh();
      closePicker();
    });
  };

  const dashedSx = {
    minHeight: 180,
    display: "flex",
    flexDirection: "column" as const,
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
  };

  return (
    <Stack spacing={3}>
      {/* Hero — same format as the lab/farm station block (bg art, centered content,
          mobile scrim, no darkening); just the live defense value, no bar/buttons. */}
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
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: "url(/bg/defense.png)",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "center",
            backgroundSize: { xs: "cover", md: "100% 100%" },
          }}
        />
        <Stack
          spacing={1}
          alignItems="center"
          textAlign="center"
          sx={(theme) => ({
            position: "relative",
            zIndex: 1,
            bgcolor: {
              xs: alpha(theme.palette.background.paper, 0.78),
              md: "transparent",
            },
            p: { xs: 1.5, md: 0 },
          })}
        >
          <Typography variant="overline" color="text.secondary">
            {t("defense.baseDefense")}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <Image
              src="/defense.png"
              alt=""
              width={40}
              height={40}
              style={{ height: 38, width: "auto" }}
            />
            <Typography
              variant="h3"
              sx={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}
            >
              {defenseValue}
            </Typography>
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ maxWidth: 440 }}
          >
            {t("defense.hint")}
          </Typography>
        </Stack>
      </Card>

      {/* Guards */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {t("defense.guards")} ({workers.length}/{slotsOwned})
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
          {workers.map((r) => (
            <StationWorkerCard
              key={rid(r)}
              roostr={r}
              statId={DEF_STAT}
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
                ...dashedSx,
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
                {t("defense.assign")}
              </Typography>
            </Card>
          )}

          {slotsOwned < maxSlots("defense") && (
            <Card
              component="button"
              type="button"
              disabled={busy}
              onClick={buySlot}
              sx={{
                ...dashedSx,
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
                {t("defense.buySlot")}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Typography
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  {nextSlotPrice("defense", slotsOwned)}
                </Typography>
                <Image
                  src="/corn-coin.png"
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
            {t("defense.empty")}
          </Typography>
        )}
      </Box>

      {/* Picker — pick a guard */}
      <Popup
        open={pickerOpen}
        onClose={closePicker}
        title={t("defense.pickTitle")}
        maxWidth="lg"
        fullScreenOnMobile
      >
        <Stack spacing={2}>
          {sortedAvailable.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t("defense.none")}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 1,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(4, minmax(0, 1fr))",
                  md: "repeat(6, minmax(0, 1fr))",
                },
              }}
            >
              {sortedAvailable.map((r) => (
                <CollectionCard
                  key={rid(r)}
                  roostr={r}
                  metric="crow"
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
              t("defense.select")
            )}
          </Button>
        </Stack>
      </Popup>
    </Stack>
  );
}
