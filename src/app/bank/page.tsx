import Image from "next/image";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import { getTranslations } from "@/i18n/server";

export default async function BankPage() {
  const { t } = await getTranslations();

  // No economy / DB yet — balance is a placeholder, ledger is empty.
  const coinBalance = 0;

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("bank.title")}
        </Typography>

        {/* Balance */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="overline" color="text.secondary">
              {t("bank.balance")}
            </Typography>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Image
                src="/corn-coin.png"
                alt={t("currency.coin")}
                width={43}
                height={40}
                style={{ height: 40, width: "auto" }}
              />
              <Typography variant="h3" sx={{ fontWeight: 700 }}>
                {coinBalance.toLocaleString()}
              </Typography>
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {t("currency.coin")}
            </Typography>
            <Button variant="contained" disabled sx={{ mt: 2 }}>
              {t("bank.topup")}
            </Button>
          </CardContent>
        </Card>

        <Divider />

        {/* Ledger (income / expenses) — empty for now */}
        <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
          <Typography color="text.secondary">{t("bank.empty")}</Typography>
        </Stack>
      </Stack>
    </Container>
  );
}
