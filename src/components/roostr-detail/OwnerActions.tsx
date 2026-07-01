"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Popup from "@/components/Popup";
import SellRoostrForm from "@/components/SellRoostrForm";
import GiftRoostrButton, { type GiftFriend } from "@/components/GiftRoostrButton";
import type { HydratedRoostr } from "@/lib/roostr";
import { releaseRoostrAction } from "@/app/collection/[id]/actions";
import { syncProfileAchievementsAction } from "@/app/achievements/actions";
import { useAchievementToasts } from "@/hooks/useAchievementToasts";
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
  const router = useRouter();
  const [sellOpen, setSellOpen] = useState(false);
  const [busy, start] = useTransition();
  const toastAchievements = useAchievementToasts();

  // Release = set the bird free, irreversible. Confirm, then release + sync the
  // profile "released" achievements (toast any new). The freed rooster achievement
  // records on the page refresh.
  const release = () => {
    if (!window.confirm(t("detail.releaseConfirm"))) return;
    start(async () => {
      const res = await releaseRoostrAction(roostrId);
      if (res.ok) {
        const newly = await syncProfileAchievementsAction();
        toastAchievements(newly);
        router.refresh();
      }
    });
  };

  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
        <Button variant="contained" onClick={() => setSellOpen(true)} disabled={busy}>
          {t("detail.sell")}
        </Button>
        <GiftRoostrButton roostrId={roostrId} friends={friends} />
        <Button variant="outlined" color="neutral" onClick={release} disabled={busy}>
          {busy ? <CircularProgress size={20} color="inherit" /> : t("detail.release")}
        </Button>
      </Stack>

      <Popup open={sellOpen} onClose={() => setSellOpen(false)} title={t("detail.sellTitle")}>
        <SellRoostrForm roostr={roostr} />
      </Popup>
    </Card>
  );
}
