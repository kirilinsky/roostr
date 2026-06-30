import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneGrid from "@/components/SynthGeneGrid";
import SynthGeneShop from "@/components/SynthGeneShop";
import { getSession } from "@/lib/auth";
import { getCollectionRoostrs, getUserById } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { synthGenePrice } from "@/lib/shop";
import { getTranslations } from "@/i18n/server";

// Shop › Synthetic genes — catalog of lab-built genes (one skill, no debuff).
// Buyable: each gene splices into a chosen bird for science. Guests see the
// read-only catalog (shared with the Roostrpedia article via SynthGeneGrid).
export default async function ShopSynthGenesPage() {
  const { t } = await getTranslations();
  const session = await getSession();

  const price = synthGenePrice();
  const sci = session ? (await getUserById(session.id))?.sci ?? 0 : 0;
  const roostrs = session
    ? (await getCollectionRoostrs(session.id)).map(hydrateRoostr)
    : [];

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/shop"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("shop.title")}
        </Button>

        <Box>
          <Typography variant="h4" component="h1">
            🧬 {t("lab.geneShop")}
          </Typography>
          <Typography color="text.secondary">{t("lab.geneShopDesc")}</Typography>
        </Box>

        {session ? (
          <SynthGeneShop roostrs={roostrs} sci={sci} price={price} />
        ) : (
          <SynthGeneGrid />
        )}
      </Stack>
    </Container>
  );
}
