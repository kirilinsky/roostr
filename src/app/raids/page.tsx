import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RaidsView from "@/components/RaidsView";
import { getSession } from "@/lib/auth";
import {
  getRoostrs,
  getRaidSlots,
  getActiveRaid,
  getRaidHistory,
  getUserById,
} from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { RAID_BOTS } from "@/lib/raids";
import { featherState } from "@/lib/feathers";
import { getTranslations } from "@/i18n/server";

// Raids (Coop & Dagger) — PHASE 2, open to everyone: assemble a party, pick a BOT
// target, launch (1 feather), wait out the timer, Collect. Real-player targets
// (PvP, shields, victim notifications) are phase 3 — bots only for now.
export default async function RaidsPage() {
  const { t } = await getTranslations();
  const session = await getSession();

  if (!session) {
    return (
      <Container maxWidth="sm" sx={{ py: 8 }}>
        <Typography color="text.secondary" textAlign="center">
          {t("collection.guest")}
        </Typography>
      </Container>
    );
  }

  const [roostrs, slotsOwned, activeRaid, history, me] = await Promise.all([
    getRoostrs(session.id),
    getRaidSlots(session.id),
    getActiveRaid(session.id),
    getRaidHistory(session.id),
    getUserById(session.id),
  ]);
  const available = roostrs.map(hydrateRoostr).filter((r) => r.status === "active");
  const feathers = me
    ? featherState(
        me.feathers,
        me.featherMax,
        new Date(me.feathersAt).getTime(),
        Date.now(),
      ).current
    : 0;

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("nav.raids")}
        </Typography>
        <RaidsView
          available={available}
          slotsOwned={slotsOwned}
          targets={RAID_BOTS}
          feathers={feathers}
          history={history.map((h) => ({
            id: h.id,
            botId: h.botId ?? "",
            success: h.success ?? false,
            lootCoins: h.lootCoins ?? 0,
            lootEggs: h.lootEggs ?? 0,
            at: (h.resolvedAt ?? h.startedAt).getTime(),
          }))}
          activeRaid={
            activeRaid
              ? {
                  id: activeRaid.id,
                  botId: activeRaid.botId ?? "",
                  endsAt: activeRaid.endsAt.getTime(),
                  power: activeRaid.raidPowerSnapshot,
                  defense: activeRaid.defenseSnapshot,
                  luck: activeRaid.luckSnapshot,
                  pool: activeRaid.targetPool,
                  partySize: (activeRaid.partyRoostrIds ?? []).length,
                }
              : null
          }
        />
      </Stack>
    </Container>
  );
}
