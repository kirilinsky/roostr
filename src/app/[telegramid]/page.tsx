import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";
import { getUserById } from "@/db/queries";

// Public profile reachable via the shared link: /<telegramId>. Single-segment
// dynamic route — static routes (/friends, /market, …) win, so it only catches
// leftover ids.
export default async function PublicProfilePage({
  params,
}: {
  params: Promise<{ telegramid: string }>;
}) {
  const { telegramid } = await params;
  const { t } = await getTranslations();
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

  return (
    <Container maxWidth="sm" sx={{ py: 6 }}>
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
      </Stack>
    </Container>
  );
}
