"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { SxProps, Theme } from "@mui/material/styles";
import RoostrAvatar from "@/components/RoostrAvatar";
import BattleRecord from "@/components/BattleRecord";
import { SKILLS, geneUpgradeCount, type HydratedRoostr } from "@/lib/roostr";
import { STAT_KIND_COLOR, STAT_KIND_ORDER, type StatKind } from "@/lib/statKinds";
import { countryFlag } from "@/lib/flag";
import { tierBackground } from "@/lib/tierBg";
import { groupName } from "@/lib/breeds";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Footer readout mode: "kinds" = stat-by-category sums (collection); "intellect"
// = single Intellect score (lab roster / picker).
export type CardMetric = "kinds" | "intellect" | "fertility" | "crow";

// Compact "how long on the job" badge text (m / h / d).
function shortAgo(sinceMs: number, nowMs: number): string {
  const s = Math.max(0, Math.floor((nowMs - sinceMs) / 1000));
  if (s < 60) return "<1m";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

// Reusable roster card. Default: links to the rooster page with the per-category
// stat lean. Pass `onClick` to use it as a button (lab worker / picker), and
// `metric="intellect"` to surface the Intellect score instead.
export default function CollectionCard({
  roostr,
  metric = "kinds",
  onClick,
  selected = false,
  href,
  price,
  compact = false,
}: {
  roostr: HydratedRoostr;
  metric?: CardMetric;
  onClick?: () => void;
  selected?: boolean;
  href?: string;
  price?: number;
  compact?: boolean; // half-size pick card: no stat dot, no breed/record clutter
}) {
  const locale = useLocale();
  const t = useT();
  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;
  const intellect = roostr.stats.Intellect ?? 0;
  const fertility = roostr.stats.Fertility ?? 0;
  const crow = roostr.stats.Crow ?? 0;
  // "Sergeant" rank insignia: any bought upgrade earns chevrons (1–3 by amount).
  const upgrades = geneUpgradeCount(roostr.geneLevels);
  const rank = upgrades >= 10 ? 3 : upgrades >= 4 ? 2 : 1;

  // Station badge — keyed on STATUS so EVERY working bird is flagged; kind + how
  // long are extra detail (from meta.work) shown when available. `nowMs` set after
  // mount (avoids SSR/client time mismatch) and ticks each minute.
  const isWorking = roostr.status === "working";
  const work = roostr.work;
  const [nowMs, setNowMs] = useState<number | null>(null);
  useEffect(() => {
    if (!isWorking) return;
    setNowMs(Date.now());
    const id = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, [isWorking]);

  // Sum of stats per kind → shows where the build leans.
  const kindSum = useMemo(() => {
    const sum: Record<StatKind, number> = { offense: 0, defense: 0, utility: 0 };
    for (const s of SKILLS) sum[s.kind] += roostr.stats[s.id] ?? 0;
    return sum;
  }, [roostr.stats]);

  const inner: ReactNode = (
    <>
      {/* avatar on the checkered chamber backdrop */}
      <Box
        sx={{
          position: "relative",
          alignSelf: "center",
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tierBackground(roostr.tier.color),
        }}
      >
        <RoostrAvatar traits={roostr.cosmetic} fill />
        {selected && (
          <Chip
            label="✓"
            size="small"
            color="primary"
            sx={{ position: "absolute", top: 6, right: 6, fontWeight: 800 }}
          />
        )}
        {/* upgraded insignia — gold sergeant chevrons, count scales with upgrades */}
        {upgrades > 0 && (
          <Chip
            label={"⌃".repeat(rank)}
            size="small"
            title={`${t("card.upgraded")}: ${upgrades}`}
            sx={(theme) => ({
              position: "absolute",
              top: 6,
              left: 6,
              height: 22,
              fontWeight: 900,
              fontSize: "0.8rem",
              letterSpacing: "-1px",
              bgcolor: "tertiary.main",
              color: theme.palette.tertiary.contrastText,
              "& .MuiChip-label": { px: 0.75 },
            })}
          />
        )}
        {/* station badge — any working bird is flagged; kind + elapsed if known */}
        {isWorking && (
          <Chip
            size="small"
            title={t(
              work?.kind === "farm"
                ? "card.onFarm"
                : work?.kind === "lab"
                  ? "card.onLab"
                  : "card.working",
            )}
            label={`${work?.kind === "farm" ? "🌾" : work?.kind === "lab" ? "🧪" : "🔧"}${work && nowMs ? " " + shortAgo(work.since, nowMs) : ""}`}
            sx={(theme) => ({
              position: "absolute",
              bottom: 6,
              left: 6,
              height: 20,
              fontWeight: 700,
              fontSize: 11,
              bgcolor: "neutral.main",
              color: theme.palette.neutral.contrastText,
            })}
          />
        )}
        {/* gift limbo — sent as a pending gift, awaiting the recipient's decision */}
        {roostr.status === "gifting" && (
          <Chip
            size="small"
            title={t("card.gifting")}
            label="🎁"
            sx={(theme) => ({
              position: "absolute",
              bottom: 6,
              left: 6,
              height: 20,
              fontWeight: 700,
              fontSize: 11,
              bgcolor: "secondary.main",
              color: theme.palette.secondary.contrastText,
            })}
          />
        )}
        {/* tier · rating — overlaid bottom-right so the name row below stays
            full width (chip used to share the name row and truncate it). */}
        <Chip
          label={`${roostr.tier.id} · ${roostr.rating}`}
          size="small"
          sx={{ position: "absolute", bottom: 6, right: 6, fontWeight: 800, bgcolor: "background.paper" }}
        />
      </Box>

      {/* name + origin flag — full width (tier·rating now overlays the avatar) */}
      <Box sx={{ minWidth: 0 }}>
        {/* custom nickname stands out (secondary tint); breed-name default stays neutral */}
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 700,
            color: roostr.nickname ? "secondary.main" : "inherit",
          }}
          noWrap
        >
          {countryFlag(roostr.breed.region.iso)} {name}
        </Typography>
        {!compact && (
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {roostr.nickname ? `${breedName} · ` : ""}
            {groupName(roostr.breed.group, locale)}
          </Typography>
        )}
      </Box>

      {/* footer: stat lean (Intellect or by-category) on the left, battle record
          on the right — one row, space-between */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        {metric === "intellect" ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            >
              🧠 {intellect}
            </Typography>
          </Stack>
        ) : metric === "fertility" ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            >
              🥚 {fertility}
            </Typography>
          </Stack>
        ) : metric === "crow" ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
            >
              📣 {crow}
            </Typography>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1.5}>
            {/* HP alongside the stat lean */}
            {!compact && (
              <Stack direction="row" alignItems="center" spacing={0.5}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: "error.main",
                  }}
                >
                  ♥ {roostr.maxHealth}
                </Typography>
              </Stack>
            )}
            {STAT_KIND_ORDER.map((kind) => (
              <Stack key={kind} direction="row" alignItems="center" spacing={0.5}>
                {!compact && (
                  <Box
                    sx={{
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      bgcolor: `${STAT_KIND_COLOR[kind]}.main`,
                    }}
                  />
                )}
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                >
                  {kindSum[kind]}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
        {!compact && (
          <BattleRecord
            wins={roostr.wins}
            losses={roostr.losses}
            draws={roostr.draws}
          />
        )}
      </Stack>

      {/* market price tag */}
      {typeof price === "number" && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            py: 0.5,
            borderRadius: 0,
            bgcolor: "background.default",
          }}
        >
          <Image
            src="/corn-coin.png"
            alt=""
            width={16}
            height={15}
            style={{ height: 14, width: "auto" }}
          />
          <Typography
            variant="body2"
            sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
          >
            {price.toLocaleString()}
          </Typography>
        </Box>
      )}
    </>
  );

  const baseSx: SxProps<Theme> = {
    p: compact ? 0.75 : 1.5,
    display: "flex",
    flexDirection: "column",
    gap: compact ? 0.5 : 1,
    textDecoration: "none",
    color: "inherit",
    textAlign: "left",
    ...(selected ? { borderColor: "primary.main" } : {}),
    transition: "border-color 0.15s, transform 0.15s",
    "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
  };

  // Button mode (lab worker / picker) vs link mode (collection).
  if (onClick) {
    return (
      <Card
        component="button"
        type="button"
        onClick={onClick}
        sx={[baseSx, { font: "inherit", width: "100%", cursor: "pointer" }] as SxProps<Theme>}
      >
        {inner}
      </Card>
    );
  }
  return (
    <Card component={Link} href={href ?? `/collection/${roostr.id}`} sx={baseSx}>
      {inner}
    </Card>
  );
}
