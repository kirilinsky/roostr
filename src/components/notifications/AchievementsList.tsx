"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  PROFILE_ACHIEVEMENTS,
  ROOSTER_ACHIEVEMENTS,
  type Achievement,
} from "@/lib/achievements";
import type { AchievementNotification } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { EmptyNotice, unreadSx, usePager } from "./shared";
import { useNotifActions } from "@/hooks/useNotifActions";

// Achievement defs by id (ids don't collide across scopes) → resolve icon/name.
const ACH_BY_ID: Record<string, Achievement> = Object.fromEntries(
  [...PROFILE_ACHIEVEMENTS, ...ROOSTER_ACHIEVEMENTS].map((a) => [a.id, a]),
);

// Newly-unlocked achievements → link to the profile achievements or the bird.
export default function AchievementsList({
  achievements,
  selfId,
}: {
  achievements: AchievementNotification[];
  selfId: number | null;
}) {
  const t = useT();
  const locale = useLocale();
  const { markReadAsync, readBtn } = useNotifActions();
  const { paged, pager } = usePager(achievements);
  if (achievements.length === 0) return <EmptyNotice />;

  return (
    <>
      <List disablePadding>
        {paged.map((a) => {
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
              sx={[{ px: 0, gap: 1.5, flexWrap: "wrap" }, unreadSx(a.unread)]}
            >
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  🏆 {icon} {name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {t("achievements.unlockedOn", {
                    date: new Date(a.unlockedAt).toLocaleDateString(locale),
                  })}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  component={Link}
                  href={href}
                  size="small"
                  variant="outlined"
                  onClick={() => markReadAsync(`ach:${a.achievementId}`)}
                >
                  {toRooster ? t("notifications.viewRooster") : t("profile.achievements")}
                </Button>
                {a.unread && readBtn(`ach:${a.achievementId}`)}
              </Stack>
            </ListItem>
          );
        })}
      </List>
      {pager}
    </>
  );
}
