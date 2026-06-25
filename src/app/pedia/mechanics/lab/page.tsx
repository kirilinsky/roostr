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

// Mechanics article: the laboratory work station — Intellect → science over time.
export default async function PediaLabPage() {
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
            {t("pedia.mech.lab.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.lab.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.lab.whatTitle")}
          body={t("pedia.mech.lab.what")}
        />
        <Section
          title={t("pedia.mech.lab.incomeTitle")}
          body={t("pedia.mech.lab.income")}
        />
        <Section
          title={t("pedia.mech.lab.slotsTitle")}
          body={t("pedia.mech.lab.slots")}
        />
        <Section
          title={t("pedia.mech.lab.useTitle")}
          body={t("pedia.mech.lab.use")}
        />
      </Stack>
    </Container>
  );
}
