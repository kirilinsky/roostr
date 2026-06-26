"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { alpha, type Theme } from "@mui/material/styles";
import { useLocale, useT } from "@/i18n/I18nProvider";
import {
  acceptFriendRequestAction,
  declineFriendRequestAction,
} from "@/app/[telegramid]/actions";
import {
  claimNewsAction,
  markNotificationsSeenAction,
} from "@/app/notifications/actions";
import { claimQuestAction } from "@/app/quests/actions";
import { BREEDS_CATALOG } from "@/lib/breeds";
import { PROFILE_ACHIEVEMENTS, ROOSTER_ACHIEVEMENTS } from "@/lib/achievements";
import { REWARD_IMG } from "@/components/QuestBoard";
import type { Achievement } from "@/lib/achievements";
import type { QuestState } from "@/lib/quests";
import type {
  FriendRequestSummary,
  DiscoverySummary,
  NewsItem,
  AchievementNotification,
} from "@/db/queries";

const BREED_NAME: Record<string, { en: string; ru: string }> =
  Object.fromEntries(BREEDS_CATALOG.map((b) => [b.id, b.name]));

// Profile + rooster achievement defs by id (ids don't collide across scopes) →
// resolve icon/name for a notification row.
const ACH_BY_ID: Record<string, Achievement> = Object.fromEntries(
  [...PROFILE_ACHIEVEMENTS, ...ROOSTER_ACHIEVEMENTS].map((a) => [a.id, a]),
);

// Filter categories. Only "friends" carries data today (incoming requests);
// the rest are placeholders for future notification types.
const TABS = [
  { key: "news", labelKey: "notifications.news" },
  { key: "quests", labelKey: "notifications.quests" },
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
  achievements = [],
  readyQuests = [],
  selfId = null,
}: {
  requests: FriendRequestSummary[];
  newFriends?: FriendRequestSummary[]; // accepted → "you're now friends with X"
  fullStations?: ("farm" | "lab")[]; // stations whose buffer is full → claim it
  discoveries?: DiscoverySummary[]; // new Roostrdex entries
  news?: NewsItem[]; // system / promo announcements (CTA claim)
  achievements?: AchievementNotification[]; // newly-unlocked achievements
  readyQuests?: QuestState[]; // quests whose reward can be claimed now
  selfId?: number | null; // viewer id → profile-achievement link target
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
      : tab === "quests"
        ? readyQuests.length
        : tab === "friends"
          ? requests.length
          : tab === "roostrdex"
            ? discoveries.length
            : tab === "achievements"
              ? achievements.length
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
  const pagedAchievements = useMemo(
    () => (tab === "achievements" ? slice(achievements) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [achievements, page, tab],
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

  // Per-tab badge counts = UNREAD informational items + actionable items (pending
  // requests / claimable quests / full stations always count).
  const unreadNews = news.filter((n) => n.unread).length;
  const unreadFriends = newFriends.filter((f) => f.unread).length;
  const unreadAch = achievements.filter((a) => a.unread).length;
  const unreadDex = discoveries.filter((d) => d.unread).length;
  const tabCounts: Record<string, number> = {
    news: unreadNews,
    quests: readyQuests.length,
    friends: requests.length + unreadFriends,
    achievements: unreadAch,
    farm: fullStations.includes("farm") ? 1 : 0,
    lab: fullStations.includes("lab") ? 1 : 0,
    roostrdex: unreadDex,
  };
  // "Mark all read" only matters for the informational (cursor-based) categories.
  const anyUnread = unreadNews + unreadFriends + unreadAch + unreadDex > 0;
  const markRead = () => act(() => markNotificationsSeenAction());

  // Accent an unread row (left bar + faint tint) so read vs unread is obvious
  // without hiding read ones.
  const unreadSx = (unread?: boolean) =>
    unread
      ? {
          pl: 1,
          borderRadius: 0,
          bgcolor: (theme: Theme) => alpha(theme.palette.secondary.main, 0.08),
          boxShadow: (theme: Theme) =>
            `inset 3px 0 0 ${theme.palette.secondary.main}`,
        }
      : {};

  // Square magenta count pill — shared by the desktop tab strip and the mobile
  // dropdown items so both surfaces show the same per-category badge.
  const countBadge = (n: number) =>
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

  return (
    // minWidth:0 lets this flex column shrink below the tab-strip content width
    // (otherwise the scrollable Tabs force horizontal overflow on narrow screens).
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      {anyUnread && (
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            size="small"
            color="neutral"
            disabled={busy}
            onClick={markRead}
          >
            ✓ {t("notifications.markAllRead")}
          </Button>
        </Box>
      )}
      {/* Mobile: a 9-item scrollable tab strip is too fiddly to tap and hides
          which categories have unread items. A wrapping chip bar shows every
          category at once, each with its own unread badge. Desktop keeps tabs. */}
      <Box
        sx={{
          display: { xs: "flex", md: "none" },
          flexWrap: "wrap",
          gap: 1,
          pt: 0.5,
        }}
      >
        {TABS.map((x) => {
          const n = tabCounts[x.key] ?? 0;
          const selected = tab === x.key;
          return (
            <Badge
              key={x.key}
              badgeContent={n}
              color="secondary"
              overlap="rectangular"
            >
              <Chip
                label={t(x.labelKey)}
                clickable
                onClick={() => selectTab(x.key)}
                color={selected ? "primary" : "default"}
                variant={selected ? "filled" : "outlined"}
                size="small"
              />
            </Badge>
          );
        })}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => selectTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          display: { xs: "none", md: "flex" },
          minHeight: 40,
          maxWidth: "100%",
          minWidth: 0,
          "& .MuiTab-root": {
            minHeight: 40,
            minWidth: 90,
            px: 2,
            fontSize: "0.875rem",
          },
        }}
      >
        {TABS.map((x) => {
          const n = tabCounts[x.key] ?? 0;
          return (
            <Tab
              key={x.key}
              value={x.key}
              label={
                <Box
                  component="span"
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}
                >
                  {t(x.labelKey)}
                  {countBadge(n)}
                </Box>
              }
            />
          );
        })}
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
                  sx={[
                    { px: 0, gap: 1.5, flexWrap: "wrap", alignItems: "flex-start" },
                    unreadSx(n.unread),
                  ]}
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
      ) : tab === "quests" ? (
        readyQuests.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t("notifications.empty")}
          </Typography>
        ) : (
          <List disablePadding>
            {readyQuests.map((q) => (
              <ListItem
                key={q.def.id}
                divider
                sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}
              >
                <Typography sx={{ fontSize: 22, lineHeight: 1 }}>
                  {q.def.icon}
                </Typography>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {q.def.name[locale]}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {t("quests.readyNote")}
                  </Typography>
                </Box>
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disabled={busy}
                  onClick={() => act(() => claimQuestAction(q.def.id))}
                  sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}
                >
                  {t("quests.claim")} +{q.def.reward.amount}
                  <Image
                    src={REWARD_IMG[q.def.reward.resource]}
                    alt=""
                    width={16}
                    height={16}
                    style={{ height: 14, width: "auto" }}
                  />
                </Button>
              </ListItem>
            ))}
          </List>
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
                      sx={[
                        { px: 0, gap: 1.5, flexWrap: "wrap" },
                        unreadSx(f.unread),
                      ]}
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
      ) : tab === "achievements" ? (
        pagedAchievements.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            {t("notifications.empty")}
          </Typography>
        ) : (
          <>
            <List disablePadding>
              {pagedAchievements.map((a) => {
                const def = ACH_BY_ID[a.achievementId];
                const name = def ? def.name[locale] : a.achievementId;
                const icon = def?.icon ?? "🏆";
                const toRooster = a.scope === "rooster" && !!a.roostrId;
                const href = toRooster
                  ? `/collection/${a.roostrId}`
                  : selfId != null
                    ? `/${selfId}/achievements`
                    : "/notifications";
                return (
                  <ListItem
                    key={a.achievementId}
                    divider
                    sx={[
                      { px: 0, gap: 1.5, flexWrap: "wrap" },
                      unreadSx(a.unread),
                    ]}
                  >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>
                        🏆 {icon} {name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t("achievements.unlockedOn", {
                          date: new Date(a.unlockedAt).toLocaleDateString(
                            locale,
                          ),
                        })}
                      </Typography>
                    </Box>
                    <Button
                      component={Link}
                      href={href}
                      size="small"
                      variant="outlined"
                    >
                      {toRooster
                        ? t("notifications.viewRooster")
                        : t("profile.achievements")}
                    </Button>
                  </ListItem>
                );
              })}
            </List>
            {pager}
          </>
        )
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
