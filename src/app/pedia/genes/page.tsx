import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import StatModBadges from "@/components/StatModBadges";
import {
  GENES,
  FAMILIES,
  FAMILY_COLOR,
  roleLabel,
  skillLabel,
} from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";
import { MONO_FONT } from "@/lib/tokens";
import { contrastText } from "@/lib/contrast";

const FAMILY_NAME = Object.fromEntries(FAMILIES.map((f) => [f.id, f.name]));

// Roostrpedia article: every gene and what it does. Read-only reference.
export default async function PediaGenesPage() {
  const { locale, t } = await getTranslations();
  const genes = [...GENES].sort((a, b) => a.no - b.no);

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
            {t("pedia.genes.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.genes.desc")}</Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              lg: "repeat(3, 1fr)",
            },
          }}
        >
          {genes.map((g) => {
            const color = FAMILY_COLOR[g.family] ?? "#888";
            return (
              <Card key={g.id} sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <GeneIcon no={g.no} family={g.family} size={75} />
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                      <Box
                        component="span"
                        sx={{ fontFamily: MONO_FONT, color: "text.secondary", mr: 0.5 }}
                      >
                        #{String(g.no).padStart(2, "0")}
                      </Box>
                      {g.name[locale]}
                    </Typography>
                    <Chip
                      label={FAMILY_NAME[g.family]?.[locale] ?? g.family}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: color,
                        color: contrastText(color),
                      }}
                    />
                  </Box>
                </Stack>

                <StatModBadges mods={g.statMods} locale={locale} />

                <Typography variant="caption" color="text.secondary" component="div">
                  {t("pedia.genes.boosts")}:{" "}
                  {g.boosts.map((b) => skillLabel(b, locale)).join(" · ")}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div">
                  {t("pedia.genes.weakness")}: {skillLabel(g.weakness, locale)} ·{" "}
                  {t("pedia.genes.role")}: {roleLabel(g.role, locale)}
                </Typography>
                {g.passive && (
                  <Typography variant="caption" sx={{ fontStyle: "italic" }}>
                    {g.passive}
                  </Typography>
                )}
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Container>
  );
}
