import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemAvatar from "@mui/material/ListItemAvatar";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ShareProfileButton from "@/components/ShareProfileButton";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { getFriends } from "@/db/queries";

export default async function FriendsPage() {
  const { locale, t } = await getTranslations();
  const session = await getSession();
  const friends = session ? await getFriends(session.id) : [];

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

        {session && (
          <>
            <Divider />
            <Typography variant="overline" color="text.secondary">
              {t("friends.listTitle", { count: friends.length })}
            </Typography>

            {friends.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("friends.empty")}
              </Typography>
            ) : (
              <List disablePadding>
                {friends.map((f) => {
                  const name =
                    [f.firstName, f.lastName].filter(Boolean).join(" ") ||
                    (f.username ? `@${f.username}` : String(f.id));
                  return (
                    <ListItem key={f.id} disablePadding>
                      <ListItemButton component={Link} href={`/${f.id}`}>
                        <ListItemAvatar>
                          <Avatar src={f.photoUrl ?? undefined} alt={name}>
                            {name.charAt(0)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={name}
                          secondary={t("friends.since", {
                            date: new Date(f.since).toLocaleDateString(locale),
                          })}
                        />
                      </ListItemButton>
                    </ListItem>
                  );
                })}
              </List>
            )}
          </>
        )}
      </Stack>
    </Container>
  );
}
