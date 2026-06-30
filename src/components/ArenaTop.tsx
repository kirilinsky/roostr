"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatar from "@/components/RoostrAvatar";
import { SKILLS, type HydratedRoostr } from "@/lib/roostr";
import {
  STAT_KIND_COLOR,
  STAT_KIND_LABEL_KEY,
  STAT_KIND_ORDER,
  type StatKind,
} from "@/lib/statKinds";
import { countryFlag } from "@/lib/flag";
import { tierBackground } from "@/lib/tierBg";
import { useLocale, useT } from "@/i18n/I18nProvider";

export interface ArenaTopEntry {
  roostr: HydratedRoostr;
  ownerName: string;
}

// Σ of a rooster's skills in one kind bucket (offense / defense / utility).
function kindSum(stats: Record<string, number>, kind: StatKind): number {
  return SKILLS.filter((s) => s.kind === kind).reduce(
    (n, s) => n + (stats[s.id] ?? 0),
    0,
  );
}

// Global top-10 leaderboard. A kind filter (attack / defense / utility) re-ranks
// every bird by that stat-sum; the top 10 are listed with rank, owner, and score.
export default function ArenaTop({ entries }: { entries: ArenaTopEntry[] }) {
  const t = useT();
  const locale = useLocale();
  const [kind, setKind] = useState<StatKind>("offense");

  const top = useMemo(() => {
    return [...entries]
      .map((e) => ({ ...e, score: kindSum(e.roostr.stats, kind) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }, [entries, kind]);

  const color = STAT_KIND_COLOR[kind];

  return (
    <Stack spacing={2}>
      {/* kind filter */}
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        {STAT_KIND_ORDER.map((k) => (
          <Chip
            key={k}
            label={t(STAT_KIND_LABEL_KEY[k])}
            clickable
            onClick={() => setKind(k)}
            color={k === kind ? STAT_KIND_COLOR[k] : "default"}
            variant={k === kind ? "filled" : "outlined"}
          />
        ))}
      </Stack>

      {top.length === 0 ? (
        <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
          {t("arena.topEmpty")}
        </Typography>
      ) : (
        <Stack spacing={1}>
          {top.map((e, i) => {
            const r = e.roostr;
            const name = r.nickname || r.breed.name[locale];
            return (
              <Card
                key={r.id ?? i}
                component={Link}
                href={`/collection/${r.id}`}
                sx={{
                  p: 1,
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  textDecoration: "none",
                  color: "inherit",
                  transition: "border-color 0.15s, transform 0.15s",
                  "&:hover": { borderColor: "primary.main", transform: "translateY(-2px)" },
                }}
              >
                {/* rank */}
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    width: 28,
                    textAlign: "center",
                    color: i < 3 ? "tertiary.main" : "text.secondary",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </Typography>

                {/* avatar */}
                <Box
                  sx={{
                    position: "relative",
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 0,
                    overflow: "hidden",
                    border: 2,
                    borderColor: "neutral.main",
                    background: tierBackground(r.tier.color),
                  }}
                >
                  <RoostrAvatar traits={r.cosmetic} fill />
                </Box>

                {/* name + owner */}
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {countryFlag(r.breed.region.iso)} {name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap component="div">
                    {e.ownerName} · {r.tier.id} · {r.rating}
                  </Typography>
                </Box>

                {/* score for the selected kind */}
                <Typography
                  sx={{
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    color: `${color}.main`,
                    flexShrink: 0,
                  }}
                >
                  {e.score}
                </Typography>
              </Card>
            );
          })}
        </Stack>
      )}
    </Stack>
  );
}
