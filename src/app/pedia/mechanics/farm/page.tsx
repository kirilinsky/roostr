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

// Mechanics article: the farm work station — Fertility → eggs over time.
export default async function PediaFarmPage() {
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
            {t("pedia.mech.farm.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.farm.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.farm.whatTitle")}
          body={t("pedia.mech.farm.what")}
        />
        <Section
          title={t("pedia.mech.farm.incomeTitle")}
          body={t("pedia.mech.farm.income")}
        />
        <Section
          title={t("pedia.mech.farm.slotsTitle")}
          body={t("pedia.mech.farm.slots")}
        />
        <Section
          title={t("pedia.mech.farm.claimTitle")}
          body={t("pedia.mech.farm.claim")}
        />
      </Stack>
    </Container>
  );
}
