import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { BREED_GROUP_LIST, BREEDS_CATALOG } from "@/lib/breeds";
import { getTranslations } from "@/i18n/server";

// Roostrpedia article: breed groups — emoji, name, what they're about + count.
export default async function PediaGroupsPage() {
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
            {t("pedia.groups.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.groups.desc")}</Typography>
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
          {BREED_GROUP_LIST.map((g) => {
            const count = BREEDS_CATALOG.filter((b) => b.group === g.id).length;
            return (
              <Card key={g.id} sx={{ p: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography sx={{ fontSize: 40, lineHeight: 1 }}>{g.icon}</Typography>
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {g.name[locale]}
                    </Typography>
                  </Box>
                  <Chip label={`${count} 🐔`} size="small" />
                </Stack>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                  {g.description[locale]}
                </Typography>
              </Card>
            );
          })}
        </Box>
      </Stack>
    </Container>
  );
}
