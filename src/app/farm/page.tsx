import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import FarmView from "@/components/FarmView";
import { getSession } from "@/lib/auth";
import { getRoostrs } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Farm (visual only): egg production from attached workers' Fertility. Server
// component pulls the owner's roostrs; FarmView handles the UI.
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

  const roostrs = (await getRoostrs(session.id)).map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Typography variant="h4" component="h1">
          {t("nav.farm")}
        </Typography>
        <FarmView roostrs={roostrs} />
      </Stack>
    </Container>
  );
}
