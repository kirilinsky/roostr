import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "@/theme";
import AppShell, { type NavItem, type ShellUser } from "@/components/AppShell";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
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
        name:
          [session.firstName, session.lastName].filter(Boolean).join(" ") ||
          (session.username ? `@${session.username}` : String(session.id)),
        photoUrl: session.photoUrl,
      }
    : null;

  const mainNav: NavItem[] = [
    { href: "/collection", label: t("nav.collection"), icon: "🐔" },
    { href: "/market", label: t("nav.market"), icon: "🛒" },
    { href: "/arena", label: t("nav.arena"), icon: "⚔️" },
    { href: "/friends", label: t("nav.friends"), icon: "👥" },
  ];

  const bottomNav: NavItem[] = [
    { href: "/bank", label: t("nav.bank"), icon: "🏦" },
    { href: "/about", label: t("nav.about"), icon: "ℹ️" },
    { href: "/debug", label: t("nav.debug"), icon: "🐞" },
    { href: "/support", label: t("nav.support"), icon: "🛟" },
    { href: "/settings", label: t("nav.settings"), icon: "⚙️" },
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
              <AppShell
                user={user}
                coinBalance={user ? 0 : undefined}
                energy={user ? { current: 10, max: 10 } : undefined}
                feathersLabel={t("resource.feathers")}
                botUsername={botUsername}
                mainNav={mainNav}
                bottomNav={bottomNav}
                loginLabel={t("nav.login")}
              >
                {children}
              </AppShell>
            </I18nProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
