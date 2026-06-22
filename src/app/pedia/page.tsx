import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// Roostrpedia — wiki-style index of articles (mechanics, breeds, genes).
// Scaffold: only the Genes article is live; the rest are placeholders.
const ARTICLES = [
  { href: "/pedia/genes", icon: "🧬", titleKey: "pedia.genes.title", descKey: "pedia.genes.desc", live: true },
  { href: "/pedia/synth-genes", icon: "⚗️", titleKey: "pedia.synthGenes.title", descKey: "pedia.synthGenes.desc", live: true },
  { href: "/pedia/breeds", icon: "🐔", titleKey: "pedia.breeds.title", descKey: "pedia.breeds.desc", live: true },
  { href: "/pedia/groups", icon: "📂", titleKey: "pedia.groups.title", descKey: "pedia.groups.desc", live: true },
  { href: "/pedia/skills", icon: "📊", titleKey: "pedia.skills.title", descKey: "pedia.skills.desc", live: true },
  { href: "/pedia/archetypes", icon: "🧭", titleKey: "pedia.archetypes.title", descKey: "pedia.archetypes.desc", live: true },
  { href: "/pedia/mechanics", icon: "⚙️", titleKey: "pedia.mechanics.title", descKey: "pedia.mechanics.desc", live: true },
] as const;

export default async function PediaPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1">
            {t("pedia.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.subtitle")}</Typography>
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
