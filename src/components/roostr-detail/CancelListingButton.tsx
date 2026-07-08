"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import { cancelListingAction } from "@/app/market/actions";
import { useT } from "@/i18n/I18nProvider";

// Detail-page action: pull your own live listing off the market early. The bird
// returns to "active". Rendered in the "listed" status notice for the owner.
export default function CancelListingButton({
  listingId,
  roostrId,
}: {
  listingId: string;
  roostrId: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, start] = useTransition();

  const cancel = () =>
    start(async () => {
      const res = await cancelListingAction(listingId, roostrId);
      if (res.ok) router.refresh();
    });

  return (
    <Button
      variant="contained"
      size="small"
      color="secondary"
      onClick={cancel}
      disabled={busy}
      sx={{ alignSelf: "flex-start" }}
    >
      {busy ? <CircularProgress size={18} color="inherit" /> : t("detail.cancelListing")}
    </Button>
  );
}
