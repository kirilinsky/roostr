import Link from "next/link";
import Image from "next/image";
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
import ShareProfileTelegramButton from "@/components/ShareProfileTelegramButton";
import ProfileFriendRequests from "@/components/ProfileFriendRequests";
import QuestBoard from "@/components/QuestBoard";
import { PROFILE_ACHIEVEMENTS, evaluate } from "@/lib/achievements";
import { getTranslations } from "@/i18n/server";
import UserAvatar from "@/components/UserAvatar";
import {
  getProfileMetrics,
  getAchievementUnlocks,
  recordAchievementUnlocks,
  getFriends,
  getIncomingFriendRequests,
  getOutgoingFriendRequests,
  getReferredUsers,
  getQuestStates,
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
    earned.length
      ? earned
      : // Don't tease secret (collectible) achievements in the closest-to-unlock fallback.
        [...statuses]
          .filter((s) => s.def.tier !== "collectible")
          .sort((a, b) => b.progress - a.progress)
  ).slice(0, 3);

  const friends = await getFriends(user.id);
  const incoming = await getIncomingFriendRequests(user.id);
  const outgoing = await getOutgoingFriendRequests(user.id);
  const referrals = await getReferredUsers(user.id);
  const hasRequests = incoming.length > 0 || outgoing.length > 0;
  const questStates = await getQuestStates(user.id);
  const questsActive = questStates.some((q) => q.status !== "claimed");

  // Resource stats use the same icon art as the HUD (img); the rest use an emoji.
  const stats: {
    img?: string;
    icon?: string;
    value: number;
    label: string;
  }[] = [
    { img: "/eggs.png", value: metrics.eggsHatched ?? 0, label: t("profile.eggsHatched") },
    { icon: "🐔", value: metrics.roostrsOwned ?? 0, label: t("profile.roostrsOwned") },
    { icon: "📕", value: metrics.breedsDiscovered ?? 0, label: t("profile.breedsDiscovered") },
    { img: "/corn-coin.png", value: metrics.coinsEarned ?? 0, label: t("profile.coinsEarned") },
    { img: "/sci.png", value: metrics.sciEarned ?? 0, label: t("profile.sciEarned") },
    { icon: "👥", value: metrics.friends ?? 0, label: t("profile.friends") },
  ];

  return (
    <Stack spacing={2.5} sx={{ textAlign: "left" }}>
      <AchievementToaster
        unlocked={newlyAchievements}
        href={`/${user.id}/achievements`}
      />

      {/* Hero — identity + account actions, full width */}
      <Card>
        <CardContent>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            spacing={2}
            alignItems={{ xs: "stretch", sm: "center" }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
              <UserAvatar
                photoUrl={user.photoUrl}
                name={displayName}
                sx={{ width: 72, height: 72 }}
              />
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" component="h1" noWrap>
                  {displayName}
                </Typography>
                {user.username && (
                  <Typography color="text.secondary" noWrap>
                    @{user.username}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {t("profile.memberSince", {
                    date: new Date(user.createdAt).toLocaleDateString(locale),
                  })}
                </Typography>
              </Box>
            </Stack>
            <Stack
              direction="column"
              spacing={1}
              sx={{
                flexShrink: 0,
                width: { xs: "100%", sm: "auto" },
                "& > *": { width: { xs: "100%", sm: "auto" } },
              }}
            >
              <ShareProfileTelegramButton
                telegramId={user.id}
                label={t("profile.shareTelegram")}
                text={t("profile.shareText")}
              />
              <ShareProfileButton
                telegramId={user.id}
                label={t("referral.copyLink")}
                copiedLabel={t("friends.copied")}
              />
              <LogoutButton />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Quests — onboarding chain that teaches mechanics + pays out (anti-plateau).
          Hidden once every quest is claimed to declutter veteran profiles. */}
      {questsActive && (
        <Card
          sx={{
            borderColor: "secondary.main",
            borderWidth: 1,
            borderStyle: "solid",
          }}
        >
          <CardContent>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="h6">🎯 {t("quests.title")}</Typography>
              <Button
                component={Link}
                href="/pedia/first-steps"
                size="small"
                color="neutral"
              >
                {t("pedia.firstSteps.title")}
              </Button>
            </Stack>
            <QuestBoard states={questStates} />
          </CardContent>
        </Card>
      )}

      {/* Stat tiles — uniform grid */}
      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: {
            xs: "repeat(2, minmax(0, 1fr))",
            sm: "repeat(3, minmax(0, 1fr))",
          },
        }}
      >
        {stats.map((s) => (
          <StatTile
            key={s.label}
            img={s.img}
            icon={s.icon}
            value={s.value.toLocaleString()}
            label={s.label}
          />
        ))}
      </Box>

      {/* Content cards — equal height (stretch), buttons pinned to the bottom */}
      <Box
        sx={{
          display: "grid",
          gap: 2.5,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "repeat(2, minmax(0, 1fr))",
          },
          alignItems: "stretch",
        }}
      >
        {/* Friend requests (incoming accept/decline + outgoing cancel) */}
        {hasRequests && (
          <PanelCard title={t("profile.friendRequests")}>
            <ProfileFriendRequests incoming={incoming} outgoing={outgoing} />
          </PanelCard>
        )}

        {/* Statistics — short lifetime numbers */}
        <PanelCard title={t("profile.stats")}>
          <Stack spacing={0.75} sx={{ flex: 1 }}>
            <StatLine
              label={t("profile.eggsHatched")}
              value={(metrics.eggsHatched ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.sciEarned")}
              value={(metrics.sciEarned ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.coinsEarned")}
              value={(metrics.coinsEarned ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.coinsSpent")}
              value={(metrics.coinsSpent ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.battles")}
              value={(metrics.battles ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.released")}
              value={(metrics.released ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.raids")}
              value={(metrics.raidsDone ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.raidLoot")}
              value={(metrics.raidLoot ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.hpSpent")}
              value={(metrics.hpSpent ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.feathersSpent")}
              value={(metrics.feathersSpent ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.sciSpent")}
              value={(metrics.sciSpent ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.eggsEarned")}
              value={(metrics.eggsEarned ?? 0).toLocaleString()}
            />
            <StatLine
              label={t("profile.potionsBought")}
              value={(metrics.potionsBought ?? 0).toLocaleString()}
            />
          </Stack>
        </PanelCard>

        {/* Achievements — 3 most recent + view all */}
        <PanelCard title={t("profile.achievements")}>
          <Stack spacing={1} sx={{ flex: 1 }}>
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
          </Stack>
          <Button
            component={Link}
            href={`/${user.id}/achievements`}
            variant="outlined"
            color="neutral"
            fullWidth
            sx={{ mt: 1.5 }}
          >
            {t("profile.allAchievements")}
          </Button>
        </PanelCard>

        {/* Friends — first 3 + all friends → /[id]/friends */}
        <PanelCard title={t("profile.friends")}>
          <Stack spacing={1} sx={{ flex: 1 }}>
            {friends.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("friends.empty")}
              </Typography>
            ) : (
              friends.slice(0, 3).map((f) => {
                const name =
                  [f.firstName, f.lastName].filter(Boolean).join(" ") ||
                  (f.username ? `@${f.username}` : String(f.id));
                return <PersonRow key={f.id} id={f.id} name={name} photoUrl={f.photoUrl} />;
              })
            )}
          </Stack>
          <Button
            component={Link}
            href={`/${user.id}/friends`}
            variant="outlined"
            color="neutral"
            fullWidth
            sx={{ mt: 1.5 }}
          >
            {t("profile.allFriends")}
          </Button>
        </PanelCard>

        {/* Referrals — players who registered via this user's invite link */}
        {referrals.length > 0 && (
          <PanelCard title={t("profile.referrals")}>
            <Stack spacing={1} sx={{ flex: 1 }}>
              {referrals.map((r) => {
                const rname =
                  [r.firstName, r.lastName].filter(Boolean).join(" ") ||
                  (r.username ? `@${r.username}` : String(r.id));
                return <PersonRow key={r.id} id={r.id} name={rname} photoUrl={r.photoUrl} />;
              })}
            </Stack>
          </PanelCard>
        )}
      </Box>
    </Stack>
  );
}

// A compact "label … value" row for the Statistics card.
function StatLine({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary" noWrap>
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ fontWeight: 700, fontVariantNumeric: "tabular-nums" }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

// A framed content panel — fills its grid cell (equal height) and lays children in
// a column so a trailing action button pins to the bottom.
function PanelCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
      <CardContent
        sx={{ flex: 1, display: "flex", flexDirection: "column", gap: 1.5 }}
      >
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        {children}
      </CardContent>
    </Card>
  );
}

function StatTile({
  img,
  icon,
  value,
  label,
}: {
  img?: string;
  icon?: string;
  value: string;
  label: string;
}) {
  return (
    <Card sx={{ height: "100%" }}>
      <CardContent
        sx={{
          p: 1.5,
          "&:last-child": { pb: 1.5 },
          textAlign: "center",
        }}
      >
        <Box sx={{ height: 22, display: "flex", justifyContent: "center", alignItems: "center" }}>
          {img ? (
            <Image
              src={img}
              alt=""
              width={24}
              height={24}
              style={{ height: 22, width: "auto" }}
            />
          ) : (
            <Typography component="span" sx={{ fontSize: 22, lineHeight: 1 }}>
              {icon}
            </Typography>
          )}
        </Box>
        <Typography
          sx={{
            fontWeight: 800,
            fontSize: "1.25rem",
            fontVariantNumeric: "tabular-nums",
            mt: 0.5,
          }}
          noWrap
        >
          {value}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {label}
        </Typography>
      </CardContent>
    </Card>
  );
}

function PersonRow({
  id,
  name,
  photoUrl,
}: {
  id: number;
  name: string;
  photoUrl: string | null;
}) {
  return (
    <Button
      component={Link}
      href={`/${id}`}
      color="neutral"
      sx={{ justifyContent: "flex-start", textTransform: "none", gap: 1, px: 1 }}
    >
      <UserAvatar photoUrl={photoUrl} name={name} sx={{ width: 28, height: 28 }} />
      <Typography variant="body2" noWrap>
        {name}
      </Typography>
    </Button>
  );
}
