"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import GeneIcon from "@/components/GeneIcon";
import RoostrAvatar from "@/components/RoostrAvatar";
import { cosmeticForRoostr } from "@/lib/avatarV2";
import StatModBadges from "@/components/StatModBadges";
import { STAT_KIND_COLOR, type StatKind } from "@/lib/statKinds";
import { tierBackground } from "@/lib/tierBg";
import { MONO_FONT } from "@/lib/tokens";
import {
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  computeRating,
  formatTraitEffects,
  roleLabel,
  skillLabel,
  tierFor,
  type RolledRoostr,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Stat bar color by skill kind — shared map (red attack / blue defense / green).
const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, StatKind>;

function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.min(1, Math.abs(amount));
  const mix = (c: number) => Math.max(0, Math.min(255, Math.round(c + (target - c) * t)));
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

// Full "DNA passport" card shown on hatch (and the debug preview). Compact + wide:
// art panel on the left, info on the right (stacks on mobile). Cosmetic colors are a
// tight swatch strip (hover for the name) instead of a tall list of labelled chips.
export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const t = useT();
  const locale = useLocale();
  const { breed, weightClass, genes, maxHealth, stats, role, seed } = roostr;
  // V2 look (breed features + colorway from seed) — the card now shows THIS, not
  // the legacy per-part colors.
  const cosmetic = cosmeticForRoostr(breed.id, seed);
  const bodyHex = cosmetic.base;
  const V2_SWATCHES: { labelKey: string; hex: string }[] = [
    { labelKey: "card.body", hex: cosmetic.base },
    { labelKey: "card.tail", hex: cosmetic.accent1 },
    { labelKey: "card.comb", hex: cosmetic.accent2 },
    { labelKey: "card.leg", hex: cosmetic.skin },
  ];
  const seedId = `#${seed.toString(16).padStart(6, "0").toUpperCase()}`;
  const rating = computeRating(stats, maxHealth);
  const tier = tierFor(rating);
  const weightLabel = `${weightClass.kg} ${locale === "ru" ? "кг" : "kg"}`;

  return (
    <Card
      sx={(theme) => ({
        width: "100%",
        maxWidth: 1100,
        overflow: "hidden",
        boxShadow: `0 6px 18px ${alpha(theme.palette.common.black, 0.06)}`,
        border: 1,
        borderColor: alpha(tier.color, 0.48),
        borderRadius: 0,
        display: "flex",
        flexDirection: { xs: "column", md: "row" },
        background: `linear-gradient(180deg, ${alpha(tier.color, 0.08)}, ${theme.palette.background.paper} 34%)`,
      })}
    >
      {/* LEFT — art panel, tinted by body color */}
      <Box
        sx={(theme) => ({
          width: { xs: "100%", md: 292 },
          flexShrink: 0,
          p: { xs: 2, md: 2 },
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          borderRight: { md: 1 },
          borderBottom: { xs: 1, md: 0 },
          borderColor: "divider",
          background: [
            `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.2)} 0 1px, transparent 1px 10px)`,
            `radial-gradient(circle at 72% 16%, ${alpha(tier.color, 0.58)}, transparent 34%)`,
            `linear-gradient(155deg, ${bodyHex}, ${shadeHex(bodyHex, -0.3)})`,
          ].join(", "),
        })}
      >
        {/* top chips */}
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {cosmetic.pattern !== "none" && (
              <Chip
                label={cosmetic.pattern}
                size="small"
                sx={{
                  bgcolor: "common.black",
                  color: "common.white",
                  fontWeight: 800,
                  textTransform: "capitalize",
                  borderRadius: 0.75,
                }}
              />
            )}
            <Chip
              label={weightClass.name[locale]}
              size="small"
              title={weightLabel}
              sx={{
                bgcolor: "common.black",
                color: "common.white",
                fontWeight: 800,
                cursor: "help",
                borderRadius: 0.75,
              }}
            />
          </Stack>
          <Stack spacing={0.5} alignItems="flex-end">
            <Chip
              label={seedId}
              size="small"
              sx={{
                bgcolor: "background.paper",
                fontFamily: MONO_FONT,
                borderRadius: 0.75,
                boxShadow: 2,
              }}
            />
            <Chip
              label={`${tier.id} · ${rating}`}
              size="small"
              title={`${t("card.rating")} ${rating}`}
              sx={(theme) => ({
                bgcolor: tier.color,
                color: theme.palette.getContrastText(tier.color),
                fontWeight: 800,
                borderRadius: 0.75,
                boxShadow: 2,
              })}
            />
          </Stack>
        </Stack>

        {/* art — deterministic pixel avatar composited from this roostr's params */}
        <Box
          sx={(theme) => ({
            alignSelf: "center",
            width: "100%",
            maxWidth: 244,
            aspectRatio: "1 / 1",
            borderRadius: 0,
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: tierBackground(tier.color),
            border: "2px solid",
            borderColor: alpha(theme.palette.common.white, 0.82),
            boxShadow: [
              `0 16px 28px ${alpha(theme.palette.common.black, 0.22)}`,
              `inset 0 0 0 1px ${alpha(theme.palette.common.black, 0.18)}`,
            ].join(", "),
          })}
        >
          <RoostrAvatar traits={cosmetic} size={196} />
        </Box>

        {/* Colorway — the bird's 4 V2 colors (matches the avatar). */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
            gap: 0.75,
          }}
        >
          {V2_SWATCHES.map(({ labelKey, hex }) => (
            <Box
              key={labelKey}
              title={`${t(labelKey)}: ${hex}`}
              sx={{
                minWidth: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 0.25,
                px: 0.5,
                py: 0.5,
                borderRadius: 0.75,
                bgcolor: "rgba(0,0,0,0.34)",
                color: "common.white",
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
              }}
            >
              <Box
                sx={{
                  width: "100%",
                  height: 18,
                  borderRadius: 0.25,
                  bgcolor: hex,
                  border: "1px solid",
                  borderColor: "rgba(255,255,255,0.72)",
                }}
              />
              <Typography
                variant="caption"
                noWrap
                sx={{ minWidth: 0, fontSize: "0.62rem", fontWeight: 800 }}
              >
                {t(labelKey)}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* RIGHT — info */}
      <Box sx={{ flexGrow: 1, p: { xs: 2, md: 2.75 }, minWidth: 0 }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          justifyContent="space-between"
          alignItems={{ xs: "flex-start", sm: "center" }}
          spacing={1}
        >
          <Box sx={{ minWidth: 0 }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ lineHeight: 1, fontFamily: MONO_FONT }}
            >
              {seedId} / {tier.id} / {rating}
            </Typography>
            <Typography
              variant="h4"
              component="h2"
              sx={{
                fontWeight: 900,
                textTransform: "uppercase",
                lineHeight: 1.05,
                minWidth: 0,
              }}
              noWrap
            >
              {breed.name[locale]}
            </Typography>
          </Box>
          <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
            <Chip
              label={roleLabel(role, locale).toUpperCase()}
              color="primary"
              size="small"
              sx={{ flexShrink: 0, fontWeight: 900, letterSpacing: 1, borderRadius: 0.75 }}
            />
            <Chip
              label={weightLabel}
              variant="outlined"
              size="small"
              sx={{ flexShrink: 0, fontWeight: 800, borderRadius: 0.75 }}
            />
          </Stack>
        </Stack>

        <Stack
          direction="row"
          alignItems="center"
          flexWrap="wrap"
          sx={{ mt: 1.5, gap: 0.75 }}
        >
          <Chip
            size="small"
            label={`♥ ${maxHealth}`}
            variant="outlined"
            sx={{ borderRadius: 0.75, fontWeight: 800 }}
          />
          <Chip
            size="small"
            label={`☆ ${breed.trait.name[locale]}`}
            variant="outlined"
            color="secondary"
            title={breed.trait.description[locale]}
            sx={{ borderRadius: 0.75, fontWeight: 800 }}
          />
          <Typography variant="caption" color="text.secondary">
            {formatTraitEffects(breed.trait.effects, locale)}
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {/* Stats (starting values: base + weight + gene mods) */}
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="overline" color="text.secondary">
            {t("card.stats")}
          </Typography>
          <Typography variant="overline" color="text.secondary">
            {t("card.rating")} {rating}
          </Typography>
        </Stack>
        <Box
          sx={{
            mt: 0.5,
            display: "grid",
            gridTemplateColumns: { xs: "1fr 1fr", sm: "repeat(3, 1fr)" },
            gap: 1,
          }}
        >
          {SKILL_IDS.map((id) => (
            <Box
              key={id}
              sx={{
                minWidth: 0,
                p: 1,
                border: 1,
                borderColor: "divider",
                borderRadius: 0,
                bgcolor: "background.default",
              }}
            >
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary" noWrap>
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
                color={STAT_KIND_COLOR[SKILL_KIND[id]] ?? "primary"}
                sx={{ mt: 0.5, height: 6, borderRadius: 0.5 }}
              />
            </Box>
          ))}
        </Box>

        <Divider sx={{ my: 1.5 }} />

        {/* Key genes — side by side on wide screens, stacked on mobile */}
        <Typography variant="overline" color="text.secondary">
          {t("card.keyGenes")} ({genes.length})
        </Typography>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1}
          sx={{ mt: 0.5 }}
        >
          {genes.map((g) => (
            <Stack
              key={g.id}
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{
                flex: 1,
                minWidth: 0,
                py: 1,
                px: 1.25,
                border: 1,
                borderColor: "divider",
                borderRadius: 0,
                bgcolor: "background.default",
              }}
            >
              <GeneIcon no={g.no} family={g.family} />
              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                  <Box
                    component="span"
                    sx={{
                      fontFamily: MONO_FONT,
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
                <Box sx={{ mt: 0.25 }}>
                  <StatModBadges mods={g.statMods} locale={locale} />
                </Box>
              </Box>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Card>
  );
}
