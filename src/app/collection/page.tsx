import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import { getSession } from "@/lib/auth";
import { getRoostrs } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// User's roosters, minimal cards (avatar + name + breed + level). Server
// component: reads the session, pulls the owner's roostrs, rehydrates each row
// into a model. Stats stay hidden here — this is the roster overview.
export default async function CollectionPage() {
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

  const rows = await getRoostrs(session.id);
  const roostrs = rows.map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("collection.title")}
        </Typography>

        {roostrs.length === 0 ? (
          <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
            <Typography color="text.secondary">{t("collection.empty")}</Typography>
            <Button component={Link} href="/incubator" variant="contained">
              {t("collection.emptyCta")}
            </Button>
          </Stack>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: {
                xs: "repeat(2, 1fr)",
                sm: "repeat(3, 1fr)",
                md: "repeat(4, 1fr)",
              },
            }}
          >
            {roostrs.map((r) => (
              <CollectionCard key={r.id ?? r.seed} roostr={r} />
            ))}
          </Box>
        )}
      </Stack>
    </Container>
  );
}
