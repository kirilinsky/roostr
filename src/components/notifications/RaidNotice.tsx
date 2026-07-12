"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useT } from "@/i18n/I18nProvider";

// The raid party is back with the haul → "come collect it". Ephemeral (clears
// itself once collected), mirrors HospitalNotice.
export default function RaidNotice() {
  const t = useT();
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="body1">🗡 {t("notifications.raidReady")}</Typography>
          <Button
            component={Link}
            href="/raids"
            variant="contained"
            sx={{ alignSelf: "flex-start" }}
          >
            {t("raids.collect")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
