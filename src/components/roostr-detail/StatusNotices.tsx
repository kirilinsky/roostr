"use client";

import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { HydratedRoostr } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Owner-facing lock notices: bird is working (farm/lab/defense), freed to the wild,
// in gift limbo, or otherwise locked (e.g. on the market). At most one shows. The
// "return from work" action lives on the page (ReturnFromWorkButton), not here.
export default function StatusNotices({
  roostr,
  isOwner,
  locked,
  freedAt,
}: {
  roostr: HydratedRoostr;
  isOwner: boolean;
  locked: boolean;
  freedAt?: number;
}) {
  const t = useT();
  const locale = useLocale();
  if (!isOwner) return null;

  if (roostr.status === "working") {
    const kind = roostr.work?.kind;
    const isHospital = kind === "hospital";
    const stationLabel = t(
      kind === "farm"
        ? "nav.farm"
        : kind === "defense"
          ? "nav.defense"
          : isHospital
            ? "nav.hospital"
            : "nav.lab",
    );
    return (
      <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "tertiary.main" }}>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {isHospital ? "🏥" : "🔧"} {t("detail.atWork", { station: stationLabel })}
        </Typography>
      </Card>
    );
  }

  if (roostr.status === "released") {
    // Days on the loose since the last release (0 → shown as "<1").
    const days =
      freedAt != null ? Math.max(0, Math.floor((Date.now() - freedAt) / 86_400_000)) : null;
    return (
      <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "secondary.main" }}>
        <Stack spacing={0.25}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            🕊️ {t("detail.freed")}
          </Typography>
          {freedAt != null && (
            <Typography variant="caption" color="text.secondary">
              {t("detail.freedOn", {
                date: new Date(freedAt).toLocaleDateString(locale),
              })}{" "}
              · {t("detail.freeFor", { days: days && days > 0 ? days : "<1" })}
            </Typography>
          )}
        </Stack>
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
