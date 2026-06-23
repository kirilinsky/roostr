"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import {
  addFriendAction,
  removeFriendAction,
  cancelFriendRequestAction,
} from "@/app/[telegramid]/actions";

export default function FriendButton({
  targetId,
  isFriend,
  requestSent = false,
  addLabel,
  removeLabel,
  cancelLabel,
  size = "medium",
}: {
  targetId: number;
  isFriend: boolean;
  requestSent?: boolean; // viewer already sent a pending request to target
  addLabel: string;
  removeLabel: string;
  cancelLabel?: string; // shown while a request is pending → cancels it
  size?: "small" | "medium" | "large";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      if (isFriend) await removeFriendAction(targetId);
      else if (requestSent) await cancelFriendRequestAction(targetId);
      else await addFriendAction(targetId); // sends a request (not instant)
      router.refresh(); // reflect the change wherever the button lives
    });
  }

  // States: friend → remove · request pending → cancel · else → add (request).
  const label = isFriend
    ? removeLabel
    : requestSent
      ? (cancelLabel ?? addLabel)
      : addLabel;

  return (
    <Button
      variant={isFriend || requestSent ? "outlined" : "contained"}
      color={isFriend || requestSent ? "neutral" : "primary"}
      size={size}
      disabled={pending}
      onClick={toggle}
    >
      {label}
    </Button>
  );
}
