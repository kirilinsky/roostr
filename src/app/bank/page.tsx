import Image from "next/image";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
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
const RESOURCE_META: Record<ResourceKind, { icon: string; labelKey: string }> =
  {
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
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={2.5}>
        <Typography variant="h4" component="h1">
          {t("bank.title")}
        </Typography>

        {/* Desktop: controls (balance + actions) left, history right. Mobile: stacked. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              md: "minmax(0, 340px) minmax(0, 1fr)",
            },
            gap: 2.5,
            alignItems: "start",
          }}
        >
          {/* left column — balance + actions */}
          <Stack spacing={2.5}>
            {/* Block 1 — balances, all wallet currencies in one card */}
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t("bank.balance")}
                </Typography>
                <Stack
                  direction="row"
                  divider={<Divider orientation="vertical" flexItem />}
                  sx={{ mt: 1 }}
                >
                  {WALLET.map((res) => {
                    const meta = RESOURCE_META[res];
                    return (
                      <Stack
                        key={res}
                        spacing={0.5}
                        alignItems="center"
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        <Image
                          src={meta.icon}
                          alt={t(meta.labelKey)}
                          width={28}
                          height={28}
                          style={{ height: 28, width: "auto" }}
                        />
                        <Typography variant="h6" sx={{ fontWeight: 800 }}>
                          {balances[res].toLocaleString()}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                        >
                          {t(meta.labelKey)}
                        </Typography>
                      </Stack>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>

            {/* Block 2 — money actions (top up + transfer to friend, both soon) */}
            <Card>
              <CardContent>
                <Typography variant="overline" color="text.secondary">
                  {t("bank.actions")}
                </Typography>
                <Stack spacing={1} sx={{ mt: 1 }}>
                  <Button
                    variant="contained"
                    disabled
                    fullWidth
                    endIcon={
                      <Chip
                        label={t("pedia.soon")}
                        size="small"
                        variant="outlined"
                      />
                    }
                  >
                    {t("bank.topup")}
                  </Button>
                  <Button
                    variant="outlined"
                    color="neutral"
                    disabled
                    fullWidth
                    endIcon={
                      <Chip
                        label={t("pedia.soon")}
                        size="small"
                        variant="outlined"
                      />
                    }
                  >
                    {t("bank.transfer")}
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Stack>

          {/* right column — transaction history */}
          {/* Block 3 — ledger: income (+) / expense (−) across currencies, newest first */}
          <Card>
            <CardContent>
              <Typography variant="overline" color="text.secondary">
                {t("bank.history")}
              </Typography>
              {txns.length === 0 ? (
                <Stack spacing={1} alignItems="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {t("bank.empty")}
                  </Typography>
                </Stack>
              ) : (
                <List disablePadding sx={{ mt: 0.5 }}>
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
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                            noWrap
                          >
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
            </CardContent>
          </Card>
        </Box>
      </Stack>
    </Container>
  );
}
