"use client";

import { useState, useTransition } from "react";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { backfillCosmeticsAction } from "@/app/debug/actions";

// DEBUG (admin) — bake meta.cosmetic onto existing roostrs. Idempotent; run once.
export default function DebugBackfillCosmetics() {
  const [busy, start] = useTransition();
  const [msg, setMsg] = useState("");
  const run = () =>
    start(async () => {
      const r = await backfillCosmeticsAction();
      setMsg(r.ok ? `baked ${r.updated}/${r.total}` : "admin only");
    });
  return (
    <Stack direction="row" spacing={1.5} alignItems="center">
      <Button variant="outlined" onClick={run} disabled={busy}>
        🎨 Backfill V2 cosmetics
      </Button>
      {msg && (
        <Typography variant="caption" color="text.secondary">
          {msg}
        </Typography>
      )}
    </Stack>
  );
}
