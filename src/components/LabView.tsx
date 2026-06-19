"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import Popup from "@/components/Popup";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

const intel = (r: HydratedRoostr) => r.stats.Intellect ?? 0;
const rid = (r: HydratedRoostr) => String(r.id ?? r.seed);
const byIntel = (a: HydratedRoostr, b: HydratedRoostr) => intel(b) - intel(a);

// Laboratory — VISUAL ONLY (no research logic yet). Top block: research progress
// + total science/hour = sum of attached workers' Intellect. Bottom: worker
// roster (Intellect cards) with a + tile opening an Intellect-sorted picker.
export default function LabView({ roostrs }: { roostrs: HydratedRoostr[] }) {
  const t = useT();
  const [workerIds, setWorkerIds] = useState<string[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const removeWorker = (r: HydratedRoostr) =>
    setWorkerIds((s) => s.filter((x) => x !== rid(r)));

  const closePicker = () => {
    setPickerOpen(false);
    setPickedId(null);
  };
  const confirmPick = () => {
    if (!pickedId) return;
    setWorkerIds((s) => (s.includes(pickedId) ? s : [...s, pickedId]));
    closePicker();
  };

  const workers = useMemo(
    () => roostrs.filter((r) => workerIds.includes(rid(r))).sort(byIntel),
    [roostrs, workerIds],
  );
  // Picker lists only roosters not already working, sorted by Intellect.
  const available = useMemo(
    () => roostrs.filter((r) => !workerIds.includes(rid(r))).sort(byIntel),
    [roostrs, workerIds],
  );
  const productivity = workers.reduce((sum, r) => sum + intel(r), 0);

  return (
    <Stack spacing={3}>
      {/* ── Top: research progress + productivity (placeholder values) ── */}
      <Card
        sx={{
          position: "relative",
          overflow: "hidden",
          minHeight: { xs: 220, md: 300 },
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          // inset content into the frame's inner panel; percentages track the
          // stretched frame art at any card size
          px: { xs: "17%", md: "20%" },
          py: { xs: "12%", md: "13%" },
        }}
      >
        {/* frame art as an optimized, eagerly-loaded layer — no CSS-bg flicker */}
        <Image
          src="/bg/lab.png"
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
            <Typography variant="h6">{t("lab.research")}</Typography>
            <Chip
              color="success"
              label={t("lab.perHour", { n: String(productivity) })}
              sx={{ fontWeight: 800 }}
            />
          </Stack>

          <Box>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" color="text.secondary">
                {t("lab.researchTba")}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                35%
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={35}
              sx={{ height: 14, borderRadius: 7 }}
            />
          </Box>

          <Typography variant="caption" color="text.secondary">
            {t("lab.productivityHint")}
          </Typography>
        </Stack>
      </Card>

      {/* ── Bottom: workers ── */}
      <Box>
        <Typography variant="h6" sx={{ mb: 1.5 }}>
          {t("lab.workers")}
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
            <CollectionCard
              key={rid(r)}
              roostr={r}
              metric="intellect"
              onClick={() => removeWorker(r)}
            />
          ))}

          {/* + tile → picker */}
          <Card
            component="button"
            type="button"
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
            <Typography variant="caption">{t("lab.addWorkers")}</Typography>
          </Card>
        </Box>

        {workers.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            {t("lab.workersEmpty")}
          </Typography>
        )}
      </Box>

      {/* ── Picker: pick ONE rooster (sorted by Intellect), confirm below ── */}
      <Popup
        open={pickerOpen}
        onClose={closePicker}
        title={t("lab.pickTitle")}
        maxWidth="lg"
      >
        <Stack spacing={2}>
          {available.length === 0 ? (
            <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
              {t("lab.noneAvailable")}
            </Typography>
          ) : (
            <Box
              sx={{
                display: "grid",
                gap: 2,
                gridTemplateColumns: {
                  xs: "repeat(2, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
              }}
            >
              {available.map((r) => (
                <CollectionCard
                  key={rid(r)}
                  roostr={r}
                  metric="intellect"
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
            disabled={!pickedId}
            onClick={confirmPick}
            sx={{ position: "sticky", bottom: 0 }}
          >
            {t("lab.select")}
          </Button>
        </Stack>
      </Popup>
    </Stack>
  );
}
