"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// DEV-ONLY: swap between a fake admin, fake non-admin, and guest on localhost
// (no real Telegram). Renders nothing in production builds.
export default function DevLoginButtons() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  async function login(role: "admin" | "user") {
    setBusy(true);
    try {
      await fetch("/api/auth/dev", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ role }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box
      sx={{
        m: 2,
        p: 1.5,
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        borderRadius: 0,
        bgcolor: "action.hover",
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: "block", mb: 1, fontWeight: 700, letterSpacing: 1 }}
      >
        DEV LOGIN
      </Typography>
      <Stack direction="row" spacing={1}>
        <Button
          size="small"
          variant="outlined"
          color="secondary"
          disabled={busy}
          onClick={() => login("admin")}
        >
          Admin
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="neutral"
          disabled={busy}
          onClick={() => login("user")}
        >
          User
        </Button>
        <Button size="small" variant="text" disabled={busy} onClick={logout}>
          Guest
        </Button>
      </Stack>
    </Box>
  );
}
