import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AchievementBadge from "@/components/AchievementBadge";
import { PROFILE_ACHIEVEMENTS } from "@/lib/achievements";
import { getTranslations } from "@/i18n/server";

// Full achievements list for a user (by Telegram id). Unlock tracking isn't
// wired yet — everything is dummy (first one unlocked, the rest locked).
export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ telegramid: string }>;
}) {
  const { telegramid } = await params;
  const { t, locale } = await getTranslations();

  const items = PROFILE_ACHIEVEMENTS.map((a, i) => ({
    def: a,
    unlocked: i === 0,
  }));

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href={`/${telegramid}`}
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("achievements.back")}
        </Button>

        <Typography variant="h4" component="h1">
          {t("achievements.title")}
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
          {items.map(({ def, unlocked }) => (
            <AchievementBadge
              key={def.id}
              achievement={def}
              unlocked={unlocked}
              locale={locale}
            />
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
