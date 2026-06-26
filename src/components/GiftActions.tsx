"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { acceptGiftAction, declineGiftAction } from "@/app/gift/[id]/actions";
import { useT } from "@/i18n/I18nProvider";

// Accept / decline controls on the /gift/[id] page. Accept → bird becomes mine
// (go to its collection page). Decline → it returns to the sender (back to feed).
export default function GiftActions({ roostrId }: { roostrId: string }) {
  const t = useT();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const accept = () =>
    startTransition(async () => {
      setError(false);
      const res = await acceptGiftAction(roostrId);
      if (res.ok) router.push(`/collection/${roostrId}`);
      else setError(true);
    });

  const decline = () =>
    startTransition(async () => {
      setError(false);
      const res = await declineGiftAction(roostrId);
      if (res.ok) router.push("/notifications");
      else setError(true);
    });

  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          🎁 {t("gift.decide")}
        </Typography>
        {error && (
          <Typography variant="caption" color="error">
            {t("gift.error")}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="contained" onClick={accept} disabled={busy}>
            ✓ {t("gift.accept")}
          </Button>
          <Button
            variant="outlined"
            color="neutral"
            onClick={decline}
            disabled={busy}
          >
            ✕ {t("gift.decline")}
          </Button>
        </Stack>
      </Stack>
    </Card>
  );
}
