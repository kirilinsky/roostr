import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MarketView, { type MarketListing } from "@/components/MarketView";
import { getSession } from "@/lib/auth";
import { getActiveListings, getUserById, expireStaleListings } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Market: every live offer (active, not expired), soonest-ending first. Listing
// rows are joined to their roostr and hydrated. Expired-but-unswept listings are
// returned to their sellers first so the board is fresh.
export default async function MarketPage() {
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

  await expireStaleListings(); // lazy sweep: return timed-out birds to sellers
  const [rows, me] = await Promise.all([
    getActiveListings(),
    getUserById(session.id),
  ]);
  const listings: MarketListing[] = rows.map(({ listing, roostr }) => ({
    id: listing.id,
    roostr: hydrateRoostr(roostr),
    price: listing.price,
    sellerId: listing.sellerId,
    expiresAt: listing.expiresAt.getTime(),
  }));

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("nav.market")}
        </Typography>
        {listings.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
            {t("market.empty")}
          </Typography>
        ) : (
          <MarketView listings={listings} myId={session.id} coins={me?.coins ?? 0} />
        )}
      </Stack>
    </Container>
  );
}
