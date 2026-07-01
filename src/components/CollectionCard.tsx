"use client";

import { useMemo, type ReactNode } from "react";
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
import SynthGeneIcon from "@/components/SynthGeneIcon";
import { useNowTick } from "@/hooks/useNowTick";
import { SKILLS, geneUpgradeCount, type HydratedRoostr } from "@/lib/roostr";
import { STAT_KIND_COLOR, STAT_KIND_ORDER, type StatKind } from "@/lib/statKinds";
import { countryFlag } from "@/lib/flag";
import { tierBackground } from "@/lib/tierBg";
import { groupName } from "@/lib/breeds";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Footer readout mode: "kinds" = stat-by-category sums (collection); "intellect"
// = single Intellect score (lab roster / picker).
export type CardMetric = "kinds" | "intellect" | "fertility" | "crow" | "hp";

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
  // Total bought rolled-gene upgrades → a single gold "level" badge (number, not
  // chevrons). Synth genes show their own marks (icon + level) alongside it.
  const upgrades = geneUpgradeCount(roostr.geneLevels);
  const synthGenes = roostr.synthGenes;

  // Station badge — keyed on STATUS so EVERY working bird is flagged; kind + how
  // long are extra detail (from meta.work) shown when available. `nowMs` set after
  // mount (avoids SSR/client time mismatch) and ticks each minute.
  const isWorking = roostr.status === "working";
  const work = roostr.work;
  const nowMs = useNowTick(60_000, { enabled: isWorking });

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
        {/* enhancement marks (top-left, stacked): gold upgrade-level badge, then a
            mark per spliced synth gene (its icon + level). */}
        {(upgrades > 0 || synthGenes.length > 0) && (
          <Stack
            direction="row"
            spacing={0.5}
            alignItems="center"
            sx={{ position: "absolute", top: 6, left: 6 }}
          >
            {upgrades > 0 && (
              <Box
                title={`${t("card.upgraded")}: ${upgrades}`}
                sx={(theme) => ({
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.25,
                  height: 20,
                  px: 0.6,
                  bgcolor: "tertiary.main",
                  color: theme.palette.tertiary.contrastText,
                  fontWeight: 900,
                  fontSize: 11,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                })}
              >
                <Box component="span" sx={{ fontSize: 8 }}>
                  ▲
                </Box>
                {upgrades}
              </Box>
            )}
            {synthGenes.map((g) => {
              const lvl = roostr.synthGeneLevels[g.id] ?? 1;
              return (
                <Box
                  key={g.id}
                  title={`${g.name[locale]} · ${t("detail.lvl")} ${lvl}`}
                  sx={{ position: "relative", display: "inline-flex", lineHeight: 0 }}
                >
                  <SynthGeneIcon no={g.no} size={compact ? 18 : 22} />
                  <Box
                    component="span"
                    sx={(theme) => ({
                      position: "absolute",
                      bottom: -3,
                      right: -3,
                      minWidth: 13,
                      height: 13,
                      px: 0.25,
                      bgcolor: "secondary.main",
                      color: theme.palette.secondary.contrastText,
                      fontSize: 9,
                      fontWeight: 900,
                      lineHeight: "13px",
                      textAlign: "center",
                      fontVariantNumeric: "tabular-nums",
                    })}
                  >
                    {lvl}
                  </Box>
                </Box>
              );
            })}
          </Stack>
        )}
        {/* station badge — any working bird is flagged; kind + elapsed if known.
            Defense (дозор) uses the watch shield logo instead of an emoji. */}
        {isWorking && (
          <Chip
            size="small"
            title={t(
              work?.kind === "farm"
                ? "card.onFarm"
                : work?.kind === "lab"
                  ? "card.onLab"
                  : work?.kind === "defense"
                    ? "card.onDefense"
                    : work?.kind === "hospital"
                      ? "card.onHospital"
                      : "card.working",
            )}
            label={
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.375 }}>
                {work?.kind === "defense" ? (
                  <Image
                    src="/defense.png"
                    alt=""
                    width={14}
                    height={14}
                    style={{ height: 13, width: "auto" }}
                  />
                ) : (
                  <span>
                    {work?.kind === "farm"
                      ? "🌾"
                      : work?.kind === "lab"
                        ? "🧪"
                        : work?.kind === "hospital"
                          ? "🏥"
                          : "🔧"}
                  </span>
                )}
                {work && nowMs ? <span>{shortAgo(work.since, nowMs)}</span> : null}
              </Box>
            }
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
          on the right. Wraps on narrow cards so nothing collides/clips. */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        useFlexGap
        sx={{ rowGap: 0.5, columnGap: 1 }}
      >
        {metric === "hp" ? (
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Typography
              variant="caption"
              sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "error.main" }}
            >
              ♥ {roostr.currentHp ?? roostr.maxHealth}/{roostr.maxHealth}
            </Typography>
          </Stack>
        ) : metric === "intellect" ? (
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
          <Stack
            direction="row"
            flexWrap="wrap"
            useFlexGap
            alignItems="center"
            spacing={{ xs: 0.75, sm: 1.5 }}
          >
            {/* HP alongside the stat lean */}
            {!compact && (
              <Stack direction="row" alignItems="center" spacing={0.375}>
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                    color: "error.main",
                  }}
                >
                  {/* Hurt bird → show current/max; healthy → just max. */}
                  ♥{" "}
                  {roostr.currentHp != null && roostr.currentHp < roostr.maxHealth
                    ? `${roostr.currentHp}/${roostr.maxHealth}`
                    : roostr.maxHealth}
                </Typography>
              </Stack>
            )}
            {STAT_KIND_ORDER.map((kind) => (
              <Stack key={kind} direction="row" alignItems="center" spacing={0.375}>
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
    p: compact ? 0.75 : { xs: 1, sm: 1.5 },
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
        data-testid="collection-card"
        data-roostr-id={roostr.id ?? ""}
        sx={[baseSx, { font: "inherit", width: "100%", cursor: "pointer" }] as SxProps<Theme>}
      >
        {inner}
      </Card>
    );
  }
  return (
    <Card
      component={Link}
      href={href ?? `/collection/${roostr.id}`}
      data-testid="collection-card"
      data-roostr-id={roostr.id ?? ""}
      sx={baseSx}
    >
      {inner}
    </Card>
  );
}
