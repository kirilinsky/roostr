"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { debugDamageRoostrAction } from "@/app/debug/actions";

// DEV ONLY (admin) — hurt this bird (−2 HP, → max−2) so the Hospital has a quick
// patient to heal before combat/raids exist. Not localized on purpose (dev tool).
export default function DevHurtButton({ roostrId }: { roostrId: string }) {
  const router = useRouter();
  const [busy, start] = useTransition();
  return (
    <Button
      variant="text"
      color="error"
      size="small"
      disabled={busy}
      onClick={() =>
        start(async () => {
          const res = await debugDamageRoostrAction(roostrId);
          if (res.ok) router.refresh();
        })
      }
      sx={{ alignSelf: "flex-start", opacity: 0.7 }}
    >
      🩹 dev: hurt (−2 HP)
    </Button>
  );
}
