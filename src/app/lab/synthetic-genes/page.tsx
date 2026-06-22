import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneGrid from "@/components/SynthGeneGrid";
import { getTranslations } from "@/i18n/server";

// Gene shop — catalog of synthetic genes (lab-built, one skill, no debuff).
// Read-only for now: shares SynthGeneGrid with the Roostrpedia article. Buying TBA.
export default async function SyntheticGenesPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/lab"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("nav.lab")}
        </Button>

        <Box>
          <Stack
            direction="row"
            alignItems="center"
            spacing={1}
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="h4" component="h1">
              🧬 {t("lab.geneShop")}
            </Typography>
            <Chip
              label={t("about.tba")}
              size="small"
              color="secondary"
              variant="outlined"
            />
          </Stack>
          <Typography color="text.secondary">{t("lab.geneShopDesc")}</Typography>
        </Box>

        <SynthGeneGrid />
      </Stack>
    </Container>
  );
}
