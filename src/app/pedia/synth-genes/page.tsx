import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneGrid from "@/components/SynthGeneGrid";
import { getTranslations } from "@/i18n/server";

// Roostrpedia article: synthetic genes — lab-built, one skill, no debuff. Shares
// SynthGeneGrid with the lab gene shop so the catalog never drifts. Read-only.
export default async function PediaSynthGenesPage() {
  const { t } = await getTranslations();

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
            {t("pedia.synthGenes.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.synthGenes.desc")}
          </Typography>
        </Box>

        <SynthGeneGrid />
      </Stack>
    </Container>
  );
}
