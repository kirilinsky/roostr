import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// Mechanics is a sub-category of Roostrpedia: each game system gets its own
// article. First one live: skill/gene upgrade.
const ARTICLES = [
  {
    href: "/pedia/mechanics/hatching",
    icon: "🥚",
    titleKey: "pedia.mech.hatch.title",
    descKey: "pedia.mech.hatch.desc",
    live: true,
  },
  {
    href: "/pedia/mechanics/feathers",
    icon: "🪶",
    titleKey: "pedia.mech.feathers.title",
    descKey: "pedia.mech.feathers.desc",
    live: true,
  },
  {
    href: "/pedia/mechanics/upgrades",
    icon: "⬆️",
    titleKey: "pedia.mech.upgrade.title",
    descKey: "pedia.mech.upgrade.desc",
    live: true,
  },
  // Placeholders — systems not built yet.
  {
    href: "/pedia/mechanics",
    icon: "⚔️",
    titleKey: "pedia.mech.battle.title",
    descKey: "pedia.mech.battle.desc",
    live: false,
  },
  {
    href: "/pedia/mechanics",
    icon: "🗡️",
    titleKey: "pedia.mech.raids.title",
    descKey: "pedia.mech.raids.desc",
    live: false,
  },
  {
    href: "/pedia/mechanics",
    icon: "🗓️",
    titleKey: "pedia.mech.seasons.title",
    descKey: "pedia.mech.seasons.desc",
    live: false,
  },
  {
    href: "/pedia/mechanics/farm",
    icon: "🌾",
    titleKey: "pedia.mech.farm.title",
    descKey: "pedia.mech.farm.desc",
    live: true,
  },
  {
    href: "/pedia/mechanics/lab",
    icon: "🧪",
    titleKey: "pedia.mech.lab.title",
    descKey: "pedia.mech.lab.desc",
    live: true,
  },
  {
    href: "/pedia/mechanics/roostrdex",
    icon: "📕",
    titleKey: "pedia.mech.dex.title",
    descKey: "pedia.mech.dex.desc",
    live: true,
  },
  {
    href: "/pedia/mechanics/bank",
    icon: "🏦",
    titleKey: "pedia.mech.bank.title",
    descKey: "pedia.mech.bank.desc",
    live: true,
  },
  {
    href: "/pedia/mechanics",
    icon: "🛒",
    titleKey: "pedia.mech.market.title",
    descKey: "pedia.mech.market.desc",
    live: false,
  },
] as const;

export default async function PediaMechanicsPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
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
            {t("pedia.mechanics.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.mechanics.desc")}</Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {ARTICLES.map((a, i) => {
            const inner = (
              <Stack spacing={0.5} sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="h5" component="span">
                    {a.icon}
                  </Typography>
                  {!a.live && (
                    <Chip label={t("pedia.soon")} size="small" variant="outlined" />
                  )}
                </Stack>
                <Typography variant="h6">{t(a.titleKey)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(a.descKey)}
                </Typography>
              </Stack>
            );
            return (
              <Card key={i} sx={{ opacity: a.live ? 1 : 0.6 }}>
                {a.live ? (
                  <CardActionArea component={Link} href={a.href}>
                    {inner}
                  </CardActionArea>
                ) : (
                  inner
                )}
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Container>
  );
}
