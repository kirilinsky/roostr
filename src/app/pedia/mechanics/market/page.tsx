import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { LISTING_TTL_HOURS } from "@/lib/roostr";
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

// Mechanics article: the market — fixed-price rooster trading between players.
// The listing TTL comes from the live constant so the article can't drift.
export default async function PediaMarketPage() {
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
            {t("pedia.mech.market.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.mech.market.desc")}</Typography>
        </Box>

        <Section
          title={t("pedia.mech.market.sellTitle")}
          body={t("pedia.mech.market.sell", { ttl: LISTING_TTL_HOURS })}
        />
        <Section
          title={t("pedia.mech.market.buyTitle")}
          body={t("pedia.mech.market.buy")}
        />
        <Section
          title={t("pedia.mech.market.lockTitle")}
          body={t("pedia.mech.market.lock")}
        />

        <Button
          component={Link}
          href="/market"
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
        >
          🛒 {t("pedia.mech.market.cta")}
        </Button>
      </Stack>
    </Container>
  );
}
