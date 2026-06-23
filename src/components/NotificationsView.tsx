"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { useLocale, useT } from "@/i18n/I18nProvider";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
} from "@/app/[telegramid]/actions";
import type { FriendRequestSummary } from "@/db/queries";

// Filter categories. Only "friends" carries data today (incoming requests);
// the rest are placeholders for future notification types.
const TABS = [
  { key: "friends", labelKey: "nav.friends" },
  { key: "battles", labelKey: "pedia.mech.battle.title" },
  { key: "market", labelKey: "nav.market" },
  { key: "achievements", labelKey: "profile.achievements" },
  { key: "farm", labelKey: "nav.farm" },
  { key: "lab", labelKey: "nav.lab" },
  { key: "roostrdex", labelKey: "nav.roostrdex" },
] as const;

const PAGE_SIZE = 10; // max notifications per page

export default function NotificationsView({
  requests,
}: {
  requests: FriendRequestSummary[];
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [busy, startTransition] = useTransition();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("friends");
  const [page, setPage] = useState(1);

  function selectTab(key: (typeof TABS)[number]["key"]) {
    setTab(key);
    setPage(1);
  }
  function act(fn: () => Promise<void>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  // Friends is the only populated category for now.
  const rows = tab === "friends" ? requests : [];
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const paged = useMemo(
    () => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [rows, page],
  );

  return (
    <Stack spacing={2}>
      <Tabs
        value={tab}
        onChange={(_, v) => selectTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 40, "& .MuiTab-root": { minHeight: 40 } }}
      >
        {TABS.map((x) => (
          <Tab key={x.key} value={x.key} label={t(x.labelKey)} />
        ))}
      </Tabs>

      {paged.length === 0 ? (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t("notifications.empty")}
        </Typography>
      ) : (
        <>
          <List disablePadding>
            {paged.map((r) => {
              const name =
                [r.firstName, r.lastName].filter(Boolean).join(" ") ||
                (r.username ? `@${r.username}` : String(r.id));
              return (
                <ListItem
                  key={r.id}
                  divider
                  sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}
                >
                  <Avatar
                    component={Link}
                    href={`/${r.id}`}
                    src={r.photoUrl ?? undefined}
                    alt={name}
                  >
                    {name.charAt(0)}
                  </Avatar>
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      🤝 {t("notifications.friendRequest", { name })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(r.createdAt).toLocaleDateString(locale)}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                      size="small"
                      variant="contained"
                      disabled={busy}
                      onClick={() => act(() => acceptFriendRequestAction(r.id))}
                    >
                      {t("notifications.accept")}
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      color="neutral"
                      disabled={busy}
                      onClick={() => act(() => declineFriendRequestAction(r.id))}
                    >
                      {t("notifications.decline")}
                    </Button>
                  </Stack>
                </ListItem>
              );
            })}
          </List>
          {pageCount > 1 && (
            <Stack alignItems="center">
              <Pagination
                count={pageCount}
                page={page}
                onChange={(_, p) => setPage(p)}
                size="small"
                color="primary"
              />
            </Stack>
          )}
        </>
      )}
    </Stack>
  );
}
