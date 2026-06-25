import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import AppShell, { type NavItem, type ShellUser } from "@/components/AppShell";
import { AdminProvider } from "@/components/AdminProvider";
import ToastProvider from "@/components/ToastProvider";
import ReferralCapture from "@/components/ReferralCapture";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  countUnreadNotifications,
  getHudStationStats,
} from "@/db/queries";
import { isAdmin } from "@/lib/admin";
import { headlineFont, bodyFont } from "@/app/fonts";

// Absolute base so relative OG image paths resolve for crawlers (Telegram fetches
// server-side with no JS and needs absolute HTTPS URLs).
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://roostr-two.vercel.app";

// Telegram renders a link-preview card from these OpenGraph tags when our links are
// shared (profile / invite). Requirements: HTTPS, PNG/JPEG, <1MB, ~1200×630, and an
// og:title must be present. Artwork: /public/og.jpg.
export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: "Roostr",
  title: "Roostr",
  description: "Collect, breed & battle Telegram roosters.",
  alternates: {
    // Trailing-slash form so og:url / canonical resolve to one consistent key
    // (`…app/`) — avoids Telegram caching the slash and no-slash variants apart.
    canonical: `${APP_URL}/`,
  },
  openGraph: {
    title: "Roostr — collectible Telegram roosters",
    description: "Collect, breed & battle roosters. Join the flock!",
    url: `${APP_URL}/`,
    siteName: "Roostr",
    type: "website",
    images: [
      {
        url: "/og.jpg",
        width: 1731,
        height: 909,
        alt: "Roostr",
        type: "image/jpeg",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Roostr — collectible Telegram roosters",
    description: "Collect, breed & battle roosters. Join the flock!",
    images: ["/og.jpg"],
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, t } = await getTranslations();
  const session = await getSession();

  const user: ShellUser | null = session
    ? {
        id: session.id,
        name:
          [session.firstName, session.lastName].filter(Boolean).join(" ") ||
          (session.username ? `@${session.username}` : String(session.id)),
        photoUrl: session.photoUrl,
      }
    : null;

  const loggedIn = !!session;
  const admin = isAdmin(session?.id);
  // Live Corn Coin balance from the DB (was hardcoded 0).
  const dbUser = session ? await getUserById(session.id) : null;
  // Unread notifications → HUD bell badge.
  const notificationCount = session
    ? await countUnreadNotifications(session.id)
    : 0;
  // Consolidated HUD station stats: base defense (Σ Crow) + live sci/day (lab) and
  // egg/day (farm) income. Hourly = day/24, rounded; shown only when ≥ 1.
  const hud = session
    ? await getHudStationStats(session.id)
    : { defenseValue: 0, sciPerDay: 0, eggPerDay: 0 };
  const sciPerHour = Math.round(hud.sciPerDay / 24);
  const eggPerDay = Math.round(hud.eggPerDay);

  // Game nav is for logged-in players only; guests do not get the app sidebar.
  const mainNav: NavItem[] = loggedIn
    ? [
        { href: "/incubator", label: t("nav.incubator"), icon: "🥚" },
        { href: "/collection", label: t("nav.collection"), icon: "🐔" },
        { href: "/market", label: t("nav.market"), icon: "🛒" },
        { href: "/shop", label: t("nav.shop"), icon: "🛍️" },
        { href: "/arena", label: t("nav.arena"), icon: "⚔️" },
        { href: "/farm", label: t("nav.farm"), icon: "🌾" },
        { href: "/lab", label: t("nav.lab"), icon: "🧪" },
        { href: "/raids", label: t("nav.raids"), icon: "🗡️" },
        { href: "/defense", label: t("nav.defense"), icon: "🛡️" },
      ]
    : [];

  const bottomNav: NavItem[] = [
    // Bank lives behind the balance HUD (ResourceBar) now — not in the sidebar.
    { href: "/pedia", label: t("nav.pedia"), icon: "📖" },
    // Debug is admin-only.
    ...(admin ? [{ href: "/debug", label: t("nav.debug"), icon: "🐞" }] : []),
    // Support moved to the footer.
    ...(loggedIn
      ? [{ href: "/settings", label: t("nav.settings"), icon: "⚙️" }]
      : []),
  ];

  return (
    <html
      lang={locale}
      className={`${headlineFont.variable} ${bodyFont.variable}`}
    >
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <ReferralCapture />
            <I18nProvider locale={locale}>
              <AdminProvider isAdmin={admin}>
                <ToastProvider>
                  <AppShell
                    user={user}
                    coinBalance={user ? (dbUser?.coins ?? 0) : undefined}
                    eggsBalance={user ? (dbUser?.eggs ?? 0) : undefined}
                    sciBalance={user ? (dbUser?.sci ?? 0) : undefined}
                    defenseBalance={user ? hud.defenseValue : undefined}
                    sciPerHour={user ? sciPerHour : undefined}
                    eggsPerDay={user ? eggPerDay : undefined}
                    perHourLabel={t("resource.perHour")}
                    perDayLabel={t("resource.perDay")}
                    energy={user ? { current: 10, max: 10 } : undefined}
                    feathersLabel={t("resource.feathers")}
                    eggsLabel={t("resource.eggs")}
                    sciLabel={t("resource.sci")}
                    notificationsLabel={user ? t("notifications.title") : undefined}
                    notificationCount={notificationCount}
                    mainNav={mainNav}
                    bottomNav={bottomNav}
                    viewProfileLabel={t("nav.viewProfile")}
                    aboutLabel={t("nav.about")}
                    supportLabel={t("nav.support")}
                  >
                    {children}
                  </AppShell>
                </ToastProvider>
              </AdminProvider>
            </I18nProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
