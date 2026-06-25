import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import DefenseView from "@/components/DefenseView";
import { getSession } from "@/lib/auth";
import { getRoostrs, getStationView } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Base defense (дозор) — Crow guards summed live, no accrual. Server loads the
// defense station + the assignable roster; DefenseView drives assign/remove/buy.
export default async function DefensePage() {
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

  const view = await getStationView(session.id, "defense");
  const workers = view.workers.map(hydrateRoostr);
  const available = (await getRoostrs(session.id)).map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("nav.defense")}
        </Typography>
        <DefenseView
          workers={workers}
          available={available}
          slotsOwned={view.slotsOwned}
        />
      </Stack>
    </Container>
  );
}
