import { redirect } from "next/navigation";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getSession } from "@/lib/auth";
import TelegramLoginButton from "@/components/TelegramLoginButton";

export default async function HomePage() {
  const session = await getSession();
  if (session) redirect("/profile");

  const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "";

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3} alignItems="center">
            <Typography variant="h4" component="h1">
              Roostr
            </Typography>
            <Typography variant="body1" color="text.secondary" align="center">
              Sign in with your Telegram account to continue.
            </Typography>
            {botUsername ? (
              <TelegramLoginButton botUsername={botUsername} />
            ) : (
              <Typography variant="body2" color="error" align="center">
                Set NEXT_PUBLIC_TELEGRAM_BOT_USERNAME in your .env to show the
                login button.
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
