"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import BreedDexCard from "@/components/BreedDexCard";
import { useIsAdmin } from "@/components/AdminProvider";
import { useToast } from "@/components/ToastProvider";
import {
  BREEDS_CATALOG,
  BREED_GROUPS,
  breedProfile,
  groupName,
  groupDescription,
  localize,
} from "@/lib/breeds";
import { formatTraitEffects } from "@/lib/roostr";
import {
  groupReward,
  FULL_DEX_REWARD,
  DEX_REWARD_ICON,
  type DexRewardResource,
} from "@/lib/dexRewards";
import { myDiscoveredBreeds, claimDexRewardsAction } from "./actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

const ALL = "__all__";

export default function RoostrdexPage() {
  const t = useT();
  const locale = useLocale();
  const admin = useIsAdmin();
  const router = useRouter();
  const toast = useToast();
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>(ALL);
  const [reveal, setReveal] = useState(false);

  // Discovery is server-side (breedDiscoveries table, filled by hatching). Fetch
  // after mount — the dex grid renders silhouettes until this resolves. Also grant
  // any newly-completed group/full rewards and toast them.
  useEffect(() => {
    let alive = true;
    myDiscoveredBreeds().then((ids) => {
      if (alive) setDiscovered(new Set(ids));
    });
    claimDexRewardsAction().then((granted) => {
      if (!alive || granted.length === 0) return;
      for (const g of granted) {
        toast.show({
          variant: "success",
          message:
            g.key === "full"
              ? t("roostrdex.fullReward", { n: g.amount })
              : t("roostrdex.groupReward", {
                  group: groupName(g.key.slice(6), locale),
                  n: g.amount,
                }),
        });
      }
      router.refresh(); // HUD reflects the granted resources (V20)
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entries = useMemo(
    () => BREEDS_CATALOG.map((breed, i) => ({ breed, dexNo: i + 1 })),
    [],
  );

  // Per-group discovery progress (found / total) for the filter list.
  const groupStats = useMemo(() => {
    const m: Record<string, { found: number; total: number }> = {};
    for (const b of BREEDS_CATALOG) {
      const s = (m[b.group] ??= { found: 0, total: 0 });
      s.total++;
      if (reveal || discovered.has(b.id)) s.found++;
    }
    return m;
  }, [discovered, reveal]);

  const healthMax = useMemo(
    () => Math.max(1, ...BREEDS_CATALOG.map((b) => b.baseHealth)),
    [],
  );

  const visible = useMemo(
    () =>
      filter === ALL
        ? entries
        : entries.filter((e) => e.breed.group === filter),
    [entries, filter],
  );

  const total = entries.length;
  const found = entries.filter(
    (e) => reveal || discovered.has(e.breed.id),
  ).length;
  const pct = total > 0 ? (found / total) * 100 : 0;

  // Filter rows: big, finger-friendly tap targets on mobile; compact on desktop.
  const filterItemSx: SxProps<Theme> = {
    gap: 1,
    borderRadius: 0.75,
    minWidth: 0, // let the row shrink inside a grid cell instead of forcing width
    minHeight: { xs: 48, md: 36 },
    py: { xs: 1, md: 0.5 },
    px: { xs: 1.5, md: 1 },
    "& .MuiListItemText-root": { minWidth: 0 },
    "& .MuiListItemText-primary": {
      fontSize: { xs: "1rem", md: "0.875rem" },
      // Long breed-group names wrap on mobile (2-col) instead of blowing out width;
      // desktop sidebar keeps the single-line ellipsis.
      whiteSpace: { xs: "normal", md: "nowrap" },
      overflow: { md: "hidden" },
      textOverflow: { md: "ellipsis" },
      overflowWrap: "anywhere",
    },
    "&.Mui-selected": { fontWeight: 800 },
  };
  // Mobile: lay the filter out as a 2-column grid (shorter than one tall column,
  // buttons still big). Desktop: the usual single-column sidebar list.
  const filterListSx: SxProps<Theme> = {
    display: { xs: "grid", md: "block" },
    gridTemplateColumns: { xs: "1fr 1fr" },
    gap: { xs: 0.5, md: 0 },
    "& .MuiListItem-root": { minWidth: 0 },
  };

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "flex-start" }}
          spacing={2}
        >
          <Stack spacing={0.5}>
            <Typography variant="h4" component="h1">
              {t("roostrdex.title")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("roostrdex.subtitle")}
            </Typography>
          </Stack>
          {admin && (
            <Button
              variant={reveal ? "contained" : "outlined"}
              color="secondary"
              onClick={() => setReveal((r) => !r)}
              sx={{ flexShrink: 0 }}
            >
              {reveal ? t("roostrdex.hide") : t("roostrdex.reveal")}
            </Button>
          )}
        </Stack>

        {/* Progress */}
        <Box
          sx={(theme) => ({
            border: 1,
            borderColor: "divider",
            borderRadius: 1,
            p: { xs: 2, md: 2.5 },
            bgcolor: alpha(theme.palette.background.paper, 0.88),
            boxShadow: "none",
          })}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="baseline"
            sx={{ mb: 1 }}
          >
            <Typography sx={{ fontWeight: 800, letterSpacing: 1 }}>
              {t("roostrdex.progress")}
            </Typography>
            <Typography variant="h6" color="primary">
              {found}/{total}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 12, borderRadius: 0.75 }}
          />
          <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{ mt: 1.25 }}
          >
            <Typography variant="caption" color="text.secondary">
              🎁 {t("roostrdex.rewardFull")}
            </Typography>
            <Typography variant="caption" color="text.primary">
              <RewardPill
                resource={FULL_DEX_REWARD.resource}
                amount={FULL_DEX_REWARD.amount}
              />
            </Typography>
          </Stack>
        </Box>

        {/* Selected group blurb */}
        {filter !== ALL && (
          <Box
            sx={(theme) => ({
              border: 1,
              borderColor: "divider",
              borderRadius: 1,
              p: 2,
              bgcolor: alpha(theme.palette.background.paper, 0.88),
            })}
          >
            <Typography sx={{ fontWeight: 800 }}>
              {groupName(filter, locale)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {groupDescription(filter, locale)}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography variant="caption" color="text.secondary">
                🎁 {t("roostrdex.rewardGroup")}
              </Typography>
              <Typography variant="caption" color="text.primary">
                <RewardPill
                  {...groupReward(groupStats[filter]?.total ?? 0)}
                />
              </Typography>
            </Stack>
          </Box>
        )}

        {/* Filter + grid */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2.5,
          }}
        >
          <Box
            sx={(theme) => ({
              width: { md: 220 },
              flexShrink: 0,
              alignSelf: "flex-start",
              // Mobile: break out of the Container gutters → full-bleed edge-to-edge;
              // drop the side borders + radius so it sits flush to the screen edges.
              mx: { xs: -2, sm: -3, md: 0 },
              border: 1,
              borderColor: "divider",
              borderLeftWidth: { xs: 0, md: 1 },
              borderRightWidth: { xs: 0, md: 1 },
              borderRadius: { xs: 0, md: 1 },
              p: 1,
              bgcolor: alpha(theme.palette.background.paper, 0.88),
            })}
          >
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "block", px: 1, mb: 0.5 }}
            >
              {t("roostrdex.filter")}
            </Typography>
            <List dense disablePadding sx={filterListSx}>
              <ListItem disablePadding>
                <ListItemButton
                  selected={filter === ALL}
                  onClick={() => setFilter(ALL)}
                  sx={filterItemSx}
                >
                  <ListItemText primary={t("roostrdex.all")} />
                  <GroupCount found={found} total={total} />
                </ListItemButton>
              </ListItem>
              {BREED_GROUPS.map((g) => {
                const s = groupStats[g] ?? { found: 0, total: 0 };
                return (
                  <ListItem key={g} disablePadding>
                    <ListItemButton
                      selected={filter === g}
                      onClick={() => setFilter(g)}
                      sx={filterItemSx}
                    >
                      <ListItemText primary={groupName(g, locale)} />
                      <GroupCount found={s.found} total={s.total} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))",
              alignItems: "stretch",
            }}
          >
            {visible.map(({ breed, dexNo }) => {
              const isFound = reveal || discovered.has(breed.id);
              const { atk, def } = breedProfile(breed.tendencies);
              return (
                <BreedDexCard
                  key={breed.id}
                  dexNo={dexNo}
                  discovered={isFound}
                  name={localize(breed.name, locale)}
                  breedId={breed.id}
                  group={breed.group}
                  groupLabel={groupName(breed.group, locale)}
                  atk={atk}
                  def={def}
                  health={breed.baseHealth}
                  healthMax={healthMax}
                  traitName={localize(breed.trait.name, locale)}
                  traitEffects={formatTraitEffects(breed.trait.effects, locale)}
                  lockedLabel={t("roostrdex.locked")}
                  unknownLabel={t("roostrdex.unknown")}
                />
              );
            })}
          </Box>
        </Box>
      </Stack>
    </Container>
  );
}

// Reward preview "+N <icon>" — shows the player what completing a group / the dex
// pays out (motivation), using the HUD resource art.
function RewardPill({
  resource,
  amount,
}: {
  resource: DexRewardResource;
  amount: number;
}) {
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, fontWeight: 800 }}
    >
      +{amount}
      <Image
        src={DEX_REWARD_ICON[resource]}
        alt=""
        width={16}
        height={16}
        style={{ height: 14, width: "auto" }}
      />
    </Box>
  );
}

// Compact discovery counter for a filter row: "5/10", or a ✓ when the group/dex is
// fully discovered.
function GroupCount({ found, total }: { found: number; total: number }) {
  const done = total > 0 && found >= total;
  return (
    <Box
      component="span"
      sx={(theme) => ({
        flexShrink: 0,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: 36,
        height: 22,
        px: 0.5,
        border: 1,
        borderRadius: 0, // square chip — Neo-Arcade
        borderColor: done ? "success.main" : "divider",
        bgcolor: done ? "success.main" : "action.hover",
        color: done ? theme.palette.success.contrastText : "text.secondary",
        fontWeight: 800,
        fontSize: "0.72rem",
        lineHeight: 1,
        fontVariantNumeric: "tabular-nums",
      })}
    >
      {done ? "✓" : `${found}/${total}`}
    </Box>
  );
}
