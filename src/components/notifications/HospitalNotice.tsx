"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useT } from "@/i18n/I18nProvider";

// N patients fully healed and waiting on their beds → "come collect them".
export default function HospitalNotice({ ready }: { ready: number }) {
  const t = useT();
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="body1">
            🏥 {t("notifications.hospitalReady", { n: ready })}
          </Typography>
          <Button
            component={Link}
            href="/hospital"
            variant="contained"
            sx={{ alignSelf: "flex-start" }}
          >
            {t("hospital.collect")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
