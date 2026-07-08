"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
} from "@/app/[telegramid]/actions";
import type {
  FriendRequestSummary,
  IncomingGift,
  GiftUpdate,
} from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { BREED_NAME, EmptyNotice, unreadSx, usePager } from "./shared";
import { useNotifActions } from "@/hooks/useNotifActions";
import UserAvatar from "@/components/UserAvatar";

const personName = (
  f: Pick<FriendRequestSummary, "firstName" | "lastName" | "username" | "id">,
) =>
  [f.firstName, f.lastName].filter(Boolean).join(" ") ||
  (f.username ? `@${f.username}` : String(f.id));

// The friends tab: incoming gifts (accept/decline), the resolution of gifts I
// sent, newly-accepted friendships, and pending incoming friend requests.
export default function FriendsTab({
  requests,
  newFriends,
  incomingGifts,
  giftUpdates,
}: {
  requests: FriendRequestSummary[];
  newFriends: FriendRequestSummary[];
  incomingGifts: IncomingGift[];
  giftUpdates: GiftUpdate[];
}) {
  const t = useT();
  const locale = useLocale();
  const { busy, act, markReadAsync, readBtn } = useNotifActions();
  const { paged: pagedRequests, pager } = usePager(requests);

  if (
    newFriends.length === 0 &&
    requests.length === 0 &&
    incomingGifts.length === 0 &&
    giftUpdates.length === 0
  ) {
    return <EmptyNotice />;
  }

  return (
    <Stack spacing={2}>
      {/* Pending gifts addressed to me — view to accept/decline. */}
      {incomingGifts.length > 0 && (
        <List disablePadding>
          {incomingGifts.map((g) => {
            const bird = g.nickname || (BREED_NAME[g.breedId]?.[locale] ?? g.breedId);
            return (
              <ListItem
                key={`gift-${g.id}`}
                divider
                sx={[{ px: 0, gap: 1.5, flexWrap: "wrap" }, unreadSx(g.unread)]}
              >
                <UserAvatar photoUrl={g.fromPhoto} name={g.fromName} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    🎁 {t("notifications.giftFrom", { name: g.fromName, bird })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(g.createdAt).toLocaleDateString(locale)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    component={Link}
                    href={`/gift/${g.roostrId}`}
                    size="small"
                    variant="contained"
                    onClick={() => markReadAsync(`gift:${g.id}`)}
                  >
                    {t("notifications.view")}
                  </Button>
                  {g.unread && readBtn(`gift:${g.id}`)}
                </Stack>
              </ListItem>
            );
          })}
        </List>
      )}

      {/* Resolution of gifts I sent — accepted / declined / expired notices. */}
      {giftUpdates.length > 0 && (
        <List disablePadding>
          {giftUpdates.map((g) => {
            const bird = g.nickname || (BREED_NAME[g.breedId]?.[locale] ?? g.breedId);
            const icon =
              g.status === "accepted" ? "🎉" : g.status === "expired" ? "⌛" : "💔";
            const msgKey =
              g.status === "accepted"
                ? "notifications.giftAccepted"
                : g.status === "expired"
                  ? "notifications.giftExpired"
                  : "notifications.giftDeclined";
            return (
              <ListItem
                key={`giftres-${g.id}`}
                divider
                sx={[{ px: 0, gap: 1.5, flexWrap: "wrap" }, unreadSx(g.unread)]}
              >
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {icon} {t(msgKey, { name: g.toName, bird })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(g.resolvedAt).toLocaleDateString(locale)}
                  </Typography>
                </Box>
                {g.unread && readBtn(`giftres:${g.id}`)}
              </ListItem>
            );
          })}
        </List>
      )}

      {newFriends.length > 0 && (
        <List disablePadding>
          {newFriends.map((f) => {
            const name = personName(f);
            return (
              <ListItem
                key={`nf-${f.id}`}
                divider
                sx={[{ px: 0, gap: 1.5, flexWrap: "wrap" }, unreadSx(f.unread)]}
              >
                <UserAvatar component={Link} href={`/${f.id}`} photoUrl={f.photoUrl} name={name} />
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    🎉 {t("notifications.newFriend", { name })}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(f.createdAt).toLocaleDateString(locale)}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Button
                    component={Link}
                    href={`/${f.id}`}
                    size="small"
                    variant="outlined"
                    onClick={() => markReadAsync(`friend:${f.id}`)}
                  >
                    {t("friends.profile")}
                  </Button>
                  {f.unread && readBtn(`friend:${f.id}`)}
                </Stack>
              </ListItem>
            );
          })}
        </List>
      )}

      {requests.length > 0 && (
        <>
          <List disablePadding>
            {pagedRequests.map((r) => {
              const name = personName(r);
              return (
                <ListItem key={r.id} divider sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}>
                  <UserAvatar component={Link} href={`/${r.id}`} photoUrl={r.photoUrl} name={name} />
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      🤝 {t("notifications.friendRequest", { name })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString(locale)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      onClick={() => act(() => acceptFriendRequestAction(r.id))}
                    >
                      {t("notifications.accept")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="neutral"
                      disabled={busy}
                      onClick={() => act(() => declineFriendRequestAction(r.id))}
                    >
                      {t("notifications.decline")}
                    </Button>
                  </Stack>
                </ListItem>
              );
            })}
          </List>
          {pager}
        </>
      )}
    </Stack>
  );
}
