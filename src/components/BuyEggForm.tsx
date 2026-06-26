"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { buyEggAction } from "@/app/shop/eggs/actions";
import { useT } from "@/i18n/I18nProvider";

// Buy-one-egg button. Price + affordability come from the server page; on success
// we router.refresh() so the ramped price AND the HUD balances update live (§V20).
export default function BuyEggForm({
  price,
  coins,
}: {
  price: number;
  coins: number;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const canAfford = coins >= price;

  const buy = () =>
    startTransition(async () => {
      setError(null);
      const res = await buyEggAction();
      if (res.ok) router.refresh();
      else setError(res.reason === "coins" ? "coins" : "error");
    });

  return (
    <Stack spacing={1}>
      <Button
        variant="contained"
        size="large"
        onClick={buy}
        disabled={busy || !canAfford}
        sx={{ alignSelf: "flex-start" }}
      >
        <Stack direction="row" spacing={0.75} alignItems="center">
          <span>{t("shop.eggs.buy")} · {price.toLocaleString()}</span>
          <Image
            src="/corn-coin.png"
            alt=""
            width={18}
            height={17}
            style={{ height: 15, width: "auto" }}
          />
        </Stack>
      </Button>
      {!canAfford && (
        <Typography variant="caption" color="error">
          {t("shop.eggs.notEnough")}
        </Typography>
      )}
      {error === "error" && (
        <Typography variant="caption" color="error">
          {t("shop.eggs.error")}
        </Typography>
      )}
    </Stack>
  );
}
