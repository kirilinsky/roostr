"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import { giftRoostrAction } from "@/app/collection/[id]/actions";
import { useT } from "@/i18n/I18nProvider";
import { userPhoto } from "@/lib/tokens";

export interface GiftFriend {
  id: number;
  username: string | null;
  firstName: string | null;
  lastName: string | null;
  photoUrl: string | null;
}

const friendName = (f: GiftFriend) =>
  [f.firstName, f.lastName].filter(Boolean).join(" ") ||
  (f.username ? `@${f.username}` : String(f.id));

// "Gift" owner action: opens a friend picker, then sends the bird as a pending
// gift (recipient accepts/declines). One pending gift at a time — the server CAS
// locks the bird, so a successful send navigates away from the manage controls.
export default function GiftRoostrButton({
  roostrId,
  friends,
}: {
  roostrId: string;
  friends: GiftFriend[];
}) {
  const t = useT();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<GiftFriend | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPicked(null);
    setError(null);
  };

  const send = (friend: GiftFriend) => {
    setError(null);
    startTransition(async () => {
      const res = await giftRoostrAction(roostrId, friend.id);
      if (res.ok) {
        setOpen(false);
        setPicked(null);
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  };

  return (
    <>
      <Button variant="outlined" color="neutral" onClick={() => setOpen(true)}>
        🎁 {t("detail.gift")}
      </Button>

      <Popup
        open={open}
        onClose={close}
        title={t("gift.pickFriend")}
        maxWidth="xs"
      >
        {friends.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t("gift.noFriends")}
          </Typography>
        ) : picked ? (
          // Confirm step — avoids a mis-tap giving the bird away.
          <Stack spacing={2} sx={{ py: 1 }}>
            <Stack direction="row" spacing={1.5} alignItems="center">
              <Avatar src={userPhoto(picked.photoUrl)} alt={friendName(picked)}>
                {friendName(picked).charAt(0)}
              </Avatar>
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {t("gift.confirm", { name: friendName(picked) })}
              </Typography>
            </Stack>
            {error && (
              <Typography variant="caption" color="error">
                {t("gift.error")}
              </Typography>
            )}
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Button color="neutral" onClick={() => setPicked(null)} disabled={busy}>
                {t("detail.cancel")}
              </Button>
              <Button
                variant="contained"
                onClick={() => send(picked)}
                disabled={busy}
              >
                🎁 {t("gift.send")}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack spacing={0.5} sx={{ py: 1 }}>
            {friends.map((f) => (
              <Box
                key={f.id}
                component="button"
                type="button"
                onClick={() => setPicked(f)}
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  p: 1,
                  width: "100%",
                  textAlign: "left",
                  cursor: "pointer",
                  bgcolor: "transparent",
                  border: 0,
                  borderRadius: 0,
                  font: "inherit",
                  color: "inherit",
                  "&:hover": { bgcolor: "action.hover" },
                }}
              >
                <Avatar src={userPhoto(f.photoUrl)} alt={friendName(f)}>
                  {friendName(f).charAt(0)}
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                  {friendName(f)}
                </Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Chip label="🎁" size="small" variant="outlined" />
              </Box>
            ))}
          </Stack>
        )}
      </Popup>
    </>
  );
}
