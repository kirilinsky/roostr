import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import StationView from "@/components/StationView";
import { getSession } from "@/lib/auth";
import { getRoostrs, getStationView } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Farm — egg production from workers' Fertility (shared station engine). Server
// loads the station + available roster; StationView drives assign/claim.
export default async function FarmPage() {
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

  const view = await getStationView(session.id, "farm");
  const workers = view.workers.map(hydrateRoostr);
  const available = (await getRoostrs(session.id)).map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">
          {t("nav.farm")}
        </Typography>
        <StationView
          kind="farm"
          workers={workers}
          available={available}
          pending={view.pending}
          lastSettleAtMs={view.lastSettleAtMs}
          slotsOwned={view.slotsOwned}
        />
      </Stack>
    </Container>
  );
}
