"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ResourceIcon from "@/components/ResourceIcon";
import type { IncomingRaid } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Victim side of PvP raids: "you were raided by X". Each row says who hit you and
// whether your Watch held (they left empty-handed) or they got in (you lost coins).
// Attribution is the point — the attacker's name is shown so revenge is possible.
export default function RaidedList({ raids }: { raids: IncomingRaid[] }) {
  const t = useT();
  const locale = useLocale();
  return (
    <Card sx={{ p: { xs: 1, md: 1.5 } }}>
      <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
        {raids.map((r) => (
          <Stack
            key={r.id}
            direction="row"
            spacing={1}
            alignItems="center"
            sx={{ py: 1, minWidth: 0 }}
          >
            <Box component="span" sx={{ fontSize: 18, lineHeight: 1, flexShrink: 0 }}>
              {r.success ? "🗡" : "🛡"}
            </Box>
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {r.success
                  ? t("notifications.raidedLost", { who: r.attackerName })
                  : t("notifications.raidedHeld", { who: r.attackerName })}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(r.at).toLocaleDateString(locale)}
              </Typography>
            </Box>
            {r.success && r.lootCoins > 0 && (
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", color: "error.main", flexShrink: 0 }}
              >
                −{r.lootCoins} <ResourceIcon kind="coin" size={13} />
              </Typography>
            )}
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
