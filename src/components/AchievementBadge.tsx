import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type { Achievement } from "@/lib/achievements";
import type { Locale } from "@/i18n/config";

// One achievement tile. Locked = dimmed + greyscale icon. Plain component (no
// hooks) so it renders on the server from a passed locale.
export default function AchievementBadge({
  achievement,
  unlocked,
  locale,
}: {
  achievement: Achievement;
  unlocked: boolean;
  locale: Locale;
}) {
  return (
    <Card
      sx={{
        p: 1.5,
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        opacity: unlocked ? 1 : 0.55,
      }}
    >
      <Typography
        component="span"
        sx={{ fontSize: 30, lineHeight: 1, filter: unlocked ? "none" : "grayscale(1)" }}
      >
        {achievement.icon}
      </Typography>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }} noWrap>
          {achievement.name[locale]}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="div">
          {achievement.desc[locale]}
        </Typography>
      </Box>
    </Card>
  );
}
