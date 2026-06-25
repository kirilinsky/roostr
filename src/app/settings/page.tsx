import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SettingsView from "@/components/SettingsView";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/db/queries";
import { getTranslations } from "@/i18n/server";

export default async function SettingsPage() {
  const { t } = await getTranslations();
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

  const dbUser = await getUserById(session.id);
  const collectionPublic = dbUser?.collectionPublic ?? true;

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">
          {t("nav.settings")}
        </Typography>
        <SettingsView collectionPublic={collectionPublic} />
      </Stack>
    </Container>
  );
}
