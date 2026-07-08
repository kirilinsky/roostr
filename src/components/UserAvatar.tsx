"use client";

import { useState, type ElementType } from "react";
import Avatar, { type AvatarProps } from "@mui/material/Avatar";
import { userPhoto, ANON_AVATAR } from "@/lib/tokens";

// Every user avatar goes through here. Telegram userpic URLs we store
// (t.me/i/userpic/320/<hash>.jpg) go STALE — when a user changes or hides their
// photo the old hash returns a 42-byte 1×1 blank GIF (HTTP 404 body). The browser
// DECODES that as a valid 1×1 image, so `onError` never fires — a raw <img> just
// shows a blank dot. So we fall back on TWO signals: the `error` event AND an
// `onLoad` where the decoded image is ≤1px (the blank-gif tell). Either swaps to
// the house anon.png. Null photo urls already resolve to anon.png via userPhoto().
// Keep the initial as the last-resort child (shown only if anon.png itself fails).
export default function UserAvatar({
  photoUrl,
  name,
  ...props
}: {
  photoUrl?: string | null;
  name?: string;
  // Polymorphic passthrough (e.g. component={Link} href="…" to make the avatar a
  // profile link). Kept loose so call sites can hand MUI the element + its props.
  component?: ElementType;
  href?: string;
} & Omit<AvatarProps, "src">) {
  const [broken, setBroken] = useState(false);
  const src = broken ? ANON_AVATAR : userPhoto(photoUrl);
  return (
    <Avatar
      src={src}
      alt={name}
      slotProps={{
        img: {
          referrerPolicy: "no-referrer",
          onError: () => setBroken(true),
          // Telegram's stale-userpic response is a 1×1 blank gif that loads
          // "successfully" — treat a ≤1px decode as broken too.
          onLoad: (e: React.SyntheticEvent<HTMLImageElement>) => {
            const img = e.currentTarget;
            if (img.naturalWidth <= 1 || img.naturalHeight <= 1) setBroken(true);
          },
        },
      }}
      {...props}
    >
      {name?.charAt(0) || "?"}
    </Avatar>
  );
}
