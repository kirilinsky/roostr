"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ResourceIcon from "@/components/ResourceIcon";
import type { RaidLogEntry } from "@/components/raids/shared";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Raid log — the latest 3 raids inline; the full detailed ledger lives on
// /raids/history ("view all").
export default function RaidLogList({ history }: { history: RaidLogEntry[] }) {
  const t = useT();
  const locale = useLocale();
  if (history.length === 0) return null;

  return (
    <Stack spacing={1}>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="h6">📜 {t("raids.historyTitle")}</Typography>
        {history.length > 3 && (
          <Button component={Link} href="/raids/history" size="small" color="neutral">
            {t("raids.historyAll", { n: history.length })} →
          </Button>
        )}
      </Stack>
      <Card sx={{ p: { xs: 1, md: 1.5 } }}>
        <Stack divider={<Box sx={{ borderBottom: 1, borderColor: "divider" }} />}>
          {history.slice(0, 3).map((h) => {
            return (
              <Stack
                key={h.id}
                direction="row"
                spacing={1}
                alignItems="center"
                sx={{ py: 0.75, minWidth: 0 }}
              >
                <Box component="span" sx={{ fontSize: 16, lineHeight: 1, flexShrink: 0 }}>
                  {h.success ? "✅" : "💨"}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 0, flexGrow: 1 }} noWrap>
                  {h.targetName[locale]}
                  {h.isPvp && " ⚔"}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                >
                  {h.success ? (
                    <>
                      +{h.lootCoins} <ResourceIcon kind="coin" size={12} />
                      {h.lootEggs > 0 && (
                        <>
                          {" "}
                          +{h.lootEggs} <ResourceIcon kind="egg" size={12} />
                        </>
                      )}
                    </>
                  ) : (
                    "—"
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                >
                  {new Date(h.at).toLocaleDateString(locale)}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
      </Card>
    </Stack>
  );
}
