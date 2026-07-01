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
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Card>
  );
}

// Mechanics article: the Hospital — heal hurt birds over time, paced by Recovery.
export default async function PediaHospitalPage() {
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
            🏥 {t("pedia.mech.hospital.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.mech.hospital.desc")}</Typography>
        </Box>

        <Section title={t("pedia.mech.hospital.whatTitle")} body={t("pedia.mech.hospital.what")} />
        <Section title={t("pedia.mech.hospital.rateTitle")} body={t("pedia.mech.hospital.rate")} />
        <Section title={t("pedia.mech.hospital.bedsTitle")} body={t("pedia.mech.hospital.beds")} />
        <Section title={t("pedia.mech.hospital.potionTitle")} body={t("pedia.mech.hospital.potion")} />

        <Button
          component={Link}
          href="/hospital"
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
        >
          {t("pedia.mech.hospital.cta")}
        </Button>
      </Stack>
    </Container>
  );
}
