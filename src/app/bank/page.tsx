import Image from "next/image";
import type { ReactNode } from "react";
import type { SxProps, Theme } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import BankHistory from "@/components/BankHistory";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  getResourceTxns,
  getDefenseValue,
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

function SurfaceCard({
  children,
  minHeight,
  sx,
}: {
  children: ReactNode;
  minHeight?: number;
  sx?: SxProps<Theme>;
}) {
  return (
    <Card
      variant="surface"
      sx={
        [{ height: "100%", minHeight }, ...(sx ? [sx] : [])] as SxProps<Theme>
      }
    >
      <CardContent sx={{ height: "100%", p: 2, "&:last-child": { pb: 2 } }}>
        {children}
      </CardContent>
    </Card>
  );
}

function BalanceTile({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: number;
}) {
  return (
    <SurfaceCard minHeight={132}>
      <Stack spacing={1} sx={{ height: "100%" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Image
            src={icon}
            alt={label}
            width={34}
            height={34}
            style={{ height: 34, width: "auto" }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            noWrap
            sx={{ minWidth: 0, fontWeight: 700 }}
          >
            {label}
          </Typography>
        </Stack>
        <Box sx={{ flexGrow: 1 }} />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 900,
            lineHeight: 1,
            fontSize: { xs: "1.35rem", sm: "1.75rem", md: "2rem" },
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {value.toLocaleString()}
        </Typography>
      </Stack>
    </SurfaceCard>
  );
}

export default async function BankPage() {
  const { t } = await getTranslations();
  const session = await getSession();
  const dbUser = session ? await getUserById(session.id) : null;
  const txns: ResourceTxn[] = session
    ? await getResourceTxns(session.id, { limit: 100 })
    : [];

  const balances: Record<ResourceKind, number> = {
    coin: dbUser?.coins ?? 0,
    sci: dbUser?.sci ?? 0,
    egg: dbUser?.eggs ?? 0,
    feather: dbUser?.feathers ?? 0,
  };
  // Live base defense (Σ Crow of guards on watch).
  const defenseValue = session ? await getDefenseValue(session.id) : 0;

  return (
    <Container
      maxWidth="lg"
      sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          alignItems={{ xs: "flex-start", sm: "flex-end" }}
          justifyContent="space-between"
          spacing={1}
        >
          <Box>
            <Typography variant="overline" color="text.secondary">
              {t("pedia.mech.bank.desc")}
            </Typography>
            <Typography
              variant="h4"
              component="h1"
              sx={{ fontWeight: 900, lineHeight: 1.1 }}
            >
              {t("bank.title")}
            </Typography>
          </Box>
          <Chip
            label={t("bank.history")}
            variant="outlined"
            size="small"
            sx={{ borderRadius: 0.75, fontWeight: 800 }}
          />
        </Stack>

        {/* Desktop: controls (balance + actions) left, history right. Mobile: stacked. */}
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              lg: "minmax(0, 460px) minmax(0, 1fr)",
            },
            gap: 2,
            alignItems: "start",
          }}
        >
          <Stack spacing={2}>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "repeat(3, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.25,
              }}
            >
              {WALLET.map((res) => {
                const meta = RESOURCE_META[res];
                return (
                  <BalanceTile
                    key={res}
                    icon={meta.icon}
                    label={t(meta.labelKey)}
                    value={balances[res]}
                  />
                );
              })}
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "1fr",
                  sm: "repeat(2, minmax(0, 1fr))",
                },
                gap: 1.25,
              }}
            >
              {/* Block 3 — collectible rarities (soon) */}
              <SurfaceCard minHeight={154}>
                <Stack
                  spacing={1}
                  sx={{ height: "100%", justifyContent: "space-between" }}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={1}
                  >
                    <Typography variant="overline" color="text.secondary">
                      {t("bank.rarities")}
                    </Typography>
                    <Chip
                      label={t("pedia.soon")}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 0.75 }}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {t("bank.raritiesDesc")}
                  </Typography>
                  <Box />
                </Stack>
              </SurfaceCard>

              {/* Block 4 — feathers (soon) */}
              <SurfaceCard minHeight={132}>
                <Stack
                  direction="row"
                  alignItems="center"
                  justifyContent="space-between"
                  spacing={1}
                >
                  <Stack
                    direction="row"
                    alignItems="center"
                    spacing={1.5}
                    sx={{ minWidth: 0 }}
                  >
                    <Image
                      src="/feather.png"
                      alt={t("resource.feathers")}
                      width={34}
                      height={34}
                      style={{ height: 34, width: "auto" }}
                    />
                    <Box sx={{ minWidth: 0 }}>
                      <Typography
                        variant="overline"
                        color="text.secondary"
                        sx={{ display: "block", lineHeight: 1.2 }}
                      >
                        {t("resource.feathers")}
                      </Typography>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>
                        {balances.feather.toLocaleString()}
                      </Typography>
                    </Box>
                  </Stack>
                  <Chip
                    label={t("pedia.soon")}
                    size="small"
                    variant="outlined"
                    sx={{ borderRadius: 0.75 }}
                  />
                </Stack>
              </SurfaceCard>

              {/* Block 5 — base defense (live Σ Crow of guards on watch) */}
              <SurfaceCard minHeight={132}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1.5}
                  sx={{ minWidth: 0 }}
                >
                  <Image
                    src="/defense.png"
                    alt={t("nav.defense")}
                    width={28}
                    height={28}
                    style={{ height: 28, width: "auto" }}
                  />
                  <Box sx={{ minWidth: 0 }}>
                    <Typography
                      variant="overline"
                      color="text.secondary"
                      sx={{ display: "block", lineHeight: 1.2 }}
                    >
                      {t("nav.defense")}
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 800 }}>
                      {defenseValue.toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </SurfaceCard>

              {/* Money actions (top up + transfer, both soon) — last, full width */}
              <SurfaceCard sx={{ gridColumn: { sm: "1 / -1" } }}>
                <Stack spacing={1.25} sx={{ height: "100%" }}>
                  <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="overline" color="text.secondary">
                      {t("bank.actions")}
                    </Typography>
                    <Chip
                      label={t("pedia.soon")}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 0.75 }}
                    />
                  </Stack>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                  >
                    <Button
                      variant="text"
                      color="neutral"
                      size="small"
                      disabled
                      fullWidth
                      sx={{ justifyContent: "flex-start", opacity: 0.6 }}
                    >
                      {t("bank.topup")}
                    </Button>
                    <Button
                      variant="text"
                      color="neutral"
                      size="small"
                      disabled
                      fullWidth
                      sx={{ justifyContent: "flex-start", opacity: 0.6 }}
                    >
                      {t("bank.transfer")}
                    </Button>
                  </Stack>
                </Stack>
              </SurfaceCard>
            </Box>
          </Stack>

          {/* right column — ledger, tabbed by currency + paginated (client island) */}
          <BankHistory txns={txns} />
        </Box>
      </Stack>
    </Container>
  );
}
