import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import MarketView, { type MarketListing } from "@/components/MarketView";
import { getSession } from "@/lib/auth";
import { getActiveListings } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Market: every live offer (active, not expired), soonest-ending first. Listing
// rows are joined to their roostr and hydrated. Buying isn't wired yet, so until
// the list/buy actions land this is empty (shows the "no listings" message).
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

  const rows = await getActiveListings();
  const listings: MarketListing[] = rows.map(({ listing, roostr }) => ({
    roostr: hydrateRoostr(roostr),
    price: listing.price,
    expiresAt: listing.expiresAt.getTime(),
  }));

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" component="h1">
          {t("nav.market")}
        </Typography>
        {listings.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 6 }}>
            {t("market.empty")}
          </Typography>
        ) : (
          <MarketView listings={listings} />
        )}
      </Stack>
    </Container>
  );
}
