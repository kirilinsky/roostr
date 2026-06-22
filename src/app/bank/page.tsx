import Image from "next/image";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  getResourceTxns,
  type ResourceKind,
  type ResourceTxn,
} from "@/db/queries";

// Per-resource icon + i18n label key — drives both the balance cards and each
// ledger row's currency badge. Single source so adding a currency is one edit.
const RESOURCE_META: Record<ResourceKind, { icon: string; labelKey: string }> = {
  coin: { icon: "/corn-coin.png", labelKey: "currency.coin" },
  sci: { icon: "/sci.png", labelKey: "resource.sci" },
  egg: { icon: "/eggs.png", labelKey: "resource.eggs" },
  feather: { icon: "/feather.png", labelKey: "resource.feathers" },
};

// Currencies shown as balance cards (top of page), in display order.
const WALLET: ResourceKind[] = ["coin", "sci", "egg"];

export default async function BankPage() {
  const { locale, t } = await getTranslations();
  const session = await getSession();
  const dbUser = session ? await getUserById(session.id) : null;
  const txns: ResourceTxn[] = session
    ? await getResourceTxns(session.id, { limit: 50 })
    : [];

  const balances: Record<ResourceKind, number> = {
    coin: dbUser?.coins ?? 0,
    sci: dbUser?.sci ?? 0,
    egg: dbUser?.eggs ?? 0,
    feather: dbUser?.feathers ?? 0,
  };

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("bank.title")}
        </Typography>

        {/* Balances — one card per wallet currency */}
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {WALLET.map((res) => {
            const meta = RESOURCE_META[res];
            return (
              <Card key={res} variant="outlined" sx={{ flex: "1 1 140px" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Image
                      src={meta.icon}
                      alt={t(meta.labelKey)}
                      width={28}
                      height={28}
                      style={{ height: 28, width: "auto" }}
                    />
                    <Typography variant="h5" sx={{ fontWeight: 700 }}>
                      {balances[res].toLocaleString()}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">
                    {t(meta.labelKey)}
                  </Typography>
                </CardContent>
              </Card>
            );
          })}
        </Stack>

        <Button variant="contained" disabled>
          {t("bank.topup")}
        </Button>

        <Divider />

        {/* Ledger — income (+) / expense (−) across all currencies, newest first */}
        <Typography variant="overline" color="text.secondary">
          {t("bank.history")}
        </Typography>

        {txns.length === 0 ? (
          <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
            <Typography color="text.secondary">{t("bank.empty")}</Typography>
          </Stack>
        ) : (
          <List disablePadding>
            {txns.map((tx) => {
              const meta = RESOURCE_META[tx.resource];
              const income = tx.amount >= 0;
              return (
                <ListItem
                  key={tx.id}
                  divider
                  sx={{ px: 0, gap: 1.5 }}
                  secondaryAction={
                    <Typography
                      sx={{
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: income ? "success.main" : "error.main",
                      }}
                    >
                      {income ? "+" : "−"}
                      {Math.abs(tx.amount).toLocaleString()}
                    </Typography>
                  }
                >
                  <Image
                    src={meta.icon}
                    alt={t(meta.labelKey)}
                    width={22}
                    height={22}
                    style={{ height: 22, width: "auto" }}
                  />
                  <Stack sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {t(`txn.${tx.kind}`)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dateFmt.format(new Date(tx.at))}
                    </Typography>
                  </Stack>
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>
    </Container>
  );
}
