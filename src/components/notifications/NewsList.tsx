"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { claimNewsAction, markNotificationReadAction } from "@/app/notifications/actions";
import type { NewsItem } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { EmptyNotice, unreadSx, usePager } from "./shared";
import { useNotifActions } from "@/hooks/useNotifActions";

// News / promo announcements: optional "open" link + claim-egg CTA + ✓.
export default function NewsList({ news }: { news: NewsItem[] }) {
  const t = useT();
  const locale = useLocale();
  const { busy, act, markReadAsync, readBtn } = useNotifActions();
  const { paged, pager } = usePager(news);
  if (news.length === 0) return <EmptyNotice />;

  return (
    <>
      <List disablePadding>
        {paged.map((n) => (
          <ListItem
            key={n.id}
            divider
            sx={[
              { px: 0, gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" },
              unreadSx(n.unread),
            ]}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                📣 {n.title[locale]}
              </Typography>
              <Typography variant="caption" color="text.secondary" component="div">
                {n.body[locale]}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {new Date(n.createdAt).toLocaleDateString(locale)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              {n.link && (
                <Button
                  component={Link}
                  href={n.link}
                  size="small"
                  variant="outlined"
                  onClick={() => markReadAsync(`news:${n.id}`)}
                >
                  {t("notifications.open")}
                </Button>
              )}
              {(n.ctaType === "claim_egg" || n.ctaType === "claim_sci") && (
                <Button
                  size="small"
                  variant="contained"
                  disabled={busy || n.claimed}
                  onClick={() =>
                    act(async () => {
                      await claimNewsAction(n.id);
                      await markNotificationReadAction(`news:${n.id}`);
                    })
                  }
                >
                  {n.claimed
                    ? t("notifications.claimed")
                    : t(
                        n.ctaType === "claim_sci"
                          ? "notifications.claimSci"
                          : "notifications.claimEgg",
                        { n: n.ctaAmount ?? 1 },
                      )}
                </Button>
              )}
              {n.unread && readBtn(`news:${n.id}`)}
            </Stack>
          </ListItem>
        ))}
      </List>
      {pager}
    </>
  );
}
