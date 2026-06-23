import Link from "next/link";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AchievementBadge from "@/components/AchievementBadge";
import AchievementToaster from "@/components/AchievementToaster";
import LogoutButton from "@/components/LogoutButton";
import ShareProfileButton from "@/components/ShareProfileButton";
import { PROFILE_ACHIEVEMENTS, evaluate } from "@/lib/achievements";
import { getTranslations } from "@/i18n/server";
import {
  getProfileMetrics,
  getAchievementUnlocks,
  recordAchievementUnlocks,
  getFriends,
} from "@/db/queries";

// The signed-in player's OWN profile body: identity + stats + achievements +
// friends as framed cards in a wide grid (desktop multi-column), logout below.
// Self-contained — fetches its own data for the given user; the public profile
// page renders this only when the viewer is the profile owner.
export default async function OwnProfile({
  user,
}: {
  user: {
    id: number;
    username: string | null;
    firstName: string | null;
    lastName: string | null;
    photoUrl: string | null;
    createdAt: Date;
  };
}) {
  const { locale, t } = await getTranslations();

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    (user.username ? `@${user.username}` : String(user.id));

  // Evaluate live, persist anything now satisfied (idempotent), then read the
  // permanent set + unlock dates. recordAchievementUnlocks returns only the NEWLY
  // earned ids → toasted here at render (also fires at the earn action site).
  const metrics = await getProfileMetrics(user.id);
  const statuses = evaluate(PROFILE_ACHIEVEMENTS, metrics);
  const satisfiedIds = statuses.filter((s) => s.unlocked).map((s) => s.def.id);
  const newlyIds = satisfiedIds.length
    ? await recordAchievementUnlocks(user.id, satisfiedIds)
    : [];
  const unlocks = await getAchievementUnlocks(user.id);
  const unlockedAt = new Map(unlocks.map((u) => [u.achievementId, u.unlockedAt]));
  const newlyAchievements = PROFILE_ACHIEVEMENTS.filter((a) =>
    newlyIds.includes(a.id),
  );
  // Recent = earned ones (newest unlock first), else the three closest to unlock.
  const earned = statuses
    .filter((s) => unlockedAt.has(s.def.id))
    .sort((a, b) =>
      (unlockedAt.get(b.def.id) ?? "").localeCompare(
        unlockedAt.get(a.def.id) ?? "",
      ),
    );
  const recentAchievements = (
    earned.length ? earned : [...statuses].sort((a, b) => b.progress - a.progress)
  ).slice(0, 3);

  const friends = await getFriends(user.id);

  return (
    <Box sx={{ textAlign: "left" }}>
      <AchievementToaster
        unlocked={newlyAchievements}
        href={`/${user.id}/achievements`}
      />

      {/* Brand-new player (no roosters yet) → nudge to the first-steps guide. */}
      {metrics.roostrsOwned === 0 && (
        <Card
          sx={{
            mb: 2.5,
            borderColor: "secondary.main",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <CardContent>
            <Stack spacing={1.5}>
              <Typography variant="h6">🚀 {t("profile.startTitle")}</Typography>
              <Typography color="text.secondary">
                {t("profile.startHint")}
              </Typography>
              <Button
                component={Link}
                href="/pedia/first-steps"
                variant="contained"
                sx={{ alignSelf: "flex-start" }}
              >
                {t("pedia.firstSteps.title")}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      )}

      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "repeat(2, minmax(0, 1fr))",
          },
          alignItems: "start",
        }}
      >
        {/* Identity — avatar + name + username + account actions (share / logout) */}
        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar
                  src={user.photoUrl ?? undefined}
                  alt={displayName}
                  sx={{ width: 64, height: 64 }}
                >
                  {displayName.charAt(0)}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h6" component="h1" noWrap>
                    {displayName}
                  </Typography>
                  {user.username && (
                    <Typography color="text.secondary" noWrap>
                      @{user.username}
                    </Typography>
                  )}
                </Box>
              </Stack>
              <Stack spacing={1}>
                <ShareProfileButton
                  telegramId={user.id}
                  label={t("friends.share")}
                  copiedLabel={t("friends.copied")}
                />
                <LogoutButton />
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("profile.stats")}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              <Row
                label={t("profile.eggsHatched")}
                value={String(metrics.eggsHatched)}
              />
              <Row
                label={t("profile.coinsEarned")}
                value={metrics.coinsEarned.toLocaleString()}
              />
              <Row
                label={t("profile.coinsSpent")}
                value={metrics.coinsSpent.toLocaleString()}
              />
              <Row
                label={t("profile.registered")}
                value={new Date(user.createdAt).toLocaleDateString(locale)}
              />
            </Stack>
          </CardContent>
        </Card>

        {/* Achievements — 3 most recent + view all */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("profile.achievements")}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {recentAchievements.map((s) => {
                const at = unlockedAt.get(s.def.id);
                return (
                  <AchievementBadge
                    key={s.def.id}
                    achievement={s.def}
                    unlocked={!!at}
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
              <Button
                component={Link}
                href={`/${user.id}/achievements`}
                variant="outlined"
                color="neutral"
                fullWidth
              >
                {t("profile.allAchievements")}
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Friends — first 3 + all friends → /[id]/friends */}
        <Card>
          <CardContent>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {t("profile.friends")}
            </Typography>
            <Stack spacing={1} sx={{ mt: 1.5 }}>
              {friends.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  {t("friends.empty")}
                </Typography>
              ) : (
                friends.slice(0, 3).map((f) => {
                  const name =
                    [f.firstName, f.lastName].filter(Boolean).join(" ") ||
                    (f.username ? `@${f.username}` : String(f.id));
                  return (
                    <Button
                      key={f.id}
                      component={Link}
                      href={`/${f.id}`}
                      color="neutral"
                      sx={{
                        justifyContent: "flex-start",
                        textTransform: "none",
                        gap: 1,
                        px: 1,
                      }}
                    >
                      <Avatar
                        src={f.photoUrl ?? undefined}
                        alt={name}
                        sx={{ width: 28, height: 28 }}
                      >
                        {name.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" noWrap>
                        {name}
                      </Typography>
                    </Button>
                  );
                })
              )}
              <Button
                component={Link}
                href={`/${user.id}/friends`}
                variant="outlined"
                color="neutral"
                fullWidth
              >
                {t("profile.allFriends")}
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  );
}
