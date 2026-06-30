"use client";

import { useState, useTransition } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { grantSelfCoinsAction, grantSelfSciAction } from "@/app/debug/actions";

// DEV faucet UI (admin-only page). Grants coins + science to the admin to test
// the economy (coin sinks: egg shop / upgrades; science sink: synth-gene shop).
export default function DebugCoinGrant() {
  const [coins, setCoins] = useState<number | null>(null);
  const [sci, setSci] = useState<number | null>(null);
  const [customSci, setCustomSci] = useState("");
  const [pending, startTransition] = useTransition();

  function grantCoins(amount: number) {
    startTransition(async () => {
      const res = await grantSelfCoinsAction(amount);
      if (res.ok && res.coins != null) setCoins(res.coins);
    });
  }

  function grantSci(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    startTransition(async () => {
      const res = await grantSelfSciAction(Math.floor(amount));
      if (res.ok && res.sci != null) setSci(res.sci);
    });
  }

  const customSciValue = Math.floor(Number(customSci));
  const customSciOk = Number.isFinite(customSciValue) && customSciValue > 0;

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
            onClick={() => grantCoins(n)}
          >
            +{n.toLocaleString()} 🌽
          </Button>
        ))}
      </Stack>
      <Stack direction="row" spacing={1}>
        {[150, 1000].map((n) => (
          <Button
            key={n}
            variant="outlined"
            color="secondary"
            disabled={pending}
            onClick={() => grantSci(n)}
          >
            +{n.toLocaleString()} 🔬
          </Button>
        ))}
      </Stack>
      {/* Arbitrary science grant — type any amount. */}
      <Stack direction="row" spacing={1} alignItems="center">
        <TextField
          size="small"
          type="number"
          label="Science"
          value={customSci}
          onChange={(e) => setCustomSci(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && customSciOk) grantSci(customSciValue);
          }}
          sx={{ width: 140 }}
        />
        <Button
          variant="contained"
          color="secondary"
          disabled={pending || !customSciOk}
          onClick={() => grantSci(customSciValue)}
        >
          + 🔬
        </Button>
      </Stack>
      {coins != null && (
        <Typography variant="body2" color="text.secondary">
          Coins: {coins.toLocaleString()} 🌽
        </Typography>
      )}
      {sci != null && (
        <Typography variant="body2" color="text.secondary">
          Science: {sci.toLocaleString()} 🔬
        </Typography>
      )}
    </Stack>
  );
}
