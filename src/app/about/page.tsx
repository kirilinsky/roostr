import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

export default async function AboutPage() {
  const { t } = await getTranslations();
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          {t("about.title")}
        </Typography>
        <Typography color="text.secondary">{t("about.description")}</Typography>
        <Typography color="text.secondary" variant="body2">
          {t("about.disclaimer")}
        </Typography>
      </Stack>
    </Container>
  );
}
