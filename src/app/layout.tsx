import type { Metadata } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Box from "@mui/material/Box";
import theme from "@/theme";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { I18nProvider } from "@/i18n/I18nProvider";
import { getLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Roostr",
  description: "Telegram-authed collectibles",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body>
        <AppRouterCacheProvider>
          <ThemeProvider theme={theme}>
            <CssBaseline />
            <I18nProvider locale={locale}>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  minHeight: "100dvh",
                }}
              >
                <Header />
                <Box component="main" sx={{ flexGrow: 1 }}>
                  {children}
                </Box>
                <Footer />
              </Box>
            </I18nProvider>
          </ThemeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
