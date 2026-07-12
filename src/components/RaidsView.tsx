"use client";

import { useEffect, useState, useTransition } from "react";
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
  raidBotById,
  RAID_FEATHER_COST,
  RAID_HP_COST_WIN,
  RAID_HP_COST_LOSS,
  RAID_EGG_CHANCE,
  type RaidBot,
} from "@/lib/raids";
import type { HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// The attacker's raid in flight (server snapshot, display-ready).
export interface ActiveRaidUi {
  id: string;
  botId: string;
  endsAt: number; // ms epoch
  power: number;
  defense: number;
  luck: number;
  pool: number;
  partySize: number;
}

// Collect outcome for the result popup.
interface RaidOutcome {
  success: boolean;
  lootCoins: number;
  lootEggs: number;
  wasConsolation: boolean;
}

// One resolved raid for the log (display-ready).
export interface RaidLogEntry {
  id: string;
  botId: string;
  success: boolean;
  lootCoins: number;
  lootEggs: number;
  at: number; // ms epoch (resolvedAt)
}

const rid = (r: HydratedRoostr) => String(r.id ?? r.seed);

// ms → compact "Nh Nm" / "Nч Nм".
function fmtDuration(ms: number, locale: string): string {
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
function Metric({
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

const dashedSx = {
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

// Raids window (Coop & Dagger) — PHASE 2: assemble a party, pick a BOT target,
// launch (1 feather), wait the timer out, Collect. The raid contract (cost, HP
// risk, egg chance) is printed right on the window so conditions are legible
// before committing. One raid in flight per player.
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
  // Tick every 30s while a raid is in flight so the countdown/Collect stay fresh.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeRaid) return;
    const iv = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(iv);
  }, [activeRaid]);

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
  const loot = hasParty ? raidLoot(luck, target.coinPool) : 0;

  const inParty = new Set(party.map(rid));
  const pickable = available
    .filter((r) => !inParty.has(rid(r)))
    .sort((a, b) => (b.stats.Stealth ?? 0) - (a.stats.Stealth ?? 0));

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
      } else if (res.reason === "early") {
        setNow(Date.now());
      } else {
        router.refresh();
      }
    });

  const canLaunch =
    hasParty && !busy && !activeRaid && feathers >= RAID_FEATHER_COST;

  // In-flight readout (snapshots from the server row).
  const flight = activeRaid
    ? {
        bot: raidBotById(activeRaid.botId),
        left: activeRaid.endsAt - now,
        odds: raidSuccess(activeRaid.power, activeRaid.defense),
        loot: raidLoot(activeRaid.luck, activeRaid.pool),
        done: now >= activeRaid.endsAt,
      }
    : null;

  // Fixed grid of `slotsOwned` cells: filled = a party member, else an "add" tile.
  const slots = Array.from({ length: slotsOwned }, (_, i) => party[i] ?? null);
  const nextPrice = nextRaidSlotPrice(slotsOwned);

  return (
    <Stack spacing={2}>
      {/* ── Mission in flight — replaces the launch controls until collected ── */}
      {activeRaid && flight && (
        <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "secondary.main" }}>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1.5}
            alignItems={{ md: "center" }}
            justifyContent="space-between"
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 800 }}>
                🗡 {t("raids.inFlight", { target: flight.bot?.name[locale] ?? "…" })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {t("raids.inFlightMeta", {
                  party: activeRaid.partySize,
                  odds: Math.round(flight.odds * 100),
                  loot: flight.loot,
                })}
              </Typography>
            </Box>
            {flight.done ? (
              <Button variant="contained" color="secondary" onClick={collect} disabled={busy}>
                {busy ? <CircularProgress size={20} color="inherit" /> : `🎒 ${t("raids.collect")}`}
              </Button>
            ) : (
              <Chip
                label={`⏳ ${fmtDuration(flight.left, locale)}`}
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", alignSelf: { xs: "flex-start", md: "center" } }}
              />
            )}
          </Stack>
        </Card>
      )}

      {/* Title + odds above the hero on mobile (off the image) — mirrors StationView. */}
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
          sx={{
            position: "relative",
            zIndex: 1,
            bgcolor: {
              xs: (theme) => alpha(theme.palette.background.paper, 0.78),
              md: "transparent",
            },
            borderRadius: { xs: 2, md: 0 },
            p: { xs: 1.5, md: 0 },
          }}
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
              sx={{ width: { xs: "100%", md: "auto" } }}
            >
              {busy ? (
                <CircularProgress size={20} color="inherit" />
              ) : activeRaid ? (
                `🗡 ${t("raids.partyAway")}`
              ) : (
                `🗡 ${t("raids.launch")} · 🪶${RAID_FEATHER_COST}`
              )}
            </Button>
          </Stack>
        </Stack>
      </Card>

      {/* The raid contract — every cost and chance, flat and visible. */}
      <Card variant="surface" sx={{ p: { xs: 1.25, md: 1.5 } }}>
        <Stack
          direction="row"
          spacing={{ xs: 1.5, md: 3 }}
          flexWrap="wrap"
          useFlexGap
          alignItems="center"
        >
          <Typography variant="caption" sx={{ fontWeight: 800 }}>
            📜 {t("raids.rulesTitle")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            🪶 {t("raids.ruleCost", { n: RAID_FEATHER_COST, have: feathers })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ❤️ {t("raids.ruleHp", { win: RAID_HP_COST_WIN, loss: RAID_HP_COST_LOSS })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            🥚 {t("raids.ruleEgg", { pct: Math.round(RAID_EGG_CHANCE * 100) })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            💀 {t("raids.ruleFail")}
          </Typography>
        </Stack>
      </Card>

      {/* Party */}
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
                  <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                    🥷 {r.stats.Stealth ?? 0} · 🍀 {r.stats.Luck ?? 0}
                  </Typography>
                </Box>
              </Stack>
              <Button size="small" variant="outlined" color="neutral" onClick={() => removeFromParty(rid(r))}>
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
            <Card key={`empty-${i}`} variant="surface" sx={{ ...dashedSx, cursor: "default", "&:hover": {} }}>
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

      {/* Raid log — who was hit, when, and the haul. Append-only history. */}
      {history.length > 0 && (
        <Stack spacing={1}>
          <Typography variant="h6">📜 {t("raids.historyTitle")}</Typography>
          <Card sx={{ p: { xs: 1, md: 1.5 } }}>
            <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
              {history.map((h) => {
                const bot = raidBotById(h.botId);
                return (
                  <Stack
                    key={h.id}
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    sx={{ py: 0.75, minWidth: 0 }}
                  >
                    <Box component="span" sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                      {h.success ? "✅" : "💨"}
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 0, flexGrow: 1 }} noWrap>
                      {bot?.name[locale] ?? h.botId}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                    >
                      {h.success ? (
                        <>
                          +{h.lootCoins} 🌽{h.lootEggs > 0 && <> +{h.lootEggs} 🥚</>}
                        </>
                      ) : (
                        "—"
                      )}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                    >
                      {new Date(h.at).toLocaleDateString(locale)}
                    </Typography>
                  </Stack>
                );
              })}
            </Stack>
          </Card>
        </Stack>
      )}

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
            const tgLoot = hasParty ? raidLoot(luck, tg.coinPool) : null;
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

      {/* Picker — choose a raider (Stealth-sorted). */}
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
      </Popup>

      {/* Raid result — success/fail + the haul + the HP toll. */}
      <Popup
        open={Boolean(outcome)}
        onClose={() => setOutcome(null)}
        title={outcome?.success ? `🎉 ${t("raids.resultWin")}` : `💨 ${t("raids.resultLoss")}`}
        maxWidth="xs"
      >
        {outcome && (
          <Stack spacing={1.5} sx={{ pb: 1 }} alignItems="center" textAlign="center">
            <Typography sx={{ fontSize: 48, lineHeight: 1 }}>
              {outcome.success ? "💰" : "🪶"}
            </Typography>
            {outcome.success ? (
              <>
                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                  +{outcome.lootCoins} 🌽
                  {outcome.lootEggs > 0 && <> · +{outcome.lootEggs} 🥚</>}
                </Typography>
                {outcome.wasConsolation && (
                  <Typography variant="caption" color="text.secondary">
                    {t("raids.consolation")}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  ❤️ {t("raids.hpTaken", { n: RAID_HP_COST_WIN })}
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="body2" color="text.secondary">
                  {t("raids.lossText")}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ❤️ {t("raids.hpTaken", { n: RAID_HP_COST_LOSS })}
                </Typography>
              </>
            )}
            <Button variant="contained" fullWidth onClick={() => setOutcome(null)}>
              {t("raids.resultClose")}
            </Button>
          </Stack>
        )}
      </Popup>
    </Stack>
  );
}
