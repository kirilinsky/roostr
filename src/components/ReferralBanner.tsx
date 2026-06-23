import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import TelegramLoginButton from "@/components/TelegramLoginButton";

// Shown to a logged-out visitor who arrived via a referral link (?ref=…): the
// invite reward pitch + the same Telegram login button as the sidebar. The reward
// itself is granted server-side on signup (upsertUser, kind "referral").
export default function ReferralBanner({
  configured,
  title,
  text,
}: {
  configured: boolean;
  title: string;
  text: string;
}) {
  return (
    <Card sx={{ mb: 3, borderColor: "secondary.main", borderWidth: 1, borderStyle: "solid" }}>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="h6">🎁 {title}</Typography>
          <Typography color="text.secondary">{text}</Typography>
          <TelegramLoginButton configured={configured} />
        </Stack>
      </CardContent>
    </Card>
  );
}
