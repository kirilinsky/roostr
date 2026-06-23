"use client";

import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

export default function TelegramLoginButton({
  configured,
}: {
  configured: boolean;
}) {
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <Button
        href="/api/auth/telegram/start"
        variant="contained"
        disabled={!configured}
        sx={{ alignSelf: "flex-start" }}
      >
        Telegram
      </Button>
      {!configured && (
        <Alert severity="error">Telegram login is not configured.</Alert>
      )}
    </Box>
  );
}
