"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
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
import { claimNewsAction } from "@/app/notifications/actions";
import { BREEDS_CATALOG } from "@/lib/breeds";
import type {
  FriendRequestSummary,
  DiscoverySummary,
  NewsItem,
} from "@/db/queries";

const BREED_NAME: Record<string, { en: string; ru: string }> =
  Object.fromEntries(BREEDS_CATALOG.map((b) => [b.id, b.name]));

// Filter categories. Only "friends" carries data today (incoming requests);
// the rest are placeholders for future notification types.
const TABS = [
  { key: "news", labelKey: "notifications.news" },
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
  newFriends = [],
  fullStations = [],
  discoveries = [],
  news = [],
}: {
  requests: FriendRequestSummary[];
  newFriends?: FriendRequestSummary[]; // accepted → "you're now friends with X"
  fullStations?: ("farm" | "lab")[]; // stations whose buffer is full → claim it
  discoveries?: DiscoverySummary[]; // new Roostrdex entries
  news?: NewsItem[]; // system / promo announcements (CTA claim)
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
  function act(fn: () => Promise<unknown>) {
    startTransition(async () => {
      await fn();
      router.refresh();
    });
  }

  // friends → request list · roostrdex → discovery list · farm/lab → "buffer full".
  const activeCount =
    tab === "news"
      ? news.length
      : tab === "friends"
        ? requests.length
        : tab === "roostrdex"
          ? discoveries.length
          : 0;
  const pageCount = Math.ceil(activeCount / PAGE_SIZE);
  const slice = <T,>(arr: T[]) =>
    arr.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const pagedFriends = useMemo(
    () => (tab === "friends" ? slice(requests) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [requests, page, tab],
  );
  const pagedDex = useMemo(
    () => (tab === "roostrdex" ? slice(discoveries) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [discoveries, page, tab],
  );
  const pagedNews = useMemo(
    () => (tab === "news" ? slice(news) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [news, page, tab],
  );
  const stationFull =
    (tab === "farm" || tab === "lab") && fullStations.includes(tab);
  const pager = pageCount > 1 && (
    <Stack alignItems="center">
      <Pagination
        count={pageCount}
        page={page}
        onChange={(_, p) => setPage(p)}
        size="small"
        color="primary"
      />
    </Stack>
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

      {tab === "news" ? (
        pagedNews.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t("notifications.empty")}
          </Typography>
        ) : (
          <>
            <List disablePadding>
              {pagedNews.map((n) => (
                <ListItem
                  key={n.id}
                  divider
                  sx={{ px: 0, gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      📣 {n.title[locale]}
                    </Typography>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      component="div"
                    >
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
                      >
                        {t("notifications.open")}
                      </Button>
                    )}
                    {n.ctaType === "claim_egg" && (
                      <Button
                        size="small"
                        variant="contained"
                        disabled={busy || n.claimed}
                        onClick={() => act(() => claimNewsAction(n.id))}
                      >
                        {n.claimed
                          ? t("notifications.claimed")
                          : t("notifications.claimEgg", { n: n.ctaAmount ?? 1 })}
                      </Button>
                    )}
                  </Stack>
                </ListItem>
              ))}
            </List>
            {pager}
          </>
        )
      ) : tab === "friends" ? (
        newFriends.length === 0 && requests.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t("notifications.empty")}
          </Typography>
        ) : (
          <Stack spacing={2}>
            {newFriends.length > 0 && (
              <List disablePadding>
                {newFriends.map((f) => {
                  const name =
                    [f.firstName, f.lastName].filter(Boolean).join(" ") ||
                    (f.username ? `@${f.username}` : String(f.id));
                  return (
                    <ListItem
                      key={`nf-${f.id}`}
                      divider
                      sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}
                    >
                      <Avatar
                        component={Link}
                        href={`/${f.id}`}
                        src={f.photoUrl ?? undefined}
                        alt={name}
                      >
                        {name.charAt(0)}
                      </Avatar>
                      <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          🎉 {t("notifications.newFriend", { name })}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {new Date(f.createdAt).toLocaleDateString(locale)}
                        </Typography>
                      </Box>
                      <Button
                        component={Link}
                        href={`/${f.id}`}
                        size="small"
                        variant="outlined"
                      >
                        {t("friends.profile")}
                      </Button>
                    </ListItem>
                  );
                })}
              </List>
            )}
            {requests.length > 0 && (
              <>
                <List disablePadding>
                  {pagedFriends.map((r) => {
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
                {pager}
              </>
            )}
          </Stack>
        )
      ) : tab === "roostrdex" && pagedDex.length > 0 ? (
        <>
          <List disablePadding>
            {pagedDex.map((d) => {
              const breed =
                BREED_NAME[d.breedId]?.[locale] ?? d.breedId;
              return (
                <ListItem
                  key={d.breedId}
                  divider
                  sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      📕 {t("notifications.newDexEntry", { breed })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(d.discoveredAt).toLocaleDateString(locale)}
                    </Typography>
                  </Box>
                  <Button
                    component={Link}
                    href="/roostrdex"
                    size="small"
                    variant="outlined"
                  >
                    {t("nav.roostrdex")}
                  </Button>
                </ListItem>
              );
            })}
          </List>
          {pager}
        </>
      ) : stationFull ? (
        <Card>
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="body1">
                🔔{" "}
                {t(
                  tab === "farm"
                    ? "notifications.farmFull"
                    : "notifications.labFull",
                )}
              </Typography>
              <Button
                component={Link}
                href={`/${tab}`}
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
              >
                {t("station.claim")}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      ) : (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {t("notifications.empty")}
        </Typography>
      )}
    </Stack>
  );
}
