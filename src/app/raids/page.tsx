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
  listRaidTargets,
} from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { raidBotById, anonCoopName } from "@/lib/raids";
import { featherState } from "@/lib/feathers";
import { getTranslations } from "@/i18n/server";

// Display-ready target name for the log/banner: bot flavor, or an anonymized coop
// for a real player (identity stays hidden on the attacker's side).
function targetLabel(
  defenderUserId: number | null,
  botId: string | null,
): { en: string; ru: string } {
  if (defenderUserId != null) return anonCoopName(defenderUserId);
  return raidBotById(botId ?? "")?.name ?? { en: "Coop", ru: "Двор" };
}

// Raids (Coop & Dagger) — PvP: assemble a party, pick a target (bot coop OR a real
// player's anonymized coop), launch (1 feather), wait out the timer, Collect.
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

  const [roostrs, slotsOwned, activeRaid, history, me, targets] = await Promise.all([
    getRoostrs(session.id),
    getRaidSlots(session.id),
    getActiveRaid(session.id),
    getRaidHistory(session.id),
    getUserById(session.id),
    listRaidTargets(session.id),
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
          targets={targets}
          feathers={feathers}
          history={history.map((h) => ({
            id: h.id,
            targetName: targetLabel(h.defenderUserId, h.botId),
            isPvp: h.defenderUserId != null,
            success: h.success ?? false,
            lootCoins: h.lootCoins ?? 0,
            lootEggs: h.lootEggs ?? 0,
            at: (h.resolvedAt ?? h.startedAt).getTime(),
          }))}
          activeRaid={
            activeRaid
              ? {
                  id: activeRaid.id,
                  targetName: targetLabel(activeRaid.defenderUserId, activeRaid.botId),
                  isPvp: activeRaid.defenderUserId != null,
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
