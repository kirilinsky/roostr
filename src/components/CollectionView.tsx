"use client";

import { useMemo, useState } from "react";
import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import Filters, { type FilterGroup } from "@/components/Filters";
import { TIERS, type HydratedRoostr } from "@/lib/roostr";
import { BREED_GROUPS, groupName } from "@/lib/breeds";
import { countryFlag } from "@/lib/flag";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Catalog grid with a universal filter bar. Filter options are derived from the
// roosters actually present (level = tier, country = breed origin). Add a group
// here + a predicate below to extend.
export default function CollectionView({
  roostrs,
}: {
  roostrs: HydratedRoostr[];
}) {
  const t = useT();
  const locale = useLocale();
  const [filters, setFilters] = useState<Record<string, string>>({
    level: "",
    breed: "",
    group: "",
    country: "",
  });

  // Levels present, in tier order (D < C < B < … < X).
  const levelOptions = useMemo(() => {
    const present = new Set(roostrs.map((r) => r.tier.id));
    return TIERS.filter((tr) => present.has(tr.id)).map((tr) => ({
      value: tr.id,
      label: tr.id,
    }));
  }, [roostrs]);

  // Breeds present, sorted by localized name.
  const breedOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roostrs) map.set(r.breed.id, r.breed.name[locale]);
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [roostrs, locale]);

  // Groups present, in canonical order, localized.
  const groupOptions = useMemo(() => {
    const present = new Set(roostrs.map((r) => r.breed.group));
    return BREED_GROUPS.filter((id) => present.has(id)).map((id) => ({
      value: id,
      label: groupName(id, locale),
    }));
  }, [roostrs, locale]);

  // Countries present, with flag, sorted by localized name.
  const countryOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roostrs) {
      map.set(
        r.breed.region.iso,
        `${countryFlag(r.breed.region.iso)} ${r.breed.region[locale]}`,
      );
    }
    return [...map.entries()]
      .sort((a, b) => a[1].localeCompare(b[1]))
      .map(([value, label]) => ({ value, label }));
  }, [roostrs, locale]);

  const groups: FilterGroup[] = [
    { key: "level", label: t("collection.level"), options: levelOptions },
    { key: "breed", label: t("filter.breed"), options: breedOptions },
    { key: "group", label: t("filter.group"), options: groupOptions },
    { key: "country", label: t("filter.country"), options: countryOptions },
  ];

  const filtered = roostrs.filter(
    (r) =>
      (!filters.level || r.tier.id === filters.level) &&
      (!filters.breed || r.breed.id === filters.breed) &&
      (!filters.group || r.breed.group === filters.group) &&
      (!filters.country || r.breed.region.iso === filters.country),
  );

  return (
    <Stack spacing={2}>
      <Filters
        groups={groups}
        value={filters}
        onChange={(key, value) => setFilters((s) => ({ ...s, [key]: value }))}
        allLabel={t("filter.all")}
      />

      {filtered.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4 }} textAlign="center">
          {t("filter.empty")}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "repeat(2, 1fr)",
              sm: "repeat(3, 1fr)",
              md: "repeat(4, 1fr)",
            },
          }}
        >
          {filtered.map((r) => (
            <CollectionCard key={r.id ?? r.seed} roostr={r} />
          ))}
        </Box>
      )}
    </Stack>
  );
}
