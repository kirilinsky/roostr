import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// Placeholder page for routes that are not built yet.
export default async function StubPage({ titleKey }: { titleKey: string }) {
  const { t } = await getTranslations();
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          {t(titleKey)}
        </Typography>
        <Typography color="text.secondary">{t("about.tba")}</Typography>
      </Stack>
    </Container>
  );
}
