import Link from "next/link";
import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FriendButton from "@/components/FriendButton";
import CollectionCard from "@/components/CollectionCard";
import AchievementBadge from "@/components/AchievementBadge";
import AchievementToaster from "@/components/AchievementToaster";
import LogoutButton from "@/components/LogoutButton";
import { PROFILE_ACHIEVEMENTS, evaluate } from "@/lib/achievements";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  getFriendship,
  getFriends,
  getRoostrs,
  getProfileMetrics,
  getAchievementUnlocks,
  recordAchievementUnlocks,
} from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";

// Public profile reachable via the shared link: /<telegramId>. Single-segment
// dynamic route — static routes (/market, /collection, …) win, so it only catches
// leftover ids.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ telegramid: string }>;
}) {
  const { telegramid } = await params;
  const { locale, t } = await getTranslations();
  const session = await getSession();
  const id = Number(telegramid);
  const user = Number.isFinite(id) ? await getUserById(id) : null;

  if (!user) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={1} alignItems="center" textAlign="center">
          <Typography variant="h5" component="h1">
            {t("publicProfile.notFound")}
          </Typography>
        </Stack>
      </Container>
    );
  }

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(" ") ||
    (user.username ? `@${user.username}` : String(user.id));

  // Friend controls — only for a logged-in viewer looking at someone else.
  const viewerId = session?.id;
  const isOwnProfile = viewerId === user.id;
  const friendship =
    viewerId && !isOwnProfile ? await getFriendship(viewerId, user.id) : null;
  const since = friendship
    ? new Date(friendship.createdAt).toLocaleDateString(locale)
    : null;

  // Catalog is for VISITORS only — on your own profile you don't need to see your
  // own collection (it lives in /collection). Others see it only if the player keeps
  // it public (privacy toggle); private → a lock notice. Skip the query otherwise.
  const showCatalog = !isOwnProfile && user.collectionPublic;
  const roostrs = showCatalog
    ? (await getRoostrs(user.id)).map(hydrateRoostr)
    : [];

  // Own-profile extras (economy + achievements + logout). Evaluate live, persist
  // anything now satisfied (idempotent), then read the permanent set + unlock
  // dates. recordAchievementUnlocks returns only the NEWLY earned ids → toasted.
  const metrics = isOwnProfile ? await getProfileMetrics(user.id) : null;
  const statuses = metrics ? evaluate(PROFILE_ACHIEVEMENTS, metrics) : [];
  const satisfiedIds = statuses.filter((s) => s.unlocked).map((s) => s.def.id);
  const newlyIds =
    isOwnProfile && satisfiedIds.length
      ? await recordAchievementUnlocks(user.id, satisfiedIds)
      : [];
  const unlocks = isOwnProfile ? await getAchievementUnlocks(user.id) : [];
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

  // Friends block (own profile only) — first 3, "all friends" → /[id]/friends.
  const friends = isOwnProfile ? await getFriends(user.id) : [];

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        <Avatar
          src={user.photoUrl ?? undefined}
          alt={displayName}
          sx={{ width: 96, height: 96 }}
        >
          {displayName.charAt(0)}
        </Avatar>

        <Stack spacing={0.5} alignItems="center">
          <Typography variant="h4" component="h1">
            {displayName}
          </Typography>
          {user.username && (
            <Typography color="text.secondary">@{user.username}</Typography>
          )}
        </Stack>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            color: "text.secondary",
          }}
        >
          <Image
            src="/corn-coin.png"
            alt={t("currency.coin")}
            width={20}
            height={19}
            style={{ height: 18, width: "auto" }}
          />
          <Typography>{user.coins.toLocaleString()}</Typography>
        </Box>

        {viewerId && !isOwnProfile && (
          <Stack spacing={0.75} alignItems="center">
            <FriendButton
              targetId={user.id}
              isFriend={!!friendship}
              addLabel={t("friends.add")}
              removeLabel={t("friends.remove")}
            />
            {since && (
              <Typography variant="caption" color="text.secondary">
                {t("friends.since", { date: since })}
              </Typography>
            )}
          </Stack>
        )}

        {/* Own profile: stats + achievements + friends in a wide grid (desktop:
            multi-column, not a single narrow stack), logout below. */}
        {isOwnProfile && metrics && (
          <Box sx={{ width: "100%", textAlign: "left" }}>
            <AchievementToaster
              unlocked={newlyAchievements}
              href={`/${user.id}/achievements`}
            />
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

            <Box sx={{ mt: 2.5, maxWidth: { md: 320 } }}>
              <LogoutButton />
            </Box>
          </Box>
        )}
      </Stack>

      {/* Read-only catalog of this user's roosters — visitors only, no upgrades. */}
      {!isOwnProfile && !user.collectionPublic && (
        <Stack spacing={1} alignItems="center" sx={{ mt: 5, py: 4 }}>
          <Typography color="text.secondary">
            🔒 {t("publicProfile.private")}
          </Typography>
        </Stack>
      )}

      {showCatalog && roostrs.length > 0 && (
        <Stack spacing={2} sx={{ mt: 5 }}>
          <Typography variant="overline" color="text.secondary">
            {t("publicProfile.catalog")} ({roostrs.length})
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
              },
            }}
          >
            {roostrs.map((r) => (
              <CollectionCard key={r.id ?? r.seed} roostr={r} />
            ))}
          </Box>
        </Stack>
      )}
    </Container>
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
