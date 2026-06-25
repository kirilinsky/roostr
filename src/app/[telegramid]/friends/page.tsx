import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FriendButton from "@/components/FriendButton";
import ShareProfileButton from "@/components/ShareProfileButton";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { getFriends } from "@/db/queries";

// Full friends list for a user (by Telegram id) — the "all friends" target from
// the profile's friends block. Mirrors the /[id]/achievements pattern. On your own
// list, shows the share-profile (invite) button that used to live on /friends.
export default async function ProfileFriendsPage({
  params,
}: {
  params: Promise<{ telegramid: string }>;
}) {
  const { telegramid } = await params;
  const { locale, t } = await getTranslations();
  const id = Number(telegramid);
  const friends = Number.isFinite(id) ? await getFriends(id) : [];
  const session = await getSession();
  const isOwn = session?.id === id;

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href={`/${telegramid}`}
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("achievements.back")}
        </Button>

        <Typography variant="h4" component="h1">
          {t("nav.friends")}
        </Typography>

        {isOwn && (
          <ShareProfileButton
            telegramId={id}
            label={t("referral.copyLink")}
            copiedLabel={t("friends.copied")}
          />
        )}

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
                <ListItem
                  key={f.id}
                  divider
                  sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}
                >
                  <Avatar src={f.photoUrl ?? undefined} alt={name}>
                    {name.charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t("friends.since", {
                        date: new Date(f.since).toLocaleDateString(locale),
                      })}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      component={Link}
                      href={`/${f.id}`}
                      size="small"
                      variant="outlined"
                    >
                      {t("friends.profile")}
                    </Button>
                    {isOwn && (
                      <FriendButton
                        targetId={f.id}
                        isFriend
                        size="small"
                        addLabel={t("friends.add")}
                        removeLabel={t("friends.remove")}
                      />
                    )}
                  </Stack>
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>
    </Container>
  );
}
