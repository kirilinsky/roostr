import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ArenaTop from "@/components/ArenaTop";
import { getLeaderboardRoostrs } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Arena › Overall top — global top-10 leaderboard across all players, rankable by
// attack / defense / utility stat-sums. Birds hydrated server-side; the client
// component does the (cheap) re-sort per filter.
export default async function ArenaTopPage() {
  const { t } = await getTranslations();
  const entries = (await getLeaderboardRoostrs()).map((e) => ({
    roostr: hydrateRoostr(e.row),
    ownerName: e.ownerName,
  }));

  return (
    <Container maxWidth="sm" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/arena"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("nav.arena")}
        </Button>

        <Box>
          <Typography variant="h4" component="h1">
            🏆 {t("arena.top")}
          </Typography>
          <Typography color="text.secondary">{t("arena.topDesc")}</Typography>
        </Box>

        <ArenaTop entries={entries} />
      </Stack>
    </Container>
  );
}
