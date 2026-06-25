import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BreedArt from "@/components/BreedArt";
import { BREEDS_CATALOG, groupName, localize } from "@/lib/breeds";
import { formatTraitEffects } from "@/lib/roostr";
import { countryFlag } from "@/lib/flag";
import { getTranslations } from "@/i18n/server";

// Roostrpedia article: every breed — art, origin, trait, tags. Read-only.
export default async function PediaBreedsPage() {
  const { locale, t } = await getTranslations();
  const breeds = [...BREEDS_CATALOG].sort((a, b) =>
    localize(a.name, locale).localeCompare(localize(b.name, locale)),
  );

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
            {t("pedia.breeds.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.breeds.desc")}</Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
              lg: "repeat(3, minmax(0, 1fr))",
            },
          }}
        >
          {breeds.map((b) => (
            <Card key={b.id} sx={{ display: "flex", flexDirection: "column" }}>
              <BreedArt id={b.id} />
              <Box sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                    {b.name[locale]}
                  </Typography>
                  <Chip label={b.rarity} size="small" color="secondary" />
                </Stack>

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                  <Chip label={groupName(b.group, locale)} size="small" />
                  <Chip
                    label={`${countryFlag(b.region.iso)} ${b.region[locale]}`}
                    size="small"
                    variant="outlined"
                  />
                </Stack>

                <Typography variant="body2" color="text.secondary">
                  {b.description[locale]}
                </Typography>

                {/* breed trait */}
                <Typography variant="overline" color="text.secondary">
                  {t("detail.breedTrait")}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  ☆ {b.trait.name[locale]}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {b.trait.description[locale]}
                </Typography>
                <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                  {formatTraitEffects(b.trait.effects, locale)}
                </Typography>

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {b.tags.map((tag) => (
                    <Chip key={tag} label={tag} size="small" variant="outlined" />
                  ))}
                </Stack>
              </Box>
            </Card>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
