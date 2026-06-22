import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import IncubatorView from "@/components/IncubatorView";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { getUserById } from "@/db/queries";
import { getTranslations } from "@/i18n/server";

// Hatching is egg-gated: one egg, one hatch. Server reads the player's egg
// balance + admin flag and hands them to the client view (which spends on hatch).
export default async function IncubatorPage() {
  const { t } = await getTranslations();
  const session = await getSession();

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography color="text.secondary" textAlign="center">
          {t("incubator.needLogin")}
        </Typography>
      </Container>
    );
  }

  const admin = isAdmin(session.id);
  const dbUser = await getUserById(session.id);
  const eggs = dbUser?.eggs ?? 0;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4} alignItems="center" textAlign="center">
        <Stack spacing={1} alignItems="center">
          <Typography variant="h4" component="h1">
            {t("incubator.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("incubator.subtitle")}
          </Typography>
        </Stack>

        <IncubatorView initialEggs={eggs} admin={admin} />
      </Stack>
    </Container>
  );
}
