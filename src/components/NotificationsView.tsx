"use client";

import { useState } from "react";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import type {
  FriendRequestSummary,
  DiscoverySummary,
  NewsItem,
  AchievementNotification,
  IncomingGift,
  GiftUpdate,
  SynthGeneNotification,
} from "@/db/queries";
import type { QuestState } from "@/lib/quests";
import { useT } from "@/i18n/I18nProvider";
import { countBadge, EmptyNotice } from "@/components/notifications/shared";
import NewsList from "@/components/notifications/NewsList";
import QuestsList from "@/components/notifications/QuestsList";
import FriendsTab from "@/components/notifications/FriendsTab";
import DexList from "@/components/notifications/DexList";
import AchievementsList from "@/components/notifications/AchievementsList";
import SynthGeneList from "@/components/notifications/SynthGeneList";
import StationNotice from "@/components/notifications/StationNotice";

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

// Notifications feed. A tab strip (chip bar on mobile, scrollable Tabs on desktop)
// over the per-category list components in notifications/*.
export default function NotificationsView({
  requests,
  newFriends = [],
  fullStations = [],
  discoveries = [],
  news = [],
  achievements = [],
  readyQuests = [],
  incomingGifts = [],
  giftUpdates = [],
  synthGenes = [],
  selfId = null,
}: {
  requests: FriendRequestSummary[];
  newFriends?: FriendRequestSummary[];
  fullStations?: ("farm" | "lab")[];
  discoveries?: DiscoverySummary[];
  news?: NewsItem[];
  achievements?: AchievementNotification[];
  readyQuests?: QuestState[];
  incomingGifts?: IncomingGift[];
  giftUpdates?: GiftUpdate[];
  synthGenes?: SynthGeneNotification[];
  selfId?: number | null;
}) {
  const t = useT();
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("friends");

  // Per-tab badge counts = UNREAD informational items + actionable items (pending
  // requests / claimable quests / full stations always count).
  const unread = <T extends { unread?: boolean }>(arr: T[]) =>
    arr.filter((x) => x.unread).length;
  const tabCounts: Record<string, number> = {
    news: unread(news),
    quests: readyQuests.length,
    friends:
      requests.length + unread(newFriends) + unread(incomingGifts) + unread(giftUpdates),
    achievements: unread(achievements),
    farm: fullStations.includes("farm") ? 1 : 0,
    lab: (fullStations.includes("lab") ? 1 : 0) + unread(synthGenes),
    roostrdex: unread(discoveries),
  };

  const stationFull =
    (tab === "farm" || tab === "lab") && fullStations.includes(tab);

  return (
    // minWidth:0 lets this flex column shrink below the tab-strip content width.
    <Stack spacing={2} sx={{ minWidth: 0 }}>
      {/* Mobile: a wrapping chip bar shows every category + its unread badge. */}
      <Box sx={{ display: { xs: "flex", md: "none" }, flexWrap: "wrap", gap: 1, pt: 0.5 }}>
        {TABS.map((x) => (
          <Badge key={x.key} badgeContent={tabCounts[x.key] ?? 0} color="secondary" overlap="rectangular">
            <Chip
              label={t(x.labelKey)}
              clickable
              onClick={() => setTab(x.key)}
              color={tab === x.key ? "primary" : "default"}
              variant={tab === x.key ? "filled" : "outlined"}
              size="small"
            />
          </Badge>
        ))}
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          display: { xs: "none", md: "flex" },
          minHeight: 40,
          maxWidth: "100%",
          minWidth: 0,
          "& .MuiTab-root": { minHeight: 40, minWidth: 90, px: 2, fontSize: "0.875rem" },
        }}
      >
        {TABS.map((x) => (
          <Tab
            key={x.key}
            value={x.key}
            label={
              <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
                {t(x.labelKey)}
                {countBadge(tabCounts[x.key] ?? 0)}
              </Box>
            }
          />
        ))}
      </Tabs>

      {tab === "news" ? (
        <NewsList news={news} />
      ) : tab === "quests" ? (
        <QuestsList quests={readyQuests} />
      ) : tab === "friends" ? (
        <FriendsTab
          requests={requests}
          newFriends={newFriends}
          incomingGifts={incomingGifts}
          giftUpdates={giftUpdates}
        />
      ) : tab === "roostrdex" ? (
        <DexList discoveries={discoveries} />
      ) : tab === "achievements" ? (
        <AchievementsList achievements={achievements} selfId={selfId} />
      ) : tab === "lab" ? (
        fullStations.includes("lab") || synthGenes.length > 0 ? (
          <Stack spacing={2}>
            {fullStations.includes("lab") && <StationNotice kind="lab" />}
            {synthGenes.length > 0 && <SynthGeneList events={synthGenes} />}
          </Stack>
        ) : (
          <EmptyNotice />
        )
      ) : stationFull ? (
        <StationNotice kind={tab as "farm" | "lab"} />
      ) : (
        <EmptyNotice />
      )}
    </Stack>
  );
}
