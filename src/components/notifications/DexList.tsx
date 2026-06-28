"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { DiscoverySummary } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { BREED_NAME, EmptyNotice, unreadSx, usePager } from "./shared";
import { useNotifActions } from "@/hooks/useNotifActions";

// New Roostrdex entries → "you discovered X" with a link to the dex.
export default function DexList({ discoveries }: { discoveries: DiscoverySummary[] }) {
  const t = useT();
  const locale = useLocale();
  const { markReadAsync, readBtn } = useNotifActions();
  const { paged, pager } = usePager(discoveries);
  if (discoveries.length === 0) return <EmptyNotice />;

  return (
    <>
      <List disablePadding>
        {paged.map((d) => {
          const breed = BREED_NAME[d.breedId]?.[locale] ?? d.breedId;
          return (
            <ListItem
              key={d.breedId}
              divider
              sx={[{ px: 0, gap: 1.5, flexWrap: "wrap" }, unreadSx(d.unread)]}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  📕 {t("notifications.newDexEntry", { breed })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(d.discoveredAt).toLocaleDateString(locale)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  component={Link}
                  href="/roostrdex"
                  size="small"
                  variant="outlined"
                  onClick={() => markReadAsync(`dex:${d.breedId}`)}
                >
                  {t("nav.roostrdex")}
                </Button>
                {d.unread && readBtn(`dex:${d.breedId}`)}
              </Stack>
            </ListItem>
          );
        })}
      </List>
      {pager}
    </>
  );
}
