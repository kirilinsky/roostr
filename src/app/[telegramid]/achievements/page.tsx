import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import AchievementBadge from "@/components/AchievementBadge";
import { PROFILE_ACHIEVEMENTS, evaluate } from "@/lib/achievements";
import { getProfileMetrics, getAchievementUnlocks } from "@/db/queries";
import { getTranslations } from "@/i18n/server";

// Full achievements list for a user (by Telegram id). Unlock state is derived
// live from that player's metrics; achievements for not-yet-wired metrics stay
// locked. (Persisted unlocks + toast-on-unlock are tracked in the roadmap.)
export default async function AchievementsPage({
  params,
}: {
  params: Promise<{ telegramid: string }>;
}) {
  const { telegramid } = await params;
  const { t, locale } = await getTranslations();

  const id = Number(telegramid);
  const metrics = Number.isFinite(id) ? await getProfileMetrics(id) : null;
  const statuses = evaluate(PROFILE_ACHIEVEMENTS, metrics ?? {});
  const unlocks = Number.isFinite(id) ? await getAchievementUnlocks(id) : [];
  const unlockedAt = new Map(unlocks.map((u) => [u.achievementId, u.unlockedAt]));
  // Earned = persisted unlock OR currently satisfied (a view before the next sync).
  const items = statuses.map((s) => ({
    def: s.def,
    unlocked: unlockedAt.has(s.def.id) || s.unlocked,
    at: unlockedAt.get(s.def.id),
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
          {items.map(({ def, unlocked, at }) => (
            <AchievementBadge
              key={def.id}
              achievement={def}
              unlocked={unlocked}
              unlockedNote={
                at
                  ? t("achievements.unlockedOn", {
                      date: new Date(at).toLocaleDateString(locale),
                    })
                  : undefined
              }
              locale={locale}
            />
          ))}
        </Box>
      </Stack>
    </Container>
  );
}
