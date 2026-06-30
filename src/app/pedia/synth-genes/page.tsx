import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneGrid from "@/components/SynthGeneGrid";
import {
  SYNTH_GENE_MAX_SLOTS,
  SYNTH_GENE_MAX_LEVEL,
  synthGeneUpgradeCost,
} from "@/lib/roostr";
import { synthGenePrice } from "@/lib/shop";
import { getTranslations } from "@/i18n/server";

// Roostrpedia article: synthetic genes — lab-built, one skill, no debuff. Shares
// SynthGeneGrid with the lab gene shop so the catalog never drifts. Explains how
// to buy (price/slots, locks into DNA) and the steep science upgrade curve.
export default async function PediaSynthGenesPage() {
  const { t } = await getTranslations();

  const price = synthGenePrice();
  // Real synth upgrade-cost progression (steep) — mirrors the rolled-gene article.
  const costRows = [1, 5, SYNTH_GENE_MAX_LEVEL - 1].map((lvl) => ({
    from: lvl,
    to: lvl + 1,
    cost: synthGeneUpgradeCost(lvl),
  }));

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

        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t("pedia.synthGenes.howTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("pedia.synthGenes.how", { price, slots: SYNTH_GENE_MAX_SLOTS })}
          </Typography>
          <Button
            component={Link}
            href="/shop/synth-genes"
            variant="contained"
            size="small"
          >
            {t("pedia.synthGenes.cta")}
          </Button>
        </Card>

        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t("pedia.synthGenes.upTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("pedia.synthGenes.up", { max: SYNTH_GENE_MAX_LEVEL })}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {costRows.map((r) => (
              <Chip
                key={r.from}
                size="small"
                variant="outlined"
                color="secondary"
                label={`Lv ${r.from}→${r.to}: ${r.cost.toLocaleString()} 🔬`}
              />
            ))}
          </Stack>
        </Card>

        <SynthGeneGrid />
      </Stack>
    </Container>
  );
}
