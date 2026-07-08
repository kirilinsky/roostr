import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TierLadder from "@/components/TierLadder";
import { getTranslations } from "@/i18n/server";

// Roostrpedia article: tiers (overall power classes D–X) — what they are, where
// they come from (rating), and how to climb. The ladder itself is the shared
// TierLadder readout (same visual as the detail-page modal, no rating marker).
export default async function PediaTiersPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/pedia"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("pedia.title")}
        </Button>

        <Box>
          <Typography variant="h4" component="h1">
            {t("pedia.tiers.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.tiers.desc")}</Typography>
        </Box>

        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="body2">{t("pedia.tiers.intro")}</Typography>
        </Card>

        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <TierLadder />
        </Card>
      </Stack>
    </Container>
  );
}
