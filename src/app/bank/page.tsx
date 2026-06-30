import Image from "next/image";
import Link from "next/link";
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
import LinearProgress from "@mui/material/LinearProgress";
import BankHistory from "@/components/BankHistory";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { featherState, DEFAULT_FEATHER_MAX } from "@/lib/feathers";
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

// Uniform balance/stat tile. `value` optional (rarities has none); `soonLabel`
// renders a small "soon" footnote for not-yet-shipped resources. `progress`
// (0..1) renders a fill bar under the value (feathers → regen toward max), with an
// optional `caption` footnote (e.g. the regen countdown).
function BalanceTile({
  icon,
  label,
  value,
  soonLabel,
  progress,
  caption,
}: {
  icon?: string;
  label: string;
  value?: number | string;
  soonLabel?: string;
  progress?: number;
  caption?: string;
}) {
  return (
    <SurfaceCard minHeight={132}>
      <Stack spacing={1} sx={{ height: "100%" }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          spacing={1}
        >
          {icon ? (
            <Image
              src={icon}
              alt={label}
              width={34}
              height={34}
              style={{ height: 34, width: "auto" }}
            />
          ) : (
            <Box />
          )}
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
        {value !== undefined && (
          <Typography
            variant="h4"
            sx={{
              fontWeight: 900,
              lineHeight: 1,
              fontSize: { xs: "1.35rem", sm: "1.75rem", md: "2rem" },
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </Typography>
        )}
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={Math.max(0, Math.min(100, progress * 100))}
            sx={{ height: 6, borderRadius: 0, mt: 0.25 }}
          />
        )}
        {caption && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.65rem", lineHeight: 1 }}
          >
            {caption}
          </Typography>
        )}
        {soonLabel && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontSize: "0.65rem", opacity: 0.7, lineHeight: 1 }}
          >
            {soonLabel}
          </Typography>
        )}
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
  // Feathers: regenerated current vs max + countdown to the next one (1/hour).
  const feathers = featherState(
    dbUser?.feathers ?? 0,
    dbUser?.featherMax ?? DEFAULT_FEATHER_MAX,
    dbUser ? new Date(dbUser.feathersAt).getTime() : Date.now(),
    Date.now(),
  );
  const featherNextMin = Math.max(1, Math.ceil(feathers.nextInMs / 60000));

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
                // Same 3-up grid as the wallet tiles above → identical tile size.
                gridTemplateColumns: {
                  xs: "repeat(3, minmax(0, 1fr))",
                  sm: "repeat(3, minmax(0, 1fr))",
                },
                gap: 1.25,
              }}
            >
              {/* Rarities (soon) — collectible tokens, not shipped yet. Links to
                  the placeholder rarities page. */}
              <Box
                component={Link}
                href="/rarities"
                sx={{
                  display: "block",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <BalanceTile
                  icon="/rarity.png"
                  label={t("bank.rarities")}
                  soonLabel={t("pedia.soon")}
                />
              </Box>
              {/* Feathers (battle energy) — current/max + regen progress (1/hour). */}
              <BalanceTile
                icon="/feather.png"
                label={t("resource.feathers")}
                value={`${feathers.current}/${feathers.max}`}
                progress={
                  feathers.max > 0 ? feathers.current / feathers.max : 0
                }
                caption={
                  feathers.full
                    ? t("bank.feathersFull")
                    : t("bank.feathersRegen", { min: featherNextMin })
                }
              />
              {/* Base defense — live Σ Crow of guards on watch. */}
              <BalanceTile
                icon="/defense.png"
                label={t("nav.defense")}
                value={defenseValue}
              />

              {/* Money actions (top up + transfer, both soon) — last, full width */}
              <SurfaceCard sx={{ gridColumn: "1 / -1" }}>
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
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
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
