"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { acceptGiftAction, declineGiftAction } from "@/app/gift/[id]/actions";
import { useAchievementToasts } from "@/hooks/useAchievementToasts";
import { useT } from "@/i18n/I18nProvider";

// Accept / decline controls on the /gift/[id] page. Accept costs a flat coin tax
// (anti-bot) → bird becomes mine. Decline → it returns to the sender (back to feed).
export default function GiftActions({
  roostrId,
  tax,
  coins,
}: {
  roostrId: string;
  tax: number;
  coins: number;
}) {
  const t = useT();
  const router = useRouter();
  const toastAchievements = useAchievementToasts();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canAfford = coins >= tax;

  const accept = () =>
    startTransition(async () => {
      setError(null);
      const res = await acceptGiftAction(roostrId);
      if (res.ok) {
        toastAchievements(res.unlocked ?? []);
        router.push(`/collection/${roostrId}`);
      } else setError(res.reason === "coins" ? "coins" : "error");
    });

  const decline = () =>
    startTransition(async () => {
      setError(null);
      const res = await declineGiftAction(roostrId);
      if (res.ok) router.push("/notifications");
      else setError("error");
    });

  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack spacing={1.5}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          🎁 {t("gift.decide")}
        </Typography>
        {/* Anti-bot tax notice — accepting costs `tax` corn coins. */}
        <Typography variant="caption" color="text.secondary">
          {t("gift.taxNote", { tax })}
        </Typography>
        {error && (
          <Typography variant="caption" color="error">
            {error === "coins"
              ? t("gift.notEnoughCoins", { tax })
              : t("gift.error")}
          </Typography>
        )}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button
            variant="contained"
            onClick={accept}
            disabled={busy || !canAfford}
          >
            ✓ {t("gift.accept")} · {tax} 🌽
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
        {!canAfford && (
          <Typography variant="caption" color="error">
            {t("gift.notEnoughCoins", { tax })}
          </Typography>
        )}
      </Stack>
    </Card>
  );
}
