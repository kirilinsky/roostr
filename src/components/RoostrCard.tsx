"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import {
  BODY_COLOR_HEX,
  COLOR_HEX,
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  colorLabel,
  computeRating,
  formatTraitEffects,
  patternLabel,
  roleLabel,
  skillLabel,
  tierFor,
  type CosmeticLayer,
  type Gene,
  type RolledRoostr,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";
import type { Locale } from "@/i18n/config";

// Stat bar color by skill kind (theme tokens).
const KIND_COLOR: Record<string, "primary" | "secondary" | "success"> = {
  offense: "secondary",
  defense: "primary",
  utility: "success",
};
const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, string>;

const COLOR_ROWS: { key: CosmeticLayer; labelKey: string }[] = [
  { key: "body", labelKey: "card.body" },
  { key: "tail", labelKey: "card.tail" },
  { key: "hackle", labelKey: "card.hackle" },
  { key: "wing", labelKey: "card.wing" },
  { key: "comb", labelKey: "card.comb" },
  { key: "leg", labelKey: "card.leg" },
  { key: "eye", labelKey: "card.eye" },
];

// Gene starting mods as colored tokens (buff = primary, debuff = error).
// One right-aligned text block (wraps as a unit) so rows line up cleanly.
function GeneMods({ gene, locale }: { gene: Gene; locale: Locale }) {
  const entries = Object.entries(gene.statMods ?? {}).filter(([, v]) => v !== 0);
  if (entries.length === 0) return null;
  return (
    <Typography
      variant="caption"
      component="div"
      sx={{ fontWeight: 700, lineHeight: 1.4, mt: 0.25 }}
    >
      {entries.map(([stat, value], i) => (
        <Box
          component="span"
          key={stat}
          sx={{
            whiteSpace: "nowrap",
            color: value > 0 ? "primary.main" : "error.main",
          }}
        >
          {value > 0 ? "+" : ""}
          {value} {skillLabel(stat, locale)}
          {i < entries.length - 1 ? " · " : ""}
        </Box>
      ))}
    </Typography>
  );
}

export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const t = useT();
  const locale = useLocale();
  const { breed, weightClass, genes, maxHealth, stats, colors, pattern, role, seed } =
    roostr;
  const bodyHex = BODY_COLOR_HEX[colors.body] ?? "#888";
  const seedId = `#${seed.toString(16).padStart(6, "0").toUpperCase()}`;
  const rating = computeRating(stats, maxHealth);
  const tier = tierFor(rating);
  const weightLabel = `${weightClass.kg} ${locale === "ru" ? "кг" : "kg"}`;

  return (
    <Box
      sx={{
        width: "100%",
        maxWidth: 1040,
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        border: 4,
        borderColor: "neutral.main",
        borderRadius: 4,
        overflow: "hidden",
        boxShadow: 4,
        bgcolor: "background.paper",
      }}
    >
      {/* LEFT — art panel, tinted by body color */}
      <Box
        sx={{
          position: "relative",
          width: { xs: "100%", sm: 300 },
          flexShrink: 0,
          p: 1.5,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          background: `linear-gradient(160deg, ${bodyHex}, ${bodyHex}cc)`,
        }}
      >
        {/* top chips */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack spacing={0.5} alignItems="flex-start">
            <Chip
              label={patternLabel(pattern, locale)}
              size="small"
              sx={{ bgcolor: "neutral.main", color: "common.white", fontWeight: 700 }}
            />
            <Chip
              label={weightClass.name[locale]}
              size="small"
              title={weightLabel}
              sx={{
                bgcolor: "neutral.main",
                color: "common.white",
                fontWeight: 700,
                cursor: "help",
              }}
            />
          </Stack>
          <Stack spacing={0.5} alignItems="flex-end">
            <Chip
              label={seedId}
              size="small"
              sx={{ bgcolor: "background.paper", fontFamily: "monospace" }}
            />
            <Chip
              label={`${tier.id} · ${rating}`}
              size="small"
              title={`${t("card.rating")} ${rating}`}
              sx={(theme) => ({
                bgcolor: tier.color,
                color: theme.palette.getContrastText(tier.color),
                fontWeight: 800,
              })}
            />
          </Stack>
        </Stack>

        {/* art (no asset yet → checkered placeholder + rooster) */}
        <Box
          sx={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 180,
            aspectRatio: "1 / 1",
            border: 3,
            borderColor: "rgba(0,0,0,0.5)",
            borderRadius: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 84,
            backgroundColor: "#1c1c22",
            backgroundImage:
              "repeating-conic-gradient(#26262e 0% 25%, #1c1c22 0% 50%)",
            backgroundSize: "18px 18px",
          }}
        >
          🐓
        </Box>

        {/* Marble traits (cosmetic colors) — fill the space under the art */}
        <Stack direction="row" flexWrap="wrap" justifyContent="center" sx={{ gap: 0.5 }}>
          {COLOR_ROWS.map(({ key, labelKey }) => (
            <Chip
              key={key}
              size="small"
              icon={
                <Box
                  component="span"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    flexShrink: 0,
                    bgcolor: COLOR_HEX[key]?.[colors[key]] ?? "#888",
                    border: "1px solid rgba(0,0,0,0.35)",
                  }}
                />
              }
              label={`${t(labelKey)}: ${colorLabel(key, colors[key], locale)}`}
              sx={{ bgcolor: "background.paper" }}
            />
          ))}
        </Stack>
      </Box>

      {/* RIGHT — info */}
      <Box sx={{ flexGrow: 1, p: 1.5, minWidth: 0 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
        >
          <Typography
            variant="h5"
            sx={{ fontWeight: 800, textTransform: "uppercase", minWidth: 0 }}
            noWrap
          >
            {breed.name[locale]}
          </Typography>
          <Chip
            label={roleLabel(role, locale).toUpperCase()}
            color="primary"
            sx={{ flexShrink: 0, fontWeight: 800, letterSpacing: 1 }}
          />
        </Stack>

        <Stack direction="row" sx={{ mt: 0.75, flexWrap: "wrap", gap: 0.5 }}>
          <Chip label={`♥ HP ${maxHealth}`} variant="outlined" />
          <Chip
            label={`☆ ${breed.trait.name[locale]}`}
            variant="outlined"
            color="secondary"
            title={breed.trait.description[locale]}
          />
          <Typography variant="caption" color="text.secondary" sx={{ alignSelf: "center" }}>
            {formatTraitEffects(breed.trait.effects, locale)}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1 }} />

        {/* Stats (starting values: base + weight + gene mods) */}
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {t("card.stats")}
        </Typography>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "1fr 1fr 1fr" },
            columnGap: 1.5,
            rowGap: 0.25,
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
                  {stats[id]}
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={Math.min(100, (stats[id] / STAT_BAR_MAX) * 100)}
                color={KIND_COLOR[SKILL_KIND[id]] ?? "primary"}
                sx={{ height: 5, borderRadius: 1 }}
              />
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Key genes */}
        <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          {t("card.keyGenes")} ({genes.length})
        </Typography>
        <Stack spacing={0.75} sx={{ mt: 0.5 }}>
          {genes.map((g) => (
            <Stack
              key={g.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                py: 0.75,
                px: 1,
                border: 1,
                borderColor: "divider",
                borderRadius: 2,
              }}
            >
              <GeneIcon no={g.no} family={g.family} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: "monospace",
                      fontWeight: 400,
                      fontSize: "0.75em",
                      color: "text.secondary",
                      mr: 0.5,
                    }}
                  >
                    #{String(g.no).padStart(2, "0")}
                  </Box>
                  {g.name[locale]}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  noWrap
                  sx={{ display: "block" }}
                >
                  {g.boosts.map((b) => skillLabel(b, locale)).join(" · ")}
                </Typography>
                <GeneMods gene={g} locale={locale} />
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
