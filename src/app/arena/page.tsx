import Link from "next/link";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// Arena hub — battles are TBA, but the global leaderboard ("Overall top") is live.
export default async function ArenaPage() {
  const { t } = await getTranslations();
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          {t("nav.arena")}
        </Typography>
        <Typography color="text.secondary">{t("about.tba")}</Typography>
        <Button component={Link} href="/arena/top" variant="contained" size="large">
          🏆 {t("arena.top")}
        </Button>
      </Stack>
    </Container>
  );
}
