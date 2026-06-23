import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
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

// Mechanics article: the Bank — reached by tapping the top-right resource HUD.
// Holds balances + the transaction ledger; rarities and transfers are coming.
export default async function PediaBankPage() {
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
            {t("pedia.mech.bank.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.bank.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.bank.whatTitle")}
          body={t("pedia.mech.bank.what")}
        />
        <Section
          title={t("pedia.mech.bank.historyTitle")}
          body={t("pedia.mech.bank.history")}
        />

        <Card sx={{ p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            spacing={1}
          >
            <Typography variant="h6">
              {t("pedia.mech.bank.soonTitle")}
            </Typography>
            <Chip label={t("pedia.soon")} size="small" variant="outlined" />
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("pedia.mech.bank.soon")}
          </Typography>
        </Card>

        <Button
          component={Link}
          href="/bank"
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
        >
          {t("pedia.mech.bank.title")}
        </Button>
      </Stack>
    </Container>
  );
}
