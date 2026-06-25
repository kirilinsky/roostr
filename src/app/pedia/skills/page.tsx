import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { SKILLS } from "@/lib/roostr";
import {
  STAT_KIND_COLOR,
  STAT_KIND_LABEL_KEY,
  STAT_KIND_ORDER,
} from "@/lib/statKinds";
import { getTranslations } from "@/i18n/server";

// Roostrpedia article: every skill grouped by kind, with its short meaning.
export default async function PediaSkillsPage() {
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
            {t("pedia.skills.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.skills.desc")}</Typography>
        </Box>

        {STAT_KIND_ORDER.map((kind) => {
          const skills = SKILLS.filter((s) => s.kind === kind);
          return (
            <Box key={kind}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: `${STAT_KIND_COLOR[kind]}.main`,
                  }}
                />
                <Typography variant="h6">{t(STAT_KIND_LABEL_KEY[kind])}</Typography>
              </Stack>
              <Box
                sx={{
                  display: "grid",
                  gap: 1.5,
                  gridTemplateColumns: {
                    xs: "minmax(0, 1fr)",
                    sm: "repeat(2, minmax(0, 1fr))",
                  },
                }}
              >
                {skills.map((s) => (
                  <Card key={s.id} sx={{ p: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {s.name[locale]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {s.description[locale]}
                    </Typography>
                  </Card>
                ))}
              </Box>
            </Box>
          );
        })}
      </Stack>
    </Container>
  );
}
