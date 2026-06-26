import Link from "next/link";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionView from "@/components/CollectionView";
import { getSession } from "@/lib/auth";
import { getCollectionRoostrs, expireStaleGifts } from "@/db/queries";
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

  // Expire stale pending gifts first, so a bird that was sent but never answered
  // is back in the roster (status active) instead of stuck in "gifting" limbo.
  await expireStaleGifts();
  const rows = await getCollectionRoostrs(session.id);
  const roostrs = rows.map(hydrateRoostr);

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
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
          <CollectionView roostrs={roostrs} />
        )}
      </Stack>
    </Container>
  );
}
