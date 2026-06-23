import Link from "next/link";
import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FriendButton from "@/components/FriendButton";
import CollectionCard from "@/components/CollectionCard";
import AchievementBadge from "@/components/AchievementBadge";
import AchievementToaster from "@/components/AchievementToaster";
import LogoutButton from "@/components/LogoutButton";
import {
  PROFILE_ACHIEVEMENTS,
  evaluate,
  profileMetricsFrom,
} from "@/lib/achievements";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import {
  getUserById,
  getFriendship,
  getRoostrs,
  getUserStats,
  getAchievementUnlocks,
  recordAchievementUnlocks,
} from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";

// Public profile reachable via the shared link: /<telegramId>. Single-segment
// dynamic route — static routes (/friends, /market, …) win, so it only catches
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

  // Catalog visibility: owner always sees it; others only if the player keeps
  // their collection public (settings privacy toggle). Skip the query when hidden.
  const canSeeCollection = isOwnProfile || user.collectionPublic;
  const roostrs = canSeeCollection
    ? (await getRoostrs(user.id)).map(hydrateRoostr)
    : [];

  // Own-profile extras (economy + achievements + logout). Evaluate live, persist
  // anything now satisfied (idempotent), then read the permanent set + unlock
  // dates. recordAchievementUnlocks returns only the NEWLY earned ids → toasted.
  const stats = isOwnProfile ? await getUserStats(user.id) : null;
  const statuses = stats
    ? evaluate(PROFILE_ACHIEVEMENTS, profileMetricsFrom(stats))
    : [];
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

        {/* Own profile: economy + achievements + logout */}
        {isOwnProfile && stats && (
          <Stack spacing={2.5} sx={{ width: "100%", maxWidth: 380 }}>
            <AchievementToaster
              unlocked={newlyAchievements}
              locale={locale}
              href={`/${user.id}/achievements`}
            />
            <Divider flexItem />
            <Stack spacing={1}>
              <Row
                label={t("profile.eggsHatched")}
                value={String(stats.eggsHatched)}
              />
              <Row
                label={t("profile.coinsEarned")}
                value={stats.coinsEarned.toLocaleString()}
              />
              <Row
                label={t("profile.coinsSpent")}
                value={stats.coinsSpent.toLocaleString()}
              />
            </Stack>

            <Divider flexItem />

            <Stack spacing={1}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
                textAlign="left"
              >
                {t("profile.achievements")}
              </Typography>
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

            <LogoutButton />
          </Stack>
        )}
      </Stack>

      {/* Read-only catalog of this user's roosters — open each, no upgrades. */}
      {!canSeeCollection && (
        <Stack spacing={1} alignItems="center" sx={{ mt: 5, py: 4 }}>
          <Typography color="text.secondary">
            🔒 {t("publicProfile.private")}
          </Typography>
        </Stack>
      )}

      {canSeeCollection && roostrs.length > 0 && (
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
