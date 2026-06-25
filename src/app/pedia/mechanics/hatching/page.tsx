import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

function Section({ title, body }: { title: string; body: string }) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Card>
  );
}

// Mechanics article: hatching — daily free hatch, coin skip, future farm eggs,
// and what comes out (always Common, random gene count).
export default async function PediaHatchingPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={2.5}>
        <Button
          component={Link}
          href="/pedia/mechanics"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("pedia.mechanics.title")}
        </Button>

        <Box>
          <Typography variant="h4" component="h1">
            {t("pedia.mech.hatch.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.hatch.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.hatch.dailyTitle")}
          body={t("pedia.mech.hatch.daily")}
        />
        <Section
          title={t("pedia.mech.hatch.skipTitle")}
          body={t("pedia.mech.hatch.skip")}
        />
        <Section
          title={t("pedia.mech.hatch.eggsTitle")}
          body={t("pedia.mech.hatch.eggs")}
        />
        <Section
          title={t("pedia.mech.hatch.outcomeTitle")}
          body={t("pedia.mech.hatch.outcome")}
        />
      </Stack>
    </Container>
  );
}
