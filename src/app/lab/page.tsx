import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import LabView from "@/components/LabView";
import { getSession } from "@/lib/auth";
import { getRoostrs } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Laboratory (visual only): research progress + science/hour from attached
// workers. Server component pulls the owner's roostrs; LabView handles the UI.
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

  const roostrs = (await getRoostrs(session.id)).map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">
          {t("nav.lab")}
        </Typography>
        <LabView roostrs={roostrs} />
      </Stack>
    </Container>
  );
}
