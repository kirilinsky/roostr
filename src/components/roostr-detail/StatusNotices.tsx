"use client";

import Card from "@mui/material/Card";
import Typography from "@mui/material/Typography";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

// Owner-facing lock notices: bird is working (farm/lab/defense), in gift limbo, or
// otherwise locked (e.g. on the market). At most one shows. The "return from work"
// action lives on the page (ReturnFromWorkButton), not in this notice.
export default function StatusNotices({
  roostr,
  isOwner,
  locked,
}: {
  roostr: HydratedRoostr;
  isOwner: boolean;
  locked: boolean;
}) {
  const t = useT();
  if (!isOwner) return null;

  if (roostr.status === "working") {
    const kind = roostr.work?.kind;
    const stationLabel = t(
      kind === "farm" ? "nav.farm" : kind === "defense" ? "nav.defense" : "nav.lab",
    );
    return (
      <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "tertiary.main" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          🔧 {t("detail.atWork", { station: stationLabel })}
        </Typography>
      </Card>
    );
  }

  if (roostr.status === "gifting") {
    return (
      <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "secondary.main" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          🎁 {t("detail.giftPending")}
        </Typography>
      </Card>
    );
  }

  if (locked) {
    return (
      <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "tertiary.main" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          🔒 {t("detail.locked")}
        </Typography>
      </Card>
    );
  }
  return null;
}
