import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import AppShell, { type NavItem, type ShellUser } from "@/components/AppShell";
import { AdminProvider } from "@/components/AdminProvider";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { getUserById } from "@/db/queries";
import { isAdmin } from "@/lib/admin";
import { headlineFont, bodyFont } from "@/app/fonts";

export const metadata: Metadata = {
  title: "Roostr",
  description: "Telegram-authed collectibles",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { locale, t } = await getTranslations();
  const session = await getSession();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

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

  // Game nav is for logged-in players only; guests see just public links + login.
  const mainNav: NavItem[] = loggedIn
    ? [
        { href: "/incubator", label: t("nav.incubator"), icon: "🥚" },
        { href: "/collection", label: t("nav.collection"), icon: "🐔" },
        { href: "/roostrdex", label: t("nav.roostrdex"), icon: "📕" },
        { href: "/market", label: t("nav.market"), icon: "🛒" },
        { href: "/arena", label: t("nav.arena"), icon: "⚔️" },
        { href: "/farm", label: t("nav.farm"), icon: "🌾" },
        { href: "/lab", label: t("nav.lab"), icon: "🧪" },
        { href: "/friends", label: t("nav.friends"), icon: "👥" },
      ]
    : [];

  const bottomNav: NavItem[] = [
    ...(loggedIn ? [{ href: "/bank", label: t("nav.bank"), icon: "🏦" }] : []),
    { href: "/pedia", label: t("nav.pedia"), icon: "📖" },
    // Debug is admin-only.
    ...(admin
      ? [{ href: "/debug", label: t("nav.debug"), icon: "🐞" }]
      : []),
    { href: "/support", label: t("nav.support"), icon: "🛟" },
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
            <I18nProvider locale={locale}>
              <AdminProvider isAdmin={admin}>
                <AppShell
                  user={user}
                  coinBalance={user ? dbUser?.coins ?? 0 : undefined}
                  eggsBalance={user ? dbUser?.eggs ?? 0 : undefined}
                  sciBalance={user ? dbUser?.sci ?? 0 : undefined}
                  energy={user ? { current: 10, max: 10 } : undefined}
                  feathersLabel={t("resource.feathers")}
                  eggsLabel={t("resource.eggs")}
                  sciLabel={t("resource.sci")}
                  botUsername={botUsername}
                  mainNav={mainNav}
                  bottomNav={bottomNav}
                  loginLabel={t("nav.login")}
                  aboutLabel={t("nav.about")}
                >
                  {children}
                </AppShell>
              </AdminProvider>
            </I18nProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
