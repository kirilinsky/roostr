import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import BuyEggForm from "@/components/BuyEggForm";
import { getSession } from "@/lib/auth";
import { getUserById, countEggsBought } from "@/db/queries";
import { eggShopPrice } from "@/lib/shop";
import { getTranslations } from "@/i18n/server";

// Egg shop — coin → egg, price ramps with each purchase (a growth sink for the
// coins quests pile up). Server computes the price; the buy is server-validated.
export default async function EggShopPage() {
  const { t } = await getTranslations();
  const session = await getSession();

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography color="text.secondary" textAlign="center">
          {t("collection.guest")}
        </Typography>
      </Container>
    );
  }

  const coins = (await getUserById(session.id))?.coins ?? 0;
  const bought = await countEggsBought(session.id);
  const price = eggShopPrice(bought);
  const nextPrice = eggShopPrice(bought + 1);

  return (
    <Container maxWidth="sm" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
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
            🥚 {t("shop.eggsTitle")}
          </Typography>
          <Typography color="text.secondary">{t("shop.eggsDesc")}</Typography>
        </Box>

        <Card sx={{ p: { xs: 2, md: 3 } }}>
          <Stack spacing={2}>
            {/* Current balance */}
            <Stack direction="row" spacing={0.75} alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {t("shop.eggs.balance")}
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              >
                {coins.toLocaleString()}
              </Typography>
              <Image
                src="/corn-coin.png"
                alt=""
                width={18}
                height={17}
                style={{ height: 15, width: "auto" }}
              />
            </Stack>

            <BuyEggForm price={price} coins={coins} />

            {/* Ramp note + next price */}
            <Typography variant="caption" color="text.secondary">
              {t("shop.eggs.ramps")} {t("shop.eggs.next", { price: nextPrice.toLocaleString() })}
            </Typography>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
