"use client";

import { useEffect, useState, type ElementType } from "react";
import Avatar, { type AvatarProps } from "@mui/material/Avatar";
import { userPhoto, ANON_AVATAR } from "@/lib/tokens";

// Every user avatar goes through here. Telegram userpic URLs we store
// (t.me/i/userpic/320/<hash>.jpg) go STALE — when a user changes or hides their
// photo the old hash returns a 42-byte 1×1 blank GIF (HTTP 404 body). The browser
// DECODES that as a valid 1×1 image, so neither MUI's load check nor an <img>
// onError fires — the avatar just shows a blank dot. So we probe the url ourselves
// with a throwaway Image(): if it errors OR decodes to ≤1px, we fall back to the
// house anon.png. Null photo urls already resolve to anon.png via userPhoto().
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
  const resolved = userPhoto(photoUrl);
  const [src, setSrc] = useState(resolved);

  useEffect(() => {
    // Nothing to probe for the house image itself.
    if (resolved === ANON_AVATAR) {
      setSrc(ANON_AVATAR);
      return;
    }
    let alive = true;
    setSrc(resolved); // optimistic: show the real photo while we verify it
    const probe = new Image();
    probe.onload = () => {
      if (!alive) return;
      // ≤1px decode = Telegram's stale-userpic blank gif → use the fallback.
      setSrc(probe.naturalWidth <= 1 || probe.naturalHeight <= 1 ? ANON_AVATAR : resolved);
    };
    probe.onerror = () => alive && setSrc(ANON_AVATAR);
    probe.referrerPolicy = "no-referrer";
    probe.src = resolved;
    return () => {
      alive = false;
    };
  }, [resolved]);

  return (
    <Avatar src={src} alt={name} slotProps={{ img: { referrerPolicy: "no-referrer" } }} {...props}>
      {name?.charAt(0) || "?"}
    </Avatar>
  );
}
