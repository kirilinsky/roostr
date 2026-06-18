"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import {
  GENE_MAX_LEVEL,
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  TIERS,
  formatStatMods,
  geneUpgradeCost,
  skillLabel,
  type Gene,
  type HydratedRoostr,
  type StatMods,
} from "@/lib/roostr";
import { upgradeGeneAction } from "@/app/collection/[id]/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

const KIND_COLOR: Record<string, "primary" | "secondary" | "success"> = {
  offense: "secondary",
  defense: "primary",
  utility: "success",
};
const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, string>;

// Gene's current contribution = its statMods scaled by its level.
function scaledMods(gene: Gene, level: number): StatMods {
  const out: StatMods = {};
  for (const [k, v] of Object.entries(gene.statMods ?? {})) {
    out[k as keyof StatMods] = (v as number) * level;
  }
  return out;
}

export default function RoostrDetail({
  roostr,
  roostrId,
  coins,
  isOwner,
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  coins: number;
  isOwner: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [busyGene, setBusyGene] = useState<string | null>(null);

  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;
  const seedId = `#${roostr.seed.toString(16).padStart(6, "0").toUpperCase()}-RSTR`;
  const tier = roostr.tier;

  // Rating progress within the current tier band (our level/XP analog).
  const nextTier = TIERS.find((tr) => tr.min > roostr.rating);
  const bandStart = tier.min;
  const bandEnd = nextTier?.min ?? roostr.rating;
  const bandPct = nextTier
    ? Math.min(100, ((roostr.rating - bandStart) / (bandEnd - bandStart)) * 100)
    : 100;

  function upgrade(geneId: string) {
    setBusyGene(geneId);
    startTransition(async () => {
      await upgradeGeneAction(roostrId, geneId);
      setBusyGene(null);
    });
  }

  return (
    <Stack spacing={3}>
      <Button
        component={Link}
        href="/collection"
        color="neutral"
        sx={{ alignSelf: "flex-start" }}
      >
        ← {t("detail.back")}
      </Button>

      {/* Top: avatar panel + combat stats */}
      <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
        {/* avatar + identity */}
        <Stack spacing={1.5} sx={{ width: { xs: "100%", md: 360 }, flexShrink: 0 }}>
          <Box sx={{ position: "relative" }}>
            <Box
              sx={{
                aspectRatio: "1 / 1",
                borderRadius: 3,
                border: 4,
                borderColor: "neutral.main",
                overflow: "hidden",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#1c1c22",
                backgroundImage:
                  "repeating-conic-gradient(#26262e 0% 25%, #1c1c22 0% 50%)",
                backgroundSize: "20px 20px",
              }}
            >
              <RoostrAvatarPixel
                colors={roostr.colors}
                pattern={roostr.pattern}
                breed={roostr.breed}
                weightClass={roostr.weightClass}
                seed={roostr.seed}
                size={300}
              />
            </Box>
            <Chip
              label={`★ ${tier.id}`}
              sx={(theme) => ({
                position: "absolute",
                top: 12,
                left: 12,
                fontWeight: 800,
                bgcolor: tier.color,
                color: theme.palette.getContrastText(tier.color),
              })}
            />
          </Box>

          {/* level / rating progress */}
          <Card sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {t("collection.level")} {tier.id} · {breedName}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {roostr.rating}
                {nextTier ? ` / ${nextTier.min}` : ""}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={bandPct}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Card>
        </Stack>

        {/* name + id + combat stats */}
        <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, textTransform: "uppercase" }} noWrap>
              {name}
            </Typography>
            <Chip
              label={seedId}
              size="small"
              variant="outlined"
              sx={{ fontFamily: "monospace", mt: 0.5 }}
            />
          </Box>

          <Card sx={{ p: 2, flexGrow: 1 }}>
            <Typography variant="h6" sx={{ mb: 1.5 }}>
              {t("detail.combatStats")}
            </Typography>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                columnGap: 2,
                rowGap: 0.75,
              }}
            >
              {SKILL_IDS.map((id) => (
                <Box key={id}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="caption" color="text.secondary">
                      {skillLabel(id, locale)}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
                    >
                      {roostr.stats[id]}
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(100, (roostr.stats[id] / STAT_BAR_MAX) * 100)}
                    color={KIND_COLOR[SKILL_KIND[id]] ?? "primary"}
                    sx={{ height: 6, borderRadius: 1 }}
                  />
                </Box>
              ))}
            </Box>
          </Card>
        </Stack>
      </Stack>

      {/* Genetic upgrades */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
          {t("detail.geneticUpgrades")}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {coins.toLocaleString()}
          </Typography>
          <Image src="/corn-coin.png" alt="Corn Coin" width={18} height={17} style={{ height: 16, width: "auto" }} />
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(2, 1fr)",
            lg: "repeat(4, 1fr)",
          },
        }}
      >
        {roostr.genes.map((gene) => {
          const level = roostr.geneLevels[gene.id] ?? 1;
          const maxed = level >= GENE_MAX_LEVEL;
          const cost = geneUpgradeCost(level);
          const canAfford = coins >= cost;
          const disabled =
            !isOwner || maxed || !canAfford || (pending && busyGene === gene.id);
          return (
            <Card key={gene.id} sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <GeneIcon no={gene.no} family={gene.family} />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                    {gene.name[locale]}
                  </Typography>
                </Box>
                <Chip label={`${t("detail.lvl")} ${level}`} size="small" variant="outlined" />
              </Stack>

              <Typography variant="body2" sx={{ fontWeight: 700, minHeight: 24 }}>
                {formatStatMods(scaledMods(gene, level), locale) || "—"}
              </Typography>

              {isOwner ? (
                <Button
                  variant="contained"
                  size="small"
                  disabled={disabled}
                  onClick={() => upgrade(gene.id)}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <span>
                      {maxed ? t("detail.maxLevel") : t("detail.upgrade")}
                    </span>
                    {!maxed && (
                      <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, opacity: 0.9 }}>
                        {cost}
                        <Image src="/corn-coin.png" alt="" width={18} height={17} style={{ height: 13, width: "auto" }} />
                      </Box>
                    )}
                  </Stack>
                </Button>
              ) : null}
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
