"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import { findPveEnemyAction, type PveEnemy } from "@/app/arena/actions";
import { useT } from "@/i18n/I18nProvider";

// Debug PvE: tap to roll a random enemy bird and show the matchup. No combat yet.
export default function PveDebug() {
  const t = useT();
  const [pending, start] = useTransition();
  const [enemy, setEnemy] = useState<PveEnemy | null>(null);
  const [none, setNone] = useState(false);

  function find() {
    setNone(false);
    start(async () => {
      const res = await findPveEnemyAction();
      if (res) setEnemy(res);
      else {
        setEnemy(null);
        setNone(true);
      }
    });
  }

  return (
    <Stack spacing={2} alignItems="center">
      <Button variant="contained" size="large" onClick={find} disabled={pending}>
        {pending ? (
          <CircularProgress size={22} color="inherit" />
        ) : (
          t("arena.pveFind")
        )}
      </Button>

      {none && (
        <Typography color="text.secondary">{t("arena.pveNone")}</Typography>
      )}

      {enemy && (
        <Stack spacing={1} sx={{ width: "100%", maxWidth: 240 }}>
          <Typography variant="overline" color="error.main" sx={{ fontWeight: 800, textAlign: "center" }}>
            ⚔️ {t("arena.pveEnemy")}
          </Typography>
          <CollectionCard roostr={enemy.roostr} metric="intellect" />
          <Box sx={{ textAlign: "center" }}>
            <Typography variant="caption" color="text.secondary">
              {enemy.ownerName}
            </Typography>
          </Box>
        </Stack>
      )}
    </Stack>
  );
}
