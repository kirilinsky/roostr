"use client";

import { useState } from "react";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Popup from "@/components/Popup";
import SellRoostrForm from "@/components/SellRoostrForm";
import GiftRoostrButton, { type GiftFriend } from "@/components/GiftRoostrButton";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

// Owner action bar (active bird only): sell / gift / release, plus the sell modal.
export default function OwnerActions({
  roostr,
  roostrId,
  friends,
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  friends: GiftFriend[];
}) {
  const t = useT();
  const [sellOpen, setSellOpen] = useState(false);

  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="contained" onClick={() => setSellOpen(true)}>
          {t("detail.sell")}
        </Button>
        <GiftRoostrButton roostrId={roostrId} friends={friends} />
        <Button
          variant="outlined"
          color="neutral"
          disabled
          endIcon={<Chip label={t("pedia.soon")} size="small" variant="outlined" />}
        >
          {t("detail.release")}
        </Button>
      </Stack>

      <Popup open={sellOpen} onClose={() => setSellOpen(false)} title={t("detail.sellTitle")}>
        <SellRoostrForm roostr={roostr} />
      </Popup>
    </Card>
  );
}
