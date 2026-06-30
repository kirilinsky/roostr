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

// Mechanics article: the Shop — buy from the game itself (eggs live, genes via
// the synth catalog, cosmetics soon). Highlights the escalating-price egg shop.
export default async function PediaShopPage() {
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
            {t("pedia.mech.shop.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.shop.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.shop.whatTitle")}
          body={t("pedia.mech.shop.what")}
        />
        <Section
          title={t("pedia.mech.shop.eggsTitle")}
          body={t("pedia.mech.shop.eggs")}
        />
        <Section
          title={t("pedia.mech.shop.priceTitle")}
          body={t("pedia.mech.shop.price")}
        />

        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t("pedia.mech.shop.synthTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("pedia.mech.shop.synth")}
          </Typography>
          <Button
            component={Link}
            href="/pedia/synth-genes"
            size="small"
            variant="outlined"
            color="neutral"
          >
            {t("pedia.synthGenes.title")}
          </Button>
        </Card>

        <Section
          title={t("pedia.mech.shop.soonTitle")}
          body={t("pedia.mech.shop.soon")}
        />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            component={Link}
            href="/shop/eggs"
            variant="contained"
          >
            {t("pedia.mech.shop.cta")}
          </Button>
          <Button
            component={Link}
            href="/shop/synth-genes"
            variant="contained"
            color="secondary"
          >
            {t("pedia.mech.shop.synthCta")}
          </Button>
        </Stack>
      </Stack>
    </Container>
  );
}
