import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// "Coming soon, launches at N players" gate for not-yet-built modes. Shows the
// real signup progress toward the threshold.
export default async function LaunchGate({
  titleKey,
  current,
  target,
}: {
  titleKey: string;
  current: number;
  target: number;
}) {
  const { t } = await getTranslations();
  const pct = Math.min(100, Math.round((current / target) * 100));

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          {t(titleKey)}
        </Typography>
        <Typography color="text.secondary">
          {t("launch.threshold", { target })}
        </Typography>

        <Box sx={{ width: "100%" }}>
          <LinearProgress
            variant="determinate"
            value={pct}
            sx={{ height: 14, borderRadius: 7 }}
          />
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block", fontVariantNumeric: "tabular-nums" }}
          >
            {t("launch.progress", { current, target })}
          </Typography>
        </Box>
      </Stack>
    </Container>
  );
}
