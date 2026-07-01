import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import HospitalView from "@/components/HospitalView";
import { getSession } from "@/lib/auth";
import { getHospitalView } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Hospital — heal hurt birds over time (per-bird, paced by Recovery). Server loads
// the ward + admittable hurt birds; HospitalView drives admit/discharge.
export default async function HospitalPage() {
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

  const view = await getHospitalView(session.id);
  const patients = view.patients.map(hydrateRoostr);
  const injured = view.injured.map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h4" component="h1">
            {t("nav.hospital")}
          </Typography>
          <Typography color="text.secondary">{t("hospital.desc")}</Typography>
        </Box>
        <HospitalView patients={patients} injured={injured} slots={view.slots} />
      </Stack>
    </Container>
  );
}
