"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import Popup from "@/components/Popup";
import Filters, { type FilterGroup } from "@/components/Filters";
import { TIERS, type HydratedRoostr } from "@/lib/roostr";
import { BREED_GROUPS, groupName } from "@/lib/breeds";
import { countryFlag } from "@/lib/flag";
import { buyListingAction } from "@/app/market/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

export interface MarketListing {
  id: string; // listing id (for buy)
  roostr: HydratedRoostr;
  price: number;
  sellerId: number;
  expiresAt?: number; // ms epoch; offers end 72h after listing (LISTING_TTL_HOURS)
}

// Time left until an offer ends, compact ("2d 5h" / "5h 12m" / "12m"). The offer
// window is 72h (LISTING_TTL_HOURS), so show days once past a day. Null once past.
function timeLeft(ms?: number): string | null {
  if (ms == null) return null;
  const d = ms - Date.now();
  if (d <= 0) return null;
  const days = Math.floor(d / 86_400_000);
  const h = Math.floor((d % 86_400_000) / 3_600_000);
  const m = Math.floor((d % 3_600_000) / 60_000);
  if (days > 0) return `${days}d ${h}h`;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// Price filter buckets (language-neutral labels; ranges in coins).
const PRICE_BUCKETS = [
  { value: "lt100", label: "< 100", test: (p: number) => p < 100 },
  { value: "100-499", label: "100–499", test: (p: number) => p >= 100 && p < 500 },
  { value: "500-999", label: "500–999", test: (p: number) => p >= 500 && p < 1000 },
  { value: "gte1000", label: "1000+", test: (p: number) => p >= 1000 },
] as const;

// Market grid — same structure as the collection (universal Filters + reused
// CollectionCard), plus a price tag on each card and a price-range filter. Tap a
// card → buy modal → buyListingAction (a bird you don't own, with enough coins).
export default function MarketView({
  listings,
  myId,
  coins,
}: {
  listings: MarketListing[];
  myId: number;
  coins: number;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [buyErr, setBuyErr] = useState<string | null>(null);
  const [filters, setFilters] = useState<Record<string, string>>({
    level: "",
    group: "",
    country: "",
    price: "",
  });
  const [selected, setSelected] = useState<MarketListing | null>(null);

  const roostrs = useMemo(() => listings.map((l) => l.roostr), [listings]);

  const levelOptions = useMemo(() => {
    const present = new Set(roostrs.map((r) => r.tier.id));
    return TIERS.filter((tr) => present.has(tr.id)).map((tr) => ({
      value: tr.id,
      label: tr.id,
    }));
  }, [roostrs]);

  const groupOptions = useMemo(() => {
    const present = new Set(roostrs.map((r) => r.breed.group));
    return BREED_GROUPS.filter((id) => present.has(id)).map((id) => ({
      value: id,
      label: groupName(id, locale),
    }));
  }, [roostrs, locale]);

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

  const priceOptions = useMemo(
    () =>
      PRICE_BUCKETS.filter((b) => listings.some((l) => b.test(l.price))).map(
        (b) => ({ value: b.value, label: b.label }),
      ),
    [listings],
  );

  const groups: FilterGroup[] = [
    { key: "level", label: t("collection.level"), options: levelOptions },
    { key: "group", label: t("filter.group"), options: groupOptions },
    { key: "country", label: t("filter.country"), options: countryOptions },
    { key: "price", label: t("filter.price"), options: priceOptions },
  ];

  const filtered = listings
    .filter(
      (l) =>
        (!filters.level || l.roostr.tier.id === filters.level) &&
        (!filters.group || l.roostr.breed.group === filters.group) &&
        (!filters.country || l.roostr.breed.region.iso === filters.country) &&
        (!filters.price ||
          PRICE_BUCKETS.find((b) => b.value === filters.price)?.test(l.price)),
    )
    // default order: offers ending soonest first
    .sort((a, b) => (a.expiresAt ?? Infinity) - (b.expiresAt ?? Infinity));

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
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: "repeat(4, minmax(0, 1fr))",
            },
          }}
        >
          {filtered.map((l) => {
            const left = timeLeft(l.expiresAt);
            return (
              <Stack key={l.roostr.id ?? l.roostr.seed} spacing={0.5}>
                <CollectionCard
                  roostr={l.roostr}
                  price={l.price}
                  onClick={() => setSelected(l)}
                />
                {left && (
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    textAlign="center"
                  >
                    ⏳ {left}
                  </Typography>
                )}
              </Stack>
            );
          })}
        </Box>
      )}

      {/* Buy modal — confirm + purchase. Can't buy your own listing; the button
          also blocks when you can't afford it. */}
      <Popup
        open={Boolean(selected)}
        onClose={() => (pending ? undefined : (setSelected(null), setBuyErr(null)))}
        title={selected ? selected.roostr.nickname || selected.roostr.breed.name[locale] : ""}
      >
        {selected &&
          (() => {
            const mine = selected.sellerId === myId;
            const afford = coins >= selected.price;
            const buy = () => {
              setBuyErr(null);
              start(async () => {
                const res = await buyListingAction(selected.id);
                if (res.ok) {
                  setSelected(null);
                  router.refresh();
                } else {
                  setBuyErr(res.error);
                }
              });
            };
            return (
              <Stack spacing={2} sx={{ pb: 1 }}>
                <Box sx={{ maxWidth: 220, mx: "auto", width: "100%" }}>
                  <CollectionCard roostr={selected.roostr} price={selected.price} />
                </Box>
                {buyErr && (
                  <Typography variant="body2" color="error" textAlign="center">
                    {t(buyErr === "gone" || buyErr === "expired" ? "market.buyGone" : "market.buyFailed")}
                  </Typography>
                )}
                {mine ? (
                  <Typography variant="body2" color="text.secondary" textAlign="center">
                    {t("market.ownListing")}
                  </Typography>
                ) : (
                  <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    disabled={pending || !afford}
                    onClick={buy}
                  >
                    {pending ? (
                      <CircularProgress size={22} color="inherit" />
                    ) : afford ? (
                      t("market.buyFor", { price: selected.price.toLocaleString() })
                    ) : (
                      t("market.notEnough")
                    )}
                  </Button>
                )}
              </Stack>
            );
          })()}
      </Popup>
    </Stack>
  );
}
