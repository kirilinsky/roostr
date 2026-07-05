import Container from "@mui/material/Container";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LaunchGate from "@/components/LaunchGate";
import RaidsView from "@/components/RaidsView";
import { getSession } from "@/lib/auth";
import { isAdmin } from "@/lib/admin";
import { countUsers, getRoostrs, getRaidSlots, getRaidCandidates } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { RAID_BOTS } from "@/lib/raids";
import { getTranslations } from "@/i18n/server";

const LAUNCH_AT_PLAYERS = 14;

// Raids (Coop & Dagger). DEV: admins get the live phase-1 window (party staging +
// slot buy vs a bot target); everyone else still sees the coming-soon LaunchGate.
export default async function RaidsPage() {
  const session = await getSession();

  if (session && isAdmin(session.id)) {
    const { t } = await getTranslations();
    const available = (await getRoostrs(session.id))
      .map(hydrateRoostr)
      .filter((r) => r.status === "active");
    const slotsOwned = await getRaidSlots(session.id);
    // Emulated matchmaking (phase 1, admin): candidate list = a few random REAL
    // players without immunity + the bot roster; the admin PICKS one in the UI.
    const players = await getRaidCandidates(session.id);
    const targets = RAID_BOTS;

    return (
      <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
        <Stack spacing={3}>
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="h4" component="h1">
              {t("nav.raids")}
            </Typography>
            <Chip size="small" color="secondary" label={t("raids.devBadge")} sx={{ fontWeight: 800 }} />
          </Stack>
          <RaidsView
            available={available}
            slotsOwned={slotsOwned}
            targets={targets}
            players={players}
          />
        </Stack>
      </Container>
    );
  }

  const current = await countUsers();
  return (
    <LaunchGate
      titleKey="nav.raids"
      current={current}
      target={LAUNCH_AT_PLAYERS}
      bg="/bg/raids.png"
    />
  );
}
