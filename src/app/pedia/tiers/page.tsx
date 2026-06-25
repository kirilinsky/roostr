import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { TIERS } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";
import { contrastText } from "@/lib/contrast";

// Roostrpedia article: tiers (overall power classes D–X) — what they are, where
// they come from (rating), and how to climb. Ladder is sorted high → low.
export default async function PediaTiersPage() {
  const { t } = await getTranslations();
  const ladder = [...TIERS].sort((a, b) => b.min - a.min);

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

        <Card sx={{ p: 2 }}>
          <Typography variant="body2">{t("pedia.tiers.intro")}</Typography>
        </Card>

        <Stack spacing={1}>
          {ladder.map((tier) => (
            <Card
              key={tier.id}
              sx={{
                p: 1.5,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                gap: 1.5,
              }}
            >
              <Chip
                label={`★ ${tier.id}`}
                sx={{
                  fontWeight: 900,
                  fontSize: "1rem",
                  minWidth: 64,
                  bgcolor: tier.color,
                  color: contrastText(tier.color),
                }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {t("pedia.tiers.from", { n: String(tier.min) })}
              </Typography>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
