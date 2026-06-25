"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import { tierBackground } from "@/lib/tierBg";
import { contrastText } from "@/lib/contrast";
import { skillLabel, type HydratedRoostr, type Skill } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

function Row({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Stack
      direction="row"
      justifyContent="space-between"
      alignItems="center"
      spacing={1}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ fontWeight: 700 }}
        noWrap
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 800, color, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

// One assigned worker on a station (farm/lab). Avatar header with a tier-colored
// level chip, the driving stat, the per-worker production rate, and a Remove action.
export default function StationWorkerCard({
  roostr,
  statId,
  rateHr,
  onRemove,
  busy,
}: {
  roostr: HydratedRoostr;
  statId: Skill;
  rateHr?: number; // omit for live/no-accrual stations (defense) — stat IS the effect
  onRemove: () => void;
  busy: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const name = roostr.nickname || roostr.breed.name[locale];
  const statValue = roostr.stats[statId] ?? 0;
  const tier = roostr.tier;

  return (
    <Card sx={{ display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* header — avatar on its tier chamber, level chip top-right */}
      <Box
        sx={{
          position: "relative",
          p: 1.25,
          display: "flex",
          justifyContent: "center",
          bgcolor: "background.default",
          borderBottom: "2px solid",
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            width: "100%",
            aspectRatio: "1 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: tierBackground(tier.color),
          }}
        >
          <RoostrAvatarPixel
            colors={roostr.colors}
            pattern={roostr.pattern}
            breed={roostr.breed}
            weightClass={roostr.weightClass}
            seed={roostr.seed}
            size={132}
          />
        </Box>
        <Chip
          label={`${tier.id} · ${roostr.rating}`}
          size="small"
          title={`${t("card.rating")} ${roostr.rating}`}
          sx={{
            position: "absolute",
            top: 8,
            right: 8,
            bgcolor: tier.color,
            color: contrastText(tier.color),
            fontWeight: 800,
          }}
        />
      </Box>

      {/* body — name, stat, rate, remove */}
      <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <Typography
          variant="subtitle1"
          noWrap
          sx={{ minWidth: 0, fontWeight: 800, lineHeight: 1.2 }}
        >
          {name}
        </Typography>
        <Row
          label={skillLabel(statId, locale)}
          value={String(statValue)}
          color="secondary.main"
        />
        {rateHr !== undefined && (
          <>
            <Divider />
            <Row
              label={t("station.rate")}
              value={`+${rateHr.toFixed(1)}/${t("station.hourShort")}`}
              color="primary.main"
            />
          </>
        )}
        <Button
          variant="contained"
          color="error"
          fullWidth
          disabled={busy}
          onClick={onRemove}
          sx={{ mt: 0.5 }}
        >
          {t("station.remove")}
        </Button>
      </Box>
    </Card>
  );
}
