import Link from "next/link";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardActionArea from "@mui/material/CardActionArea";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// Shop hub — category blocks. Buy from the system (vs the player-to-player Market).
// Only the synthetic-gene catalog is live; the rest are placeholders for future
// stock. Add a category = one entry here + its page.
const CATEGORIES = [
  {
    href: "/shop/synth-genes",
    icon: "🧬",
    titleKey: "lab.geneShop",
    descKey: "lab.geneShopDesc",
    live: true,
  },
  {
    href: "/shop/eggs",
    icon: "🥚",
    titleKey: "shop.eggsTitle",
    descKey: "shop.eggsDesc",
    live: true,
  },
  {
    href: "/shop",
    icon: "🎨",
    titleKey: "shop.cosmeticsTitle",
    descKey: "shop.cosmeticsDesc",
    live: false,
  },
] as const;

export default async function ShopPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" component="h1">
            🛍️ {t("shop.title")}
          </Typography>
          <Typography color="text.secondary">{t("shop.desc")}</Typography>
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
          {CATEGORIES.map((c, i) => {
            const inner = (
              <Stack spacing={0.5} sx={{ p: 2 }}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                >
                  <Typography variant="h5" component="span">
                    {c.icon}
                  </Typography>
                  {!c.live && (
                    <Chip
                      label={t("pedia.soon")}
                      size="small"
                      variant="outlined"
                    />
                  )}
                </Stack>
                <Typography variant="h6">{t(c.titleKey)}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {t(c.descKey)}
                </Typography>
              </Stack>
            );
            return (
              <Card key={i} sx={{ opacity: c.live ? 1 : 0.6 }}>
                {c.live ? (
                  <CardActionArea component={Link} href={c.href}>
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
