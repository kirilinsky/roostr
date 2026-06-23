import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Link from "next/link";
import StationView from "@/components/StationView";
import { getSession } from "@/lib/auth";
import { getRoostrs, getStationView } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Laboratory — science from workers' Intellect (shared station engine). Server
// loads the station + available roster; StationView drives assign/claim.
export default async function LabPage() {
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

  const view = await getStationView(session.id, "lab");
  const workers = view.workers.map(hydrateRoostr);
  const available = (await getRoostrs(session.id)).map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="center"
          spacing={1}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography variant="h4" component="h1">
            {t("nav.lab")}
          </Typography>
          <Button
            component={Link}
            href="/lab/synthetic-genes"
            variant="outlined"
            color="secondary"
          >
            🧬 {t("lab.geneShop")}
          </Button>
        </Stack>
        <StationView
          kind="lab"
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
