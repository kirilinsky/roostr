"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getDebugGlobalStatsAction } from "@/app/debug/actions";
import { BREED_BY_ID } from "@/lib/roostr";
import { useLocale } from "@/i18n/I18nProvider";

type Stats = NonNullable<Awaited<ReturnType<typeof getDebugGlobalStatsAction>>>;

// Debug-page pulse readout: the latest hatch across ALL players (linked to its
// page) + how many raids are in flight game-wide. Loads once on mount via the
// admin-guarded action. English-only (debug surface, V7).
export default function DebugGlobalStats() {
  const locale = useLocale();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getDebugGlobalStatsAction().then((s) => s && setStats(s));
  }, []);

  if (!stats) return null;
  const h = stats.lastHatch;
  const breedName = h ? (BREED_BY_ID[h.breedId]?.name[locale] ?? h.breedId) : null;

  return (
    <Card sx={{ p: 2, width: "100%" }}>
      <Typography variant="overline" color="text.secondary">
        Global pulse
      </Typography>
      <Stack spacing={0.75} sx={{ mt: 0.5 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            🐣 Last hatch (global):
          </Typography>
          {h ? (
            <>
              <Chip
                component={Link}
                href={`/collection/${h.id}`}
                clickable
                size="small"
                variant="outlined"
                label={`${h.nickname || breedName}`}
                sx={{ fontWeight: 700 }}
              />
              <Typography variant="caption" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                {new Date(h.hatchedAt).toLocaleString(locale)} · owner {h.ownerId}
              </Typography>
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              —
            </Typography>
          )}
        </Stack>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          🗡 Active raids (global):{" "}
          <Typography component="span" variant="body2" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {stats.activeRaids}
          </Typography>
        </Typography>
      </Stack>
    </Card>
  );
}
