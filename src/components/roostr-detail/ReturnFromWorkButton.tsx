"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import type { StationKind } from "@/lib/stations";
import { removeWorkerAction } from "@/app/stations/actions";
import { dischargeFromHospitalAction } from "@/app/hospital/actions";
import { useT } from "@/i18n/I18nProvider";

// Page-level action: pull a working bird off its post. Stations (farm/lab/defense)
// go through removeWorker (settles the station); the hospital goes through discharge
// (settles healed HP). Both unlock the bird back to active.
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
  const isHospital = kind === "hospital";

  const returnFromWork = () =>
    start(async () => {
      const res = isHospital
        ? await dischargeFromHospitalAction(roostrId)
        : await removeWorkerAction(kind as StationKind, roostrId);
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
        t(isHospital ? "hospital.discharge" : "detail.returnFromWork")
      )}
    </Button>
  );
}
