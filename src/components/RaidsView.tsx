"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatar from "@/components/RoostrAvatar";
import CollectionCard from "@/components/CollectionCard";
import Popup from "@/components/Popup";
import ResourceIcon from "@/components/ResourceIcon";
import RaidInFlightBanner from "@/components/raids/RaidInFlightBanner";
import RaidTermsStrip from "@/components/raids/RaidTermsStrip";
import RaidLogList from "@/components/raids/RaidLogList";
import RaidResultPopup from "@/components/raids/RaidResultPopup";
import {
  Metric,
  dashedSx,
  fmtDuration,
  type ActiveRaidUi,
  type RaidLogEntry,
  type RaidOutcome,
} from "@/components/raids/shared";
import { useNowTick } from "@/hooks/useNowTick";
import {
  buyRaidSlotAction,
  launchRaidAction,
  collectRaidAction,
} from "@/app/raids/actions";
import {
  maxRaidSlots,
  nextRaidSlotPrice,
  partyPower,
  partyLuck,
  partySpeed,
  raidSuccess,
  raidDurationMs,
  raidLoot,
  canJoinRaid,
  RAID_FEATHER_COST,
  RAID_MIN_HP,
  type RaidBot,
} from "@/lib/raids";
import type { HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Re-exported so the page (and older imports) keep one import site.
export type { ActiveRaidUi, RaidLogEntry } from "@/components/raids/shared";

const rid = (r: HydratedRoostr) => String(r.id ?? r.seed);

// Raids window (Coop & Dagger) — PHASE 2: assemble a party, pick a BOT target,
// launch (1 feather), wait the timer out, Collect. The raid contract (cost, HP
// risk, egg chance) is printed right on the window so conditions are legible
// before committing. One raid in flight per player. Presentational sections live
// in src/components/raids/*; this file owns the state + actions.
export default function RaidsView({
  available,
  slotsOwned,
  targets,
  feathers,
  activeRaid,
  history = [],
}: {
  available: HydratedRoostr[];
  slotsOwned: number;
  targets: RaidBot[];
  feathers: number;
  activeRaid: ActiveRaidUi | null;
  history?: RaidLogEntry[];
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, start] = useTransition();
  const [party, setParty] = useState<HydratedRoostr[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [targetPickerOpen, setTargetPickerOpen] = useState(false);
  const [outcome, setOutcome] = useState<RaidOutcome | null>(null);
  // Live clock (30s tick) while a raid is in flight — null pre-mount, so the SSR
  // HTML never bakes a server-side Date.now() (no hydration mismatch).
  const nowMs = useNowTick(30_000, { enabled: Boolean(activeRaid) });
  const now = nowMs ?? 0;

  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const target = targets.find((tg) => tg.id === targetId) ?? targets[0];

  const power = partyPower(party);
  const luck = partyLuck(party);
  const speed = partySpeed(party);
  const success = raidSuccess(power, target.watch);
  const canAdd = party.length < slotsOwned;

  // Duration + loot preview — only meaningful once a party is set.
  const hasParty = party.length > 0;
  const durationMs = raidDurationMs(target.watch, speed);
  const durationLabel = hasParty ? fmtDuration(durationMs, locale) : "—";
  const loot = hasParty ? raidLoot(luck, target.coinPool, target.watch) : 0;

  const inParty = new Set(party.map(rid));
  // Too-hurt birds (HP ≤ worst-case toll) are benched — heal first, raid later.
  const pickable = available
    .filter((r) => !inParty.has(rid(r)) && canJoinRaid(r.currentHp, r.maxHealth))
    .sort((a, b) => (b.stats.Stealth ?? 0) - (a.stats.Stealth ?? 0));
  const benched = available.filter(
    (r) => !inParty.has(rid(r)) && !canJoinRaid(r.currentHp, r.maxHealth),
  ).length;

  const removeFromParty = (id: string) =>
    setParty((p) => p.filter((r) => rid(r) !== id));
  const addToParty = (r: HydratedRoostr) => {
    setParty((p) => [...p, r]);
    setPickerOpen(false);
  };

  const buySlot = () =>
    start(async () => {
      const res = await buyRaidSlotAction();
      if (!res.ok) {
        if (res.error === "coins") window.alert(t("station.slotFunds"));
        return;
      }
      router.refresh();
    });

  const launch = () =>
    start(async () => {
      const res = await launchRaidAction(
        target.id,
        party.map((r) => r.id!).filter(Boolean),
      );
      if (res.ok) {
        setParty([]);
        router.refresh();
      } else if (res.reason === "feather") {
        window.alert(t("raids.noFeather"));
      } else if (res.reason === "busy") {
        router.refresh();
      }
    });

  const collect = () =>
    start(async () => {
      const res = await collectRaidAction(activeRaid!.id);
      if (res.ok) {
        setOutcome(res);
        router.refresh();
      } else {
        // "early" (clock skew) or any other failure → refresh re-syncs the timer.
        router.refresh();
      }
    });

  const canLaunch =
    hasParty && !busy && !activeRaid && feathers >= RAID_FEATHER_COST;

  // Fixed grid of `slotsOwned` cells: filled = a party member, else an "add" tile.
  const slots = Array.from({ length: slotsOwned }, (_, i) => party[i] ?? null);
  const nextPrice = nextRaidSlotPrice(slotsOwned);

  return (
    <Stack spacing={2}>
      {/* ── Mission in flight — replaces the whole staging UI until collected ── */}
      {activeRaid && (
        <RaidInFlightBanner raid={activeRaid} now={now} busy={busy} onCollect={collect} />
      )}

      {/* Target hero (title + bg card) — hidden entirely while the party is away:
          the in-flight banner IS the whole story until Collect. */}
      {!activeRaid && (
        <>
          {/* Title above the hero on mobile (off the image) — mirrors StationView. */}
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            sx={{ display: { xs: "flex", md: "none" } }}
          >
            <Typography variant="h6">{t("raids.target")}</Typography>
          </Stack>

          {/* ── Top: the target coop (same hero card as the stations) ── */}
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
                backgroundImage: "url(/bg/raids.png)",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "center",
                backgroundSize: { xs: "cover", md: "100% 100%" },
              }}
            />
            <Stack
              spacing={2}
              sx={(theme) => ({
                position: "relative",
                zIndex: 1,
                bgcolor: {
                  xs: alpha(theme.palette.background.paper, 0.78),
                  md: "transparent",
                },
                borderRadius: { xs: 2, md: 0 },
                p: { xs: 1.5, md: 0 },
              })}
            >
              {/* Title — desktop only here; on mobile it's above the card. */}
              <Typography variant="h6" sx={{ display: { xs: "none", md: "block" } }}>
                {t("raids.target")}
              </Typography>

              <Box>
                {/* Who we're raiding */}
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }} noWrap>
                  🏠 {target.name[locale]}
                </Typography>
                {/* Labeled readout — reads at a glance. "—" until a party is set. */}
                <Box
                  sx={{
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(3, 1fr)" },
                    gap: 1,
                  }}
                >
                  <Metric icon="🛡" label={t("raids.watch")} value={target.watch} />
                  <Metric icon="🥷" label={t("raids.power")} value={hasParty ? power : "—"} />
                  <Metric icon="🍀" label={t("raids.luck")} value={hasParty ? luck : "—"} />
                  <Metric icon="⏱" label={t("raids.time")} value={durationLabel} />
                  <Metric icon="💰" label={t("raids.loot")} value={hasParty ? `~${loot}` : "—"} />
                  <Metric
                    icon="🎲"
                    label={t("raids.odds")}
                    value={`${hasParty ? Math.round(success * 100) : 0}%`}
                    color={hasParty ? "success.main" : undefined}
                  />
                </Box>
              </Box>

              <Stack
                direction={{ xs: "column", md: "row" }}
                justifyContent="space-between"
                alignItems={{ md: "center" }}
                spacing={1}
              >
                <Button
                  variant="outlined"
                  onClick={() => setTargetPickerOpen(true)}
                  sx={{ width: { xs: "100%", md: "auto" } }}
                >
                  🎯 {t("raids.chooseTarget")}
                </Button>
                <Button
                  variant="contained"
                  disabled={!canLaunch}
                  onClick={launch}
                  sx={{ width: { xs: "100%", md: "auto" }, ml: { md: "auto" } }}
                >
                  {busy ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <>
                      🗡 {t("raids.launch")} · {RAID_FEATHER_COST}{" "}
                      <ResourceIcon kind="feather" size={14} />
                    </>
                  )}
                </Button>
              </Stack>
            </Stack>
          </Card>
        </>
      )}

      {/* The raid contract — every cost and chance, flat and visible. */}
      <RaidTermsStrip feathers={feathers} />

      {/* Party — hidden entirely while a raid is in flight (the crew is away;
          staging an empty grid under "one raid at a time" just reads as noise). */}
      {!activeRaid && (
        <>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">
              {t("raids.party")} ({party.length}/{slotsOwned})
            </Typography>
            {luck > 0 && (
              <Chip size="small" variant="outlined" label={`🍀 ${luck}`} sx={{ fontWeight: 700 }} />
            )}
          </Stack>

          <Box
            sx={{
              display: "grid",
              gap: 1,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
                md: "repeat(4, minmax(0, 1fr))",
              },
            }}
          >
            {slots.map((r, i) =>
              r ? (
                <Card key={rid(r)} sx={{ p: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Box sx={{ width: 44, height: 44, flexShrink: 0, position: "relative" }}>
                      <RoostrAvatar traits={r.cosmetic} fill />
                    </Box>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                        {r.nickname || r.breed.name[locale]}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        🥷 {r.stats.Stealth ?? 0} · 🍀 {r.stats.Luck ?? 0}
                      </Typography>
                    </Box>
                  </Stack>
                  <Button
                    size="small"
                    variant="outlined"
                    color="neutral"
                    onClick={() => removeFromParty(rid(r))}
                  >
                    {t("raids.remove")}
                  </Button>
                </Card>
              ) : canAdd && i === party.length ? (
                <Card key={`add-${i}`} variant="surface" onClick={() => setPickerOpen(true)} sx={dashedSx}>
                  <IconButton component="span" aria-label={t("raids.addRaider")} sx={{ fontSize: 28 }}>
                    +
                  </IconButton>
                  <Typography variant="caption">{t("raids.addRaider")}</Typography>
                </Card>
              ) : (
                <Card
                  key={`empty-${i}`}
                  variant="surface"
                  sx={{ ...dashedSx, cursor: "default", "&:hover": {} }}
                >
                  <Typography variant="caption" color="text.disabled">
                    {t("raids.emptySlot")}
                  </Typography>
                </Card>
              ),
            )}

            {/* Buy the next raider slot. */}
            {slotsOwned < maxRaidSlots() && nextPrice != null && (
              <Card
                variant="surface"
                onClick={busy ? undefined : buySlot}
                sx={{ ...dashedSx, opacity: busy ? 0.6 : 1 }}
              >
                <Typography sx={{ fontSize: 22, lineHeight: 1 }}>🔒</Typography>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  {t("raids.buySlot")}
                </Typography>
                <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.375 }}>
                  <Image src="/corn-coin.png" alt="" width={16} height={15} style={{ height: 14, width: "auto" }} />
                  <Typography variant="caption" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                    {nextPrice}
                  </Typography>
                </Box>
              </Card>
            )}
          </Box>
        </>
      )}

      {/* Raid log — latest 3 + "view all" into /raids/history. */}
      <RaidLogList history={history} />

      {/* Target picker — bot coops (real players return in phase 3). */}
      <Popup
        open={targetPickerOpen}
        onClose={() => setTargetPickerOpen(false)}
        title={t("raids.chooseTarget")}
        maxWidth="md"
        fullScreenOnMobile
      >
        <Box
          sx={{
            display: "grid",
            gap: 1,
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
          {targets.map((tg) => {
            const selected = tg.id === target.id;
            const tgLoot = hasParty ? raidLoot(luck, tg.coinPool, tg.watch) : null;
            return (
              <Card
                key={tg.id}
                onClick={() => {
                  setTargetId(tg.id);
                  setTargetPickerOpen(false);
                }}
                sx={{
                  p: 1,
                  cursor: "pointer",
                  borderColor: selected ? "primary.main" : "divider",
                  boxShadow: selected ? 4 : undefined,
                  transition: "border-color .15s",
                  "&:hover": { borderColor: "primary.main" },
                }}
              >
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  {tg.name[locale]}
                </Typography>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                  <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.375 }}>
                    <Image src="/defense.png" alt="" width={14} height={14} style={{ height: 13, width: "auto" }} />
                    <Typography variant="caption" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                      {tg.watch}
                    </Typography>
                  </Box>
                  {tgLoot != null && (
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.375 }}>
                      <Image src="/corn-coin.png" alt="" width={14} height={13} style={{ height: 12, width: "auto" }} />
                      <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                        ~{tgLoot}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Card>
            );
          })}
        </Box>
      </Popup>

      {/* Picker — choose a raider (Stealth-sorted; too-hurt birds are benched). */}
      <Popup
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        title={t("raids.pickTitle")}
        maxWidth="lg"
        fullScreenOnMobile
      >
        {pickable.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            {t("raids.none")}
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
            {pickable.map((r) => (
              <CollectionCard
                key={rid(r)}
                roostr={r}
                metric="stealth"
                compact
                onClick={() => addToParty(r)}
              />
            ))}
          </Box>
        )}
        {benched > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>
            🏥 {t("raids.benched", { n: benched, hp: RAID_MIN_HP })}
          </Typography>
        )}
      </Popup>

      {/* Raid result — the full debrief. */}
      <RaidResultPopup outcome={outcome} onClose={() => setOutcome(null)} />
    </Stack>
  );
}
