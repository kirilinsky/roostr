"use client";

import Link from "next/link";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useT } from "@/i18n/I18nProvider";

// A station whose buffer filled up → "come claim it" with a link to the station.
export default function StationNotice({ kind }: { kind: "farm" | "lab" }) {
  const t = useT();
  return (
    <Card>
      <CardContent>
        <Stack spacing={1.5}>
          <Typography variant="body1">
            🔔 {t(kind === "farm" ? "notifications.farmFull" : "notifications.labFull")}
          </Typography>
          <Button
            component={Link}
            href={`/${kind}`}
            variant="contained"
            sx={{ alignSelf: "flex-start" }}
          >
            {t("station.claim")}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
