"use client";

import { useState } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import RoostrCard from "@/components/RoostrCard";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

export default function DebugPage() {
  const t = useT();
  const [current, setCurrent] = useState<RolledRoostr | null>(null);
  const [count, setCount] = useState(0);

  function hatch() {
    setCurrent(rollRoostr());
    setCount((c) => c + 1);
  }

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" component="h1">
          {t("debug.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t("debug.subtitle")} {t("debug.rolls", { count })}
        </Typography>

        <Button variant="contained" size="large" onClick={hatch}>
          🥚 {t("debug.hatch")}
        </Button>

        <Box sx={{ minHeight: 360, display: "flex", alignItems: "center" }}>
          {current ? (
            <RoostrCard roostr={current} />
          ) : (
            <Typography color="text.secondary">{t("debug.press")}</Typography>
          )}
        </Box>
      </Stack>
    </Container>
  );
}
