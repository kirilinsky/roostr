import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// "Coming soon, launches at N players" gate for not-yet-built modes. Shows the real
// signup progress toward the threshold. With `bg`, the launch info sits inside a
// hero card with that background art (like the farm/lab station blocks); the title
// stays OUTSIDE the image, as a normal page heading.
export default async function LaunchGate({
  titleKey,
  current,
  target,
  bg,
}: {
  titleKey: string;
  current: number;
  target: number;
  bg?: string;
}) {
  const { t } = await getTranslations();
  const pct = Math.min(100, Math.round((current / target) * 100));

  // Threshold + progress (no title). On mobile over the art, a paper panel keeps it
  // readable; desktop is transparent (text over the art, like the lab hero).
  const launchInfo = (
    <Stack
      spacing={2}
      alignItems="center"
      textAlign="center"
      sx={{
        position: "relative",
        zIndex: 1,
        width: "100%",
        maxWidth: 440,
        bgcolor: bg ? { xs: "background.paper", md: "transparent" } : "transparent",
        borderRadius: bg ? { xs: 2, md: 0 } : 0,
        p: bg ? { xs: 2, md: 0 } : 0,
      }}
    >
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
  );

  // Plain centered gate (no bg art).
  if (!bg) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Stack spacing={3} alignItems="center" textAlign="center">
          <Typography variant="h4" component="h1">
            {t(titleKey)}
          </Typography>
          {launchInfo}
        </Stack>
      </Container>
    );
  }

  // Full-width hero with background art; title above the image.
  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={2.5}>
        <Typography variant="h4" component="h1">
          {t(titleKey)}
        </Typography>
        <Card
          sx={{
            position: "relative",
            overflow: "hidden",
            minHeight: { xs: 300, md: 380 },
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: { xs: 2, md: "5%" },
          }}
        >
          {/* bg layer — stretch-to-fill on desktop, cover on mobile (lab/farm style) */}
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              inset: 0,
              zIndex: 0,
              backgroundImage: `url(${bg})`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "center",
              backgroundSize: { xs: "cover", md: "100% 100%" },
            }}
          />
          {launchInfo}
        </Card>
      </Stack>
    </Container>
  );
}
