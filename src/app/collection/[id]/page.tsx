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
  const coins = isOwner ? (await getUserById(session.id))?.coins ?? 0 : 0;
  const roostr = hydrateRoostr(row);

  // Rooster (per-bird) achievements: evaluate against THIS bird. They're stored
  // account-level (unlocked once any owned bird qualifies; ids don't collide with
  // profile ones). Persist + toast only for the owner; display the earned ones.
  const rStatuses = evaluate(ROOSTER_ACHIEVEMENTS, roosterMetricsFrom(roostr));
  const satisfiedIds = rStatuses.filter((s) => s.unlocked).map((s) => s.def.id);
  const newlyIds =
    isOwner && session && satisfiedIds.length
      ? await recordAchievementUnlocks(session.id, satisfiedIds)
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
        isOwner={isOwner}
        locked={row.status !== "active"}
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
