import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// First-steps onboarding article: what the game is + the early loop, each step
// linking to the relevant screen / mechanics article.
const STEPS = [
  {
    titleKey: "pedia.firstSteps.s1Title",
    bodyKey: "pedia.firstSteps.s1",
    links: [
      { href: "/incubator", labelKey: "nav.incubator" },
      { href: "/pedia/mechanics/hatching", labelKey: "pedia.mech.hatch.title" },
    ],
  },
  {
    titleKey: "pedia.firstSteps.s2Title",
    bodyKey: "pedia.firstSteps.s2",
    links: [
      { href: "/collection", labelKey: "nav.collection" },
      { href: "/roostrdex", labelKey: "nav.roostrdex" },
    ],
  },
  {
    titleKey: "pedia.firstSteps.s3Title",
    bodyKey: "pedia.firstSteps.s3",
    links: [
      { href: "/pedia/mechanics/upgrades", labelKey: "pedia.mech.upgrade.title" },
      { href: "/pedia/tiers", labelKey: "pedia.tiers.title" },
    ],
  },
  {
    titleKey: "pedia.firstSteps.s4Title",
    bodyKey: "pedia.firstSteps.s4",
    links: [
      { href: "/pedia/mechanics/farm", labelKey: "pedia.mech.farm.title" },
      { href: "/pedia/mechanics/lab", labelKey: "pedia.mech.lab.title" },
    ],
  },
  {
    titleKey: "pedia.firstSteps.s5Title",
    bodyKey: "pedia.firstSteps.s5",
    links: [{ href: "/pedia/mechanics", labelKey: "pedia.mechanics.title" }],
  },
] as const;

export default async function PediaFirstStepsPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={2.5}>
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
            {t("pedia.firstSteps.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.firstSteps.desc")}
          </Typography>
        </Box>

        <Typography variant="body1" color="text.secondary">
          {t("pedia.firstSteps.intro")}
        </Typography>

        {STEPS.map((s, i) => (
          <Card key={i} sx={{ p: { xs: 1.5, md: 2 } }}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Chip label={i + 1} color="primary" size="small" />
              <Typography variant="h6">{t(s.titleKey)}</Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {t(s.bodyKey)}
            </Typography>
            <Stack
              direction="row"
              spacing={1}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 1.5 }}
            >
              {s.links.map((l) => (
                <Button
                  key={l.href}
                  component={Link}
                  href={l.href}
                  size="small"
                  variant="outlined"
                  color="neutral"
                >
                  {t(l.labelKey)}
                </Button>
              ))}
            </Stack>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
