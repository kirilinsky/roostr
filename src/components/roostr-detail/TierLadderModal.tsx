"use client";

import Box from "@mui/material/Box";
import Popup from "@/components/Popup";
import TierLadder from "@/components/TierLadder";
import { useT } from "@/i18n/I18nProvider";

// The tier ladder modal: the shared TierLadder readout with this bird's rating
// marker. Opened by clicking the level block / tier chip on the detail page.
// Pure readout — no actions.
export default function TierLadderModal({
  open,
  onClose,
  rating,
}: {
  open: boolean;
  onClose: () => void;
  rating: number;
}) {
  const t = useT();
  return (
    <Popup open={open} onClose={onClose} title={t("detail.tierLadderTitle")} maxWidth="xs">
      <Box sx={{ pt: 1 }}>
        <TierLadder rating={rating} caption={t("detail.tierCurrentPos")} />
      </Box>
    </Popup>
  );
}
