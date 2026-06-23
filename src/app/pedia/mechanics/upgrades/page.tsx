import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { GENE_MAX_LEVEL, TIERS, geneUpgradeCost } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Server component → can't pass an sx callback to a client Chip; pick text color
// by luminance ourselves.
function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#1c1c1f" : "#ffffff";
}

function Section({
  title,
  body,
  linkHref,
  linkLabel,
}: {
  title: string;
  body: string;
  linkHref?: string;
  linkLabel?: string;
}) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
      {linkHref && linkLabel && (
        <Button
          component={Link}
          href={linkHref}
          size="small"
          variant="outlined"
          color="neutral"
          sx={{ mt: 1.5 }}
        >
          {linkLabel}
        </Button>
      )}
    </Card>
  );
}

// Mechanics article: skill/gene upgrade — spend coins → genes level → stats grow
// → overall level (tier) climbs. Numbers pulled live from the real formulas.
export default async function PediaUpgradesPage() {
  const { t } = await getTranslations();

  // Real cost progression illustration.
  const costRows = [1, 5, GENE_MAX_LEVEL - 1].map((lvl) => ({
    from: lvl,
    to: lvl + 1,
    cost: geneUpgradeCost(lvl),
  }));

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
            {t("pedia.mech.upgrade.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.upgrade.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.upgrade.overviewTitle")}
          body={t("pedia.mech.upgrade.overview")}
          linkHref="/pedia/genes"
          linkLabel={t("pedia.genes.title")}
        />

        <Card sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t("pedia.mech.upgrade.costTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("pedia.mech.upgrade.cost", { max: GENE_MAX_LEVEL })}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {costRows.map((r) => (
              <Chip
                key={r.from}
                size="small"
                variant="outlined"
                label={`Lv ${r.from}→${r.to}: ${r.cost} 🌽`}
              />
            ))}
          </Stack>
          <Button
            component={Link}
            href="/pedia/mechanics/bank"
            size="small"
            variant="outlined"
            color="neutral"
            sx={{ mt: 1.5 }}
          >
            {t("pedia.mech.bank.title")}
          </Button>
        </Card>

        <Section
          title={t("pedia.mech.upgrade.statsTitle")}
          body={t("pedia.mech.upgrade.stats")}
          linkHref="/pedia/skills"
          linkLabel={t("pedia.skills.title")}
        />

        <Card sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t("pedia.mech.upgrade.levelTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {t("pedia.mech.upgrade.level")}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {TIERS.map((tier) => (
              <Chip
                key={tier.id}
                size="small"
                label={tier.id}
                sx={{
                  fontWeight: 800,
                  bgcolor: tier.color,
                  color: contrastText(tier.color),
                }}
              />
            ))}
          </Stack>
          <Button
            component={Link}
            href="/pedia/tiers"
            size="small"
            variant="outlined"
            color="neutral"
            sx={{ mt: 1.5 }}
          >
            {t("pedia.tiers.title")}
          </Button>
        </Card>

        <Section
          title={t("pedia.mech.upgrade.whereTitle")}
          body={t("pedia.mech.upgrade.where")}
          linkHref="/collection"
          linkLabel={t("nav.collection")}
        />

        <Card sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {t("pedia.mech.upgrade.synthTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {t("pedia.mech.upgrade.synth")}
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
      </Stack>
    </Container>
  );
}
