import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FriendButton from "@/components/FriendButton";
import CollectionCard from "@/components/CollectionCard";
import OwnProfile from "@/components/OwnProfile";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";
import { getUserById, getFriendship, getRoostrs } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";

// Public profile reachable via the shared link: /<telegramId>. Single-segment
// dynamic route — static routes (/market, /collection, …) win, so it only catches
// leftover ids. Own profile → <OwnProfile> (cards grid); others → centered header
// + (public) catalog.
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

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      {isOwnProfile ? (
        <OwnProfile user={user} />
      ) : (
        // Other player's profile: centered identity + coins + friend control.
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

          {viewerId && (
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
        </Stack>
      )}

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
