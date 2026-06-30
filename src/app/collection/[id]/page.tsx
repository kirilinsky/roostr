import { notFound } from "next/navigation";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrDetail from "@/components/RoostrDetail";
import AchievementBadge from "@/components/AchievementBadge";
import AchievementToaster from "@/components/AchievementToaster";
import { getSession } from "@/lib/auth";
import {
  getRoostr,
  getUserById,
  getAchievementUnlocks,
  recordAchievementUnlocks,
  getRoostrHistory,
  getFriends,
  getTopCategoryLeaders,
} from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import {
  ROOSTER_ACHIEVEMENTS,
  evaluate,
  roosterMetricsFrom,
} from "@/lib/achievements";
import { getTranslations } from "@/i18n/server";

// Per-rooster detail, routed by the roostr's DB id (uuid). Server component:
// fetch the row, rehydrate, resolve ownership (only the owner sees working
// upgrade buttons) and the owner's coin balance for affordability display.
export default async function RoostrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getRoostr(id);
  if (!row) notFound();

  const { t, locale } = await getTranslations();
  const session = await getSession();
  const isOwner = !!session && session.id === row.ownerId;
  const me = isOwner && session ? await getUserById(session.id) : null;
  const coins = me?.coins ?? 0;
  const sci = me?.sci ?? 0;
  // Friends list powers the gift picker (owner only — only the owner can gift).
  const friends = isOwner && session ? await getFriends(session.id) : [];
  const roostr = hydrateRoostr(row);

  // Distinct owners ever (genesis + every transfer side) → "Hot Potato".
  const history = await getRoostrHistory(id);
  const ownerSet = new Set<number>();
  for (const h of history) {
    if (h.fromUserId) ownerSet.add(h.fromUserId);
    if (h.toUserId) ownerSet.add(h.toUserId);
  }

  // Rooster (per-bird) achievements: evaluate against THIS bird. They're stored
  // account-level (unlocked once any owned bird qualifies; ids don't collide with
  // profile ones). Persist + toast only for the owner; display the earned ones.
  // Times THIS bird was renamed (meta.renameCount) → "Indecisive".
  const renameCount = Number(
    (row.meta as { renameCount?: number } | null)?.renameCount ?? 0,
  );
  // Gift flags live on the bird's meta (set on accept / decline) → the
  // "gifted" and "rejected" rooster achievements.
  const meta = (row.meta as { gifted?: boolean; giftRejected?: boolean } | null) ?? {};
  // #1 in any leaderboard category → "Arena Champion" (global, not bird-derivable).
  const topLeaders = await getTopCategoryLeaders();
  const rStatuses = evaluate(ROOSTER_ACHIEVEMENTS, {
    ...roosterMetricsFrom(roostr),
    owners: ownerSet.size,
    renameCount,
    wasGifted: meta.gifted ? 1 : 0,
    wasRejected: meta.giftRejected ? 1 : 0,
    topCategory: topLeaders.has(id) ? 1 : 0,
  });
  const satisfiedIds = rStatuses.filter((s) => s.unlocked).map((s) => s.def.id);
  const newlyIds =
    isOwner && session && satisfiedIds.length
      ? await recordAchievementUnlocks(session.id, satisfiedIds, "rooster", id)
      : [];
  const unlocks =
    isOwner && session ? await getAchievementUnlocks(session.id) : [];
  const unlockedAt = new Map(unlocks.map((u) => [u.achievementId, u.unlockedAt]));
  const newlyAchievements = ROOSTER_ACHIEVEMENTS.filter((a) =>
    newlyIds.includes(a.id),
  );
  const earned = rStatuses.filter((s) => s.unlocked);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <AchievementToaster
        unlocked={newlyAchievements}
        href={session ? `/${session.id}/achievements` : undefined}
      />
      <RoostrDetail
        roostr={roostr}
        roostrId={id}
        coins={coins}
        sci={sci}
        isOwner={isOwner}
        locked={row.status !== "active"}
        friends={friends}
      />

      {earned.length > 0 && (
        <Stack spacing={1.5} sx={{ mt: { xs: 4, md: 5 } }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            {t("profile.achievements")}
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: {
                xs: "minmax(0, 1fr)",
                sm: "repeat(2, minmax(0, 1fr))",
              },
            }}
          >
            {earned.map((s) => {
              const at = unlockedAt.get(s.def.id);
              return (
                <AchievementBadge
                  key={s.def.id}
                  achievement={s.def}
                  unlocked
                  unlockedNote={
                    at
                      ? t("achievements.unlockedOn", {
                          date: new Date(at).toLocaleDateString(locale),
                        })
                      : undefined
                  }
                  locale={locale}
                />
              );
            })}
          </Box>
        </Stack>
      )}
    </Container>
  );
}
