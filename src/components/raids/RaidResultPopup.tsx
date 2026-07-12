"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import ResourceIcon from "@/components/ResourceIcon";
import { raidBotById } from "@/lib/raids";
import type { RaidOutcome } from "@/components/raids/shared";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Raid result — the full debrief: target, haul, then every raider with stats and
// a LOUD HP toll (health is part of the raid price).
export default function RaidResultPopup({
  outcome,
  onClose,
}: {
  outcome: RaidOutcome | null;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <Popup
      open={Boolean(outcome)}
      onClose={onClose}
      title={outcome?.success ? `🎉 ${t("raids.resultWin")}` : `💨 ${t("raids.resultLoss")}`}
      maxWidth="xs"
    >
      {outcome && (
        <Stack spacing={1.5} sx={{ pb: 1 }}>
          {/* target + haul */}
          <Stack alignItems="center" textAlign="center" spacing={0.5}>
            <Typography sx={{ fontSize: 44, lineHeight: 1 }}>
              {outcome.success ? "💰" : "🪶"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              🏠 {raidBotById(outcome.botId ?? "")?.name[locale] ?? "…"}
            </Typography>
            {outcome.success ? (
              <>
                <Typography variant="h6" sx={{ fontWeight: 900 }}>
                  +{outcome.lootCoins} <ResourceIcon kind="coin" size={18} />
                  {outcome.lootEggs > 0 && (
                    <>
                      {" "}
                      · +{outcome.lootEggs} <ResourceIcon kind="egg" size={18} />
                    </>
                  )}
                </Typography>
                {outcome.wasConsolation && (
                  <Typography variant="caption" color="text.secondary">
                    {t("raids.consolation")}
                  </Typography>
                )}
              </>
            ) : (
              <Typography variant="body2" color="text.secondary">
                {t("raids.lossText")}
              </Typography>
            )}
          </Stack>

          {/* the party — each raider, their raid stats, and the HP they paid */}
          <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1 }}>
            {t("raids.resultParty")}
          </Typography>
          <Stack spacing={0.75}>
            {outcome.party.map((m) => (
              <Stack key={m.id} direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 0, flexGrow: 1 }} noWrap>
                  {m.nickname || m.breedName[locale]}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                >
                  🥷 {m.stealth} · 🍀 {m.luck}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 900,
                    fontVariantNumeric: "tabular-nums",
                    color: "error.main",
                    flexShrink: 0,
                  }}
                >
                  ♥ {m.hpBefore}→{m.hpAfter}
                </Typography>
              </Stack>
            ))}
          </Stack>

          {/* the toll, loud */}
          <Box
            sx={(theme) => ({
              textAlign: "center",
              py: 0.75,
              bgcolor: "error.main",
              color: theme.palette.error.contrastText,
              fontWeight: 900,
              fontSize: "0.9rem",
            })}
          >
            ❤️ −{outcome.hpCost} HP × {outcome.party.length}
          </Box>

          <Button variant="contained" fullWidth onClick={onClose}>
            {t("raids.resultClose")}
          </Button>
        </Stack>
      )}
    </Popup>
  );
}
