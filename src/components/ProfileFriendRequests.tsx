"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useT } from "@/i18n/I18nProvider";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
  cancelFriendRequestAction,
} from "@/app/[telegramid]/actions";
import type { FriendRequestSummary } from "@/db/queries";
import { userPhoto } from "@/lib/tokens";

function name(u: FriendRequestSummary) {
  return (
    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
    (u.username ? `@${u.username}` : String(u.id))
  );
}

// Own-profile block: incoming friend requests (accept / decline) + outgoing
// requests you've sent (cancel). Rendered only when there's at least one.
export default function ProfileFriendRequests({
  incoming,
  outgoing,
}: {
  incoming: FriendRequestSummary[];
  outgoing: FriendRequestSummary[];
}) {
  const t = useT();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const act = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn();
      router.refresh();
    });

  const Row = ({
    u,
    children,
  }: {
    u: FriendRequestSummary;
    children: React.ReactNode;
  }) => (
    <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
      <Avatar
        component={Link}
        href={`/${u.id}`}
        src={userPhoto(u.photoUrl)}
        alt={name(u)}
        sx={{ width: 32, height: 32 }}
      >
        {name(u).charAt(0)}
      </Avatar>
      <Typography variant="body2" sx={{ flex: 1, minWidth: 0 }} noWrap>
        {name(u)}
      </Typography>
      <Stack direction="row" spacing={1}>
        {children}
      </Stack>
    </Stack>
  );

  return (
    <Stack spacing={1.5}>
      {incoming.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {t("profile.incomingRequests")}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {incoming.map((u) => (
              <Row key={u.id} u={u}>
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy}
                  onClick={() => act(() => acceptFriendRequestAction(u.id))}
                >
                  {t("notifications.accept")}
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="neutral"
                  disabled={busy}
                  onClick={() => act(() => declineFriendRequestAction(u.id))}
                >
                  {t("notifications.decline")}
                </Button>
              </Row>
            ))}
          </Stack>
        </Box>
      )}

      {outgoing.length > 0 && (
        <Box>
          <Typography variant="caption" color="text.secondary">
            {t("profile.outgoingRequests")}
          </Typography>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {outgoing.map((u) => (
              <Row key={u.id} u={u}>
                <Button
                  size="small"
                  variant="outlined"
                  color="neutral"
                  disabled={busy}
                  onClick={() => act(() => cancelFriendRequestAction(u.id))}
                >
                  {t("friends.cancelRequest")}
                </Button>
              </Row>
            ))}
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
