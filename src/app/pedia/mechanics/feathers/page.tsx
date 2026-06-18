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

// Mechanics article: feathers — the energy resource spent on battles, refilled
// over time or for coins.
export default async function PediaFeathersPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
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
            {t("pedia.mech.feathers.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.feathers.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.feathers.whatTitle")}
          body={t("pedia.mech.feathers.what")}
        />
        <Section
          title={t("pedia.mech.feathers.battleTitle")}
          body={t("pedia.mech.feathers.battle")}
        />
        <Section
          title={t("pedia.mech.feathers.refillTitle")}
          body={t("pedia.mech.feathers.refill")}
        />
      </Stack>
    </Container>
  );
}
