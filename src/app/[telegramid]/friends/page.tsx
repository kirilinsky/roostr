import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UserAvatar from "@/components/UserAvatar";
import FriendButton from "@/components/FriendButton";
import ShareProfileButton from "@/components/ShareProfileButton";
import CollectionCard from "@/components/CollectionCard";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { getFriends, getRoostrsForOwners } from "@/db/queries";
import { hydrateRoostr, type HydratedRoostr } from "@/lib/roostr";

// Full friends list for a user (by Telegram id) — the "all friends" target from
// the profile's friends block. Each friend row previews their roosters inline
// (public collections only; private ones show a lock note). Mirrors the
// /[id]/achievements pattern. On your own list, shows the share-profile button.
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

  // Batch-fetch every PUBLIC friend's roosters in one query, then group by owner
  // so each row can show that friend's collection inline. Private friends are
  // skipped (their birds are never fetched).
  const publicIds = friends.filter((f) => f.collectionPublic).map((f) => f.id);
  const allRoostrs = await getRoostrsForOwners(publicIds);
  const byOwner = new Map<number, HydratedRoostr[]>();
  for (const row of allRoostrs) {
    const list = byOwner.get(row.ownerId) ?? [];
    list.push(hydrateRoostr(row));
    byOwner.set(row.ownerId, list);
  }

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
              const birds = byOwner.get(f.id) ?? [];
              return (
                <ListItem
                  key={f.id}
                  divider
                  sx={{ px: 0, py: 2, gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}
                >
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    sx={{ width: "100%" }}
                  >
                    <UserAvatar photoUrl={f.photoUrl} name={name} />
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
                  </Stack>

                  {/* This friend's roosters — public collections only. */}
                  {!f.collectionPublic ? (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 6.5 }}>
                      🔒 {t("publicProfile.private")}
                    </Typography>
                  ) : birds.length === 0 ? (
                    <Typography variant="caption" color="text.secondary" sx={{ pl: 6.5 }}>
                      {t("friends.noRoostrs")}
                    </Typography>
                  ) : (
                    <Box sx={{ width: "100%", pl: { xs: 0, sm: 6.5 } }}>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ display: "block", mb: 0.75 }}
                      >
                        🐔 {t("friends.roostrCount", { count: birds.length })}
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gap: 1,
                          gridTemplateColumns: {
                            xs: "repeat(3, minmax(0, 1fr))",
                            sm: "repeat(5, minmax(0, 1fr))",
                            md: "repeat(6, minmax(0, 1fr))",
                          },
                        }}
                      >
                        {birds.map((r) => (
                          <CollectionCard
                            key={r.id ?? r.seed}
                            roostr={r}
                            href={`/collection/${r.id}`}
                            compact
                          />
                        ))}
                      </Box>
                    </Box>
                  )}
                </ListItem>
              );
            })}
          </List>
        )}
      </Stack>
    </Container>
  );
}
