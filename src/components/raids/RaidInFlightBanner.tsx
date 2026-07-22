"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { raidSuccess, raidLoot } from "@/lib/raids";
import { fmtDuration, type ActiveRaidUi } from "@/components/raids/shared";
import { useLocale, useT } from "@/i18n/I18nProvider";

// The mission-in-flight banner: the marching-party gif (public/raid-loop.gif,
// self-hides until the asset exists), the target/odds/loot readout and either a
// countdown chip or the Collect button once the timer is done.
export default function RaidInFlightBanner({
  raid,
  now,
  busy,
  onCollect,
}: {
  raid: ActiveRaidUi;
  now: number; // ms epoch (live-ticked by the parent)
  busy: boolean;
  onCollect: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const [gifOk, setGifOk] = useState(true);

  const left = raid.endsAt - now;
  const odds = raidSuccess(raid.power, raid.defense);
  const loot = raidLoot(raid.luck, raid.pool, raid.defense);
  const done = now >= raid.endsAt;

  return (
    <Card sx={{ borderColor: "secondary.main", overflow: "hidden" }}>
      {/* Wide, short mission banner — scaled by aspect (1029×179), never cropped;
          lazy: the gif is heavy. */}
      {gifOk && (
        <Box
          component="img"
          src="/raid-loop.gif"
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setGifOk(false)}
          sx={{
            display: "block",
            width: "100%",
            height: "auto",
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        />
      )}
      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={1.5}
        alignItems={{ md: "center" }}
        justifyContent="space-between"
        sx={{ p: { xs: 1.5, md: 2 } }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 800 }}>
            🗡 {t("raids.inFlight", { target: raid.targetName[locale] })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t("raids.inFlightMeta", {
              party: raid.partySize,
              odds: Math.round(odds * 100),
              loot,
            })}
          </Typography>
        </Box>
        {done ? (
          <Button variant="contained" color="secondary" onClick={onCollect} disabled={busy}>
            {busy ? <CircularProgress size={20} color="inherit" /> : `🎒 ${t("raids.collect")}`}
          </Button>
        ) : (
          <Chip
            label={`⏳ ${fmtDuration(left, locale)}`}
            sx={{
              fontWeight: 800,
              fontVariantNumeric: "tabular-nums",
              alignSelf: { xs: "flex-start", md: "center" },
            }}
          />
        )}
      </Stack>
    </Card>
  );
}
