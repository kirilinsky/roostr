import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ARCHETYPES, FAMILIES, skillLabel } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

const FAMILY_NAME = Object.fromEntries(FAMILIES.map((f) => [f.id, f.name]));

// Roostrpedia article: archetypes explained — what they are, how they're decided
// from genes, and each one's families / strengths / weaknesses.
export default async function PediaArchetypesPage() {
  const { locale, t } = await getTranslations();

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
            {t("pedia.archetypes.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.archetypes.desc")}
          </Typography>
        </Box>

        {/* How it works */}
        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            {t("archetype.intro")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("pedia.archetypes.how")}
          </Typography>
        </Card>

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
          {ARCHETYPES.map((a) => (
            <Card key={a.id} sx={{ p: { xs: 1.5, md: 2 }, display: "flex", flexDirection: "column", gap: 0.75 }}>
              <Typography variant="h6">{a.name[locale]}</Typography>

              {a.families.length > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {t("archetype.families")}:{" "}
                  {a.families.map((f) => FAMILY_NAME[f]?.[locale] ?? f).join(" · ")}
                </Typography>
              )}

              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {a.strengths.map((s) => (
                  <Chip
                    key={`s-${s}`}
                    size="small"
                    variant="outlined"
                    color="success"
                    label={`+ ${skillLabel(s, locale)}`}
                  />
                ))}
                {a.weaknesses.map((s) => (
                  <Chip
                    key={`w-${s}`}
                    size="small"
                    variant="outlined"
                    color="error"
                    label={`− ${skillLabel(s, locale)}`}
                  />
                ))}
              </Stack>

              {a.note && (
                <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                  {a.note[locale]}
                </Typography>
              )}
            </Card>
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
