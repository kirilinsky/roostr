"use client";

import { useState, useTransition } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { grantSelfCoinsAction } from "@/app/debug/actions";

// DEV faucet UI (admin-only page). Grants coins to the admin to test the economy.
export default function DebugCoinGrant() {
  const [coins, setCoins] = useState<number | null>(null);
  const [pending, startTransition] = useTransition();

  function grant(amount: number) {
    startTransition(async () => {
      const res = await grantSelfCoinsAction(amount);
      if (res.ok && res.coins != null) setCoins(res.coins);
    });
  }

  return (
    <Stack spacing={1} alignItems="center">
      <Typography variant="overline" color="text.secondary">
        Dev faucet (admin)
      </Typography>
      <Stack direction="row" spacing={1}>
        {[1000, 10000].map((n) => (
          <Button
            key={n}
            variant="outlined"
            color="tertiary"
            disabled={pending}
            onClick={() => grant(n)}
          >
            +{n.toLocaleString()} 🌽
          </Button>
        ))}
      </Stack>
      {coins != null && (
        <Typography variant="body2" color="text.secondary">
          Balance: {coins.toLocaleString()} 🌽
        </Typography>
      )}
    </Stack>
  );
}
