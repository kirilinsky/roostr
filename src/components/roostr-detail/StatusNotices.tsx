"use client";

import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

// Owner-facing lock notices: bird is working (farm/lab), in gift limbo, or
// otherwise locked (e.g. on the market). At most one shows.
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
    return (
      <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "tertiary.main" }}>
        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          useFlexGap
        >
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            🔧{" "}
            {t("detail.atWork", {
              station: t(roostr.work?.kind === "farm" ? "nav.farm" : "nav.lab"),
            })}
          </Typography>
          <Button variant="contained" onClick={() => window.alert(t("detail.sellBlocked"))}>
            {t("detail.sell")}
          </Button>
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
