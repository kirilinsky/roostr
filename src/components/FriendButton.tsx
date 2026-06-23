"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
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
  size = "medium",
}: {
  targetId: number;
  isFriend: boolean;
  addLabel: string;
  removeLabel: string;
  size?: "small" | "medium" | "large";
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function toggle() {
    startTransition(async () => {
      if (isFriend) await removeFriendAction(targetId);
      else await addFriendAction(targetId);
      router.refresh(); // reflect the change wherever the button lives (friends list, profile)
    });
  }

  return (
    <Button
      variant={isFriend ? "outlined" : "contained"}
      color={isFriend ? "neutral" : "primary"}
      size={size}
      disabled={pending}
      onClick={toggle}
    >
      {isFriend ? removeLabel : addLabel}
    </Button>
  );
}
