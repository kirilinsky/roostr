"use client";

import { useTransition } from "react";
import Button from "@mui/material/Button";
import {
  addFriendAction,
  removeFriendAction,
} from "@/app/[telegramid]/actions";

export default function FriendButton({
  targetId,
  isFriend,
  addLabel,
  removeLabel,
}: {
  targetId: number;
  isFriend: boolean;
  addLabel: string;
  removeLabel: string;
}) {
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      if (isFriend) await removeFriendAction(targetId);
      else await addFriendAction(targetId);
    });
  }

  return (
    <Button
      variant={isFriend ? "outlined" : "contained"}
      color={isFriend ? "neutral" : "primary"}
      disabled={pending}
      onClick={toggle}
    >
      {isFriend ? removeLabel : addLabel}
    </Button>
  );
}
