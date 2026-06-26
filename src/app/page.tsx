import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import TelegramLoginButton from "@/components/TelegramLoginButton";
import ReferralBanner from "@/components/ReferralBanner";
import { getSession } from "@/lib/auth";
import { getGlobalStats } from "@/db/queries";
import { parseReferralId } from "@/lib/referrals";
import { getTranslations } from "@/i18n/server";

// One stat in the guest promo grid. Resource amounts use HUD art (V20); the rest
// use an emoji.
function PromoStat({
  img,
  icon,
  value,
  label,
}: {
  img?: string;
  icon?: string;
  value: string;
  label: string;
}) {
  return (
    <Card sx={{ p: { xs: 1.5, md: 2 }, textAlign: "center", height: "100%" }}>
      <Box
        sx={{
          height: 30,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {img ? (
          <Image
            src={img}
            alt=""
            width={30}
            height={30}
            style={{ height: 28, width: "auto" }}
          />
        ) : (
          <Typography component="span" sx={{ fontSize: 26, lineHeight: 1 }}>
            {icon}
          </Typography>
        )}
      </Box>
      <Typography
        sx={{
          fontWeight: 900,
          fontSize: { xs: "1.4rem", md: "1.75rem" },
          fontVariantNumeric: "tabular-nums",
          mt: 0.5,
          lineHeight: 1.1,
        }}
        noWrap
      >
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary" component="div">
        {label}
      </Typography>
    </Card>
  );
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await getSession();
  const { t } = await getTranslations();

  // Signed-in: keep the simple welcome + go-to-profile.
  if (user) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          <Typography variant="h4" component="h1">
            Roostr
          </Typography>
          <Typography color="text.secondary">
            {t("home.signedInAs", {
              name: fullName || `@${user.username ?? user.id}`,
            })}
          </Typography>
          <Button component={Link} href={`/${user.id}`} variant="contained">
            {t("home.profile")}
          </Button>
        </Stack>
      </Container>
    );
  }

  // Guest: promo landing with live, project-wide numbers + a join CTA.
  const g = await getGlobalStats();
  const telegramLoginConfigured =
    !!(
      process.env.TELEGRAM_CLIENT_ID ?? process.env.NEXT_PUBLIC_TELEGRAM_CLIENT_ID
    ) && !!process.env.TELEGRAM_CLIENT_SECRET;

  // Arrived via an invite link (?ref=…) → lead with the welcome-gift pitch, same as
  // a referred visitor landing on a profile page.
  const sp = await searchParams;
  const refId = parseReferralId(Array.isArray(sp.ref) ? sp.ref[0] : sp.ref);
  const banner =
    refId !== null ? (
      <Box sx={{ width: "100%", maxWidth: 520 }}>
        <ReferralBanner
          configured={telegramLoginConfigured}
          title={t("referral.bonusTitle")}
          text={t("referral.bonusCta")}
        />
      </Box>
    ) : null;

  const stats = [
    { key: "players", icon: "👥", value: g.players, label: t("home.statPlayers") },
    { key: "hatched", icon: "🐔", value: g.roostrsHatched, label: t("home.statHatched") },
    { key: "gold", img: "/corn-coin.png", value: g.coinsEarned, label: t("home.statGold") },
    { key: "science", img: "/sci.png", value: g.sciEarned, label: t("home.statScience") },
    { key: "battles", icon: "⚔️", value: g.battles, label: t("home.statBattles") },
    // Hide a still-empty metric (e.g. battles before the system ships); always keep
    // Players as the anchor number.
  ].filter((s) => s.value > 0 || s.key === "players");

  // No data yet (empty DB / no connection) → minimal guest line, no zeros.
  if (g.players === 0) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={2} alignItems="center" textAlign="center">
          {banner}
          <Typography variant="h4" component="h1">
            🐓 Roostr
          </Typography>
          <Typography color="text.secondary">{t("home.tagline")}</Typography>
          <TelegramLoginButton configured={telegramLoginConfigured} />
        </Stack>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={5} alignItems="center" textAlign="center">
        {banner}
        <Stack spacing={1.5} alignItems="center">
          <Typography
            variant="h2"
            component="h1"
            sx={{ fontWeight: 900, letterSpacing: "0.01em" }}
          >
            🐓 Roostr
          </Typography>
          <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 520 }}>
            {t("home.tagline")}
          </Typography>
        </Stack>

        <Box
          sx={{
            width: "100%",
            display: "grid",
            gap: { xs: 1.5, md: 2 },
            gridTemplateColumns: {
              xs: "repeat(2, minmax(0, 1fr))",
              sm: "repeat(3, minmax(0, 1fr))",
              md: `repeat(${stats.length}, minmax(0, 1fr))`,
            },
          }}
        >
          {stats.map((s) => (
            <PromoStat
              key={s.key}
              img={s.img}
              icon={s.icon}
              value={s.value.toLocaleString()}
              label={s.label}
            />
          ))}
        </Box>

        <Card
          sx={{
            p: 3,
            width: "100%",
            maxWidth: 460,
            borderColor: "secondary.main",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <Stack spacing={2} alignItems="center">
            <Typography variant="h5">🚀 {t("home.joinTitle")}</Typography>
            <Typography color="text.secondary">
              {t("home.joinHook", { n: g.players.toLocaleString() })}
            </Typography>
            <TelegramLoginButton configured={telegramLoginConfigured} />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
