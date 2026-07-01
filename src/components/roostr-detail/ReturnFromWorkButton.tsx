"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import type { StationKind } from "@/lib/stations";
import { removeWorkerAction } from "@/app/stations/actions";
import { useT } from "@/i18n/I18nProvider";

// Page-level action: pull a working bird off its station (farm/lab/defense). Reuses
// removeWorker — settles that station's stats, unlocks the bird back to active.
export default function ReturnFromWorkButton({
  roostrId,
  kind,
}: {
  roostrId: string;
  kind?: string;
}) {
  const t = useT();
  const router = useRouter();
  const [busy, start] = useTransition();

  if (!kind) return null;

  const returnFromWork = () =>
    start(async () => {
      const res = await removeWorkerAction(kind as StationKind, roostrId);
      if (res?.ok) router.refresh();
    });

  return (
    <Button
      variant="contained"
      onClick={returnFromWork}
      disabled={busy}
      sx={{ alignSelf: "flex-start" }}
    >
      {busy ? (
        <CircularProgress size={20} color="inherit" />
      ) : (
        t("detail.returnFromWork")
      )}
    </Button>
  );
}
