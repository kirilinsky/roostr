"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatar from "@/components/RoostrAvatar";
import BattleRecord from "@/components/BattleRecord";
import { contrastText } from "@/lib/contrast";
import { tierBackground } from "@/lib/tierBg";
import { TIERS, WEIGHT_CLASSES, type HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Left column of the detail page: the animated hero avatar + the level / rating /
// battle-record / HP / weight readout card.
export default function IdentityCard({ roostr }: { roostr: HydratedRoostr }) {
  const t = useT();
  const locale = useLocale();
  const tier = roostr.tier;
  const kgUnit = locale === "ru" ? "кг" : "kg";
  const weightIdx = WEIGHT_CLASSES.findIndex((w) => w.id === roostr.weightClass.id);
  const curHp = roostr.currentHp ?? roostr.maxHealth; // stored HP (null = full)
  const nextTier = TIERS.find((tr) => tr.min > roostr.rating);
  const bandPct = nextTier
    ? Math.min(100, ((roostr.rating - tier.min) / (nextTier.min - tier.min)) * 100)
    : 100;

  return (
    <Stack spacing={1.5} sx={{ minWidth: 0 }}>
      <Box
        sx={{ position: "relative", width: "100%", maxWidth: { xs: 340, md: "none" }, mx: "auto" }}
      >
        <Box
          sx={{
            aspectRatio: "1 / 1",
            borderRadius: 0,
            border: 4,
            borderColor: "neutral.main",
            overflow: "hidden",
            background: tierBackground(tier.color),
          }}
        >
          <RoostrAvatar traits={roostr.cosmetic} animate fill />
        </Box>
        <Chip
          label={`★ ${tier.id}`}
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            fontWeight: 800,
            bgcolor: tier.color,
            color: contrastText(tier.color),
          }}
        />
      </Box>

      {/* level / rating progress */}
      <Card sx={{ p: 1.5 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
            {t("collection.level")} {tier.id}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
          >
            {roostr.rating}
            {nextTier ? ` / ${nextTier.min}` : ""}
          </Typography>
        </Stack>
        <LinearProgress variant="determinate" value={bandPct} sx={{ height: 8, borderRadius: 0 }} />

        {/* battle record — wins/losses (green/red), labelled on hover */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            ⚔️ {t("detail.record")}
          </Typography>
          <BattleRecord
            wins={roostr.wins}
            losses={roostr.losses}
            draws={roostr.draws}
            variant="body2"
          />
        </Stack>

        {/* HP — current / max (current = full until battle damage exists) */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            ♥ HP
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
            {curHp}/{roostr.maxHealth}
          </Typography>
        </Stack>
        <LinearProgress
          variant="determinate"
          color="error"
          value={(curHp / roostr.maxHealth) * 100}
          sx={{ height: 8, borderRadius: 0 }}
        />

        {/* Weight grade — a shifting scale (tiny → huge); current is filled. */}
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1, mb: 0.5 }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            ⚖️ {roostr.weightClass.name[locale]}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
            {roostr.weightClass.kg} {kgUnit}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          {WEIGHT_CLASSES.map((w, i) => (
            <Box
              key={w.id}
              title={`${w.name[locale]} · ${w.kg} ${kgUnit}`}
              sx={{
                flex: 1,
                height: 8,
                borderRadius: 0,
                bgcolor: i <= weightIdx ? "tertiary.main" : "action.hover",
              }}
            />
          ))}
        </Stack>

        {/* Hatch date — when this bird was minted (createdAt). */}
        {roostr.hatchedAt != null && (
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mt: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              🥚 {t("detail.hatched")}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
              {new Date(roostr.hatchedAt).toLocaleDateString(locale)}
            </Typography>
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
