import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import NotificationsView from "@/components/NotificationsView";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import {
  getIncomingFriendRequests,
  markNotificationsSeen,
} from "@/db/queries";

// Notifications feed. For now the only event type is an incoming friend request
// (accept → friends + request cleared; decline → request cleared). Filter tabs
// for the other categories are placeholders. Opening this page marks everything
// read (clears the HUD bell badge).
export default async function NotificationsPage() {
  const { t } = await getTranslations();
  const session = await getSession();
  const requests = session ? await getIncomingFriendRequests(session.id) : [];
  if (session) await markNotificationsSeen(session.id);

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("notifications.title")}
        </Typography>
        <NotificationsView requests={requests} />
      </Stack>
    </Container>
  );
}
