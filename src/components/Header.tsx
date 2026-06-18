import Link from "next/link";
import Image from "next/image";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Avatar from "@mui/material/Avatar";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import { getSession } from "@/lib/auth";
import { getTranslations } from "@/i18n/server";
import TelegramLoginButton from "@/components/TelegramLoginButton";

export default async function Header() {
  const user = await getSession();
  const { t } = await getTranslations();
  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <AppBar position="static" color="default" elevation={1}>
      <Toolbar sx={{ gap: 2 }}>
        {/* Logo on the left */}
        <Box
          component={Link}
          href="/"
          sx={{ display: "flex", alignItems: "center" }}
        >
          <Image
            src="/roostr_logo.png"
            alt="Roostr"
            width={101}
            height={44}
            priority
            style={{ height: 44, width: "auto" }}
          />
        </Box>

        {/* Primary nav */}
        <Button component={Link} href="/about" color="inherit" sx={{ ml: 2 }}>
          {t("nav.about")}
        </Button>
        <Button component={Link} href="/debug" color="inherit">
          {t("nav.debug")}
        </Button>

        <Box sx={{ flexGrow: 1 }} />

        {user ? (
          <Box
            component={Link}
            href="/profile"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Typography
              variant="body2"
              sx={{ display: { xs: "none", sm: "block" } }}
            >
              {fullName || `@${user.username ?? user.id}`}
            </Typography>
            <Avatar
              src={user.photoUrl}
              alt={fullName}
              sx={{ width: 36, height: 36 }}
            >
              {fullName.charAt(0) || "?"}
            </Avatar>
          </Box>
        ) : botUsername ? (
          <TelegramLoginButton botUsername={botUsername} />
        ) : null}
      </Toolbar>
    </AppBar>
  );
}
