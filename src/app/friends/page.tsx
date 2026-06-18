import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ShareProfileButton from "@/components/ShareProfileButton";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";

export default async function FriendsPage() {
  const { t } = await getTranslations();
  const session = await getSession();

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("nav.friends")}
        </Typography>
        <Typography color="text.secondary">{t("friends.intro")}</Typography>

        {session ? (
          <ShareProfileButton
            telegramId={session.id}
            label={t("friends.share")}
            copiedLabel={t("friends.copied")}
          />
        ) : (
          <Typography variant="body2" color="text.secondary">
            {t("friends.loginToShare")}
          </Typography>
        )}
      </Stack>
    </Container>
  );
}
