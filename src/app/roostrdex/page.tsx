"use client";

import { useEffect, useMemo, useState } from "react";
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
import BreedDexCard from "@/components/BreedDexCard";
import { useIsAdmin } from "@/components/AdminProvider";
import {
  BREEDS_CATALOG,
  BREED_GROUPS,
  breedProfile,
  localize,
  traitEffectLabel,
} from "@/lib/breeds";
import { getDiscovered } from "@/lib/dex";
import { useLocale, useT } from "@/i18n/I18nProvider";

const ALL = "__all__";

export default function RoostrdexPage() {
  const t = useT();
  const locale = useLocale();
  const admin = useIsAdmin();
  const [discovered, setDiscovered] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<string>(ALL);
  const [reveal, setReveal] = useState(false);

  // Discovery lives in localStorage (filled by hatching). Read after mount.
  useEffect(() => {
    setDiscovered(getDiscovered());
  }, []);

  const entries = useMemo(
    () => BREEDS_CATALOG.map((breed, i) => ({ breed, dexNo: i + 1 })),
    [],
  );

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

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
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
          sx={{
            border: 2,
            borderColor: "neutral.main",
            borderRadius: 2,
            p: 2,
            bgcolor: "background.paper",
          }}
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
            sx={{ height: 12, borderRadius: 1 }}
          />
        </Box>

        {/* Filter + grid */}
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 2,
          }}
        >
          <Box sx={{ width: { md: 200 }, flexShrink: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              {t("roostrdex.filter")}
            </Typography>
            <List dense disablePadding>
              <ListItem disablePadding>
                <ListItemButton
                  selected={filter === ALL}
                  onClick={() => setFilter(ALL)}
                >
                  <ListItemText primary={t("roostrdex.all")} />
                </ListItemButton>
              </ListItem>
              {BREED_GROUPS.map((g) => (
                <ListItem key={g} disablePadding>
                  <ListItemButton
                    selected={filter === g}
                    onClick={() => setFilter(g)}
                  >
                    <ListItemText primary={g} />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          </Box>

          <Box
            sx={{
              flexGrow: 1,
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
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
                  group={breed.group}
                  atk={atk}
                  def={def}
                  health={breed.baseHealth}
                  healthMax={healthMax}
                  traitName={localize(breed.trait.name, locale)}
                  traitEffects={traitEffectLabel(breed.trait.effects)}
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
