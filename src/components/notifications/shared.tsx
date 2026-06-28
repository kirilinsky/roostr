"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { BREEDS_CATALOG } from "@/lib/breeds";
import { useT } from "@/i18n/I18nProvider";

export const PAGE_SIZE = 10; // max notifications per page

// Empty-state line shown when a tab has nothing.
export function EmptyNotice() {
  const t = useT();
  return (
    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
      {t("notifications.empty")}
    </Typography>
  );
}

// breedId → localized name, for gift + dex rows.
export const BREED_NAME: Record<string, { en: string; ru: string }> =
  Object.fromEntries(BREEDS_CATALOG.map((b) => [b.id, b.name]));

// Accent an unread row (left bar + faint tint) so read vs unread is obvious.
export const unreadSx = (unread?: boolean) =>
  unread
    ? {
        pl: 1,
        borderRadius: 0,
        bgcolor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.08),
        boxShadow: (theme: Theme) => `inset 3px 0 0 ${theme.palette.secondary.main}`,
      }
    : {};

// Square magenta count pill — used on both the desktop tab strip and mobile chips.
export const countBadge = (n: number) =>
  n > 0 ? (
    <Box
      component="span"
      sx={{
        minWidth: 18,
        height: 18,
        px: 0.5,
        borderRadius: 0,
        bgcolor: "secondary.main",
        color: "secondary.contrastText",
        fontSize: "0.68rem",
        fontWeight: 800,
        lineHeight: "18px",
        textAlign: "center",
      }}
    >
      {n}
    </Box>
  ) : null;

// Per-list pagination. Each list mounts fresh on tab switch, so page resets free.
export function usePager<T>(arr: T[]) {
  const [page, setPage] = useState(1);
  const pageCount = Math.ceil(arr.length / PAGE_SIZE);
  const paged = arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pager =
    pageCount > 1 ? (
      <Stack alignItems="center">
        <Pagination
          count={pageCount}
          page={page}
          onChange={(_, p) => setPage(p)}
          size="small"
          color="primary"
        />
      </Stack>
    ) : null;
  return { paged, pager };
}
