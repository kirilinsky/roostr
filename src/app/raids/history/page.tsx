import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ResourceIcon from "@/components/ResourceIcon";
import { getSession } from "@/lib/auth";
import { getRaidHistoryDetailed } from "@/db/queries";
import { raidBotById, raidSuccess } from "@/lib/raids";
import { BREED_BY_ID } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Full raid history — every resolved raid with its launch snapshot: who went,
// what the odds were (party power vs the coop's watch), how long the trip took
// and what came home. The /raids page shows only the latest few; this is the
// whole ledger.
export default async function RaidHistoryPage() {
  const { t, locale } = await getTranslations();
  const session = await getSession();

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography color="text.secondary" textAlign="center">
          {t("collection.guest")}
        </Typography>
      </Container>
    );
  }

  const raids = await getRaidHistoryDetailed(session.id);
  const fmtDate = (ms: number) =>
    new Date(ms).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  const fmtHours = (ms: number) => Math.max(1, Math.round(ms / 3_600_000));

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button component={Link} href="/raids" color="neutral" sx={{ alignSelf: "flex-start" }}>
          ← {t("nav.raids")}
        </Button>

        <Typography variant="h4" component="h1">
          📜 {t("raids.historyTitle")}
        </Typography>

        {raids.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
            {t("raids.historyEmpty")}
          </Typography>
        ) : (
          <Stack spacing={1.5}>
            {raids.map((r) => {
              const bot = raidBotById(r.botId ?? "");
              const odds = Math.round(raidSuccess(r.power, r.defense) * 100);
              return (
                <Card key={r.id} sx={{ p: { xs: 1.5, md: 2 } }}>
                  {/* header: outcome + target + when */}
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="subtitle1" sx={{ fontWeight: 800, minWidth: 0 }} noWrap>
                      {r.success ? "✅" : "💨"} {bot?.name[locale] ?? r.botId}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
                    >
                      {fmtDate(r.resolvedAt)}
                    </Typography>
                  </Stack>

                  {/* the numbers: haul, odds, contest snapshot, trip length */}
                  <Stack
                    direction="row"
                    spacing={{ xs: 1.5, md: 3 }}
                    flexWrap="wrap"
                    useFlexGap
                    sx={{ mt: 1 }}
                  >
                    <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
                      {r.success ? (
                        <>
                          +{r.lootCoins} <ResourceIcon kind="coin" size={13} />
                          {r.lootEggs > 0 && (
                            <>
                              {" "}
                              +{r.lootEggs} <ResourceIcon kind="egg" size={13} />
                            </>
                          )}
                          {r.wasConsolation && (
                            <Box component="span" sx={{ fontWeight: 400, color: "text.secondary" }}>
                              {" "}
                              · {t("raids.histConsolation")}
                            </Box>
                          )}
                        </>
                      ) : (
                        t("raids.histNoLoot")
                      )}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      🎲 {t("raids.histOdds", { odds })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      🥷 {r.power} vs 🛡 {r.defense}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ fontVariantNumeric: "tabular-nums" }}>
                      ⏱ {t("raids.histTrip", { h: fmtHours(r.resolvedAt - r.startedAt) })}
                    </Typography>
                  </Stack>

                  {/* the crew */}
                  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                    {r.party.map((m) => {
                      const breed = BREED_BY_ID[m.breedId];
                      const name = m.nickname || breed?.name[locale] || "?";
                      return (
                        <Chip
                          key={m.id}
                          component={Link}
                          href={`/collection/${m.id}`}
                          clickable
                          size="small"
                          variant="outlined"
                          label={`🐔 ${name}`}
                        />
                      );
                    })}
                  </Stack>
                </Card>
              );
            })}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
