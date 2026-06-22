"use client";

import { useState, useTransition } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import FormControlLabel from "@mui/material/FormControlLabel";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import { setCollectionPublicAction } from "@/app/settings/actions";
import { useT } from "@/i18n/I18nProvider";

// Player settings. Privacy: toggle whether other users can see your collection.
// Optimistic — flips immediately, reverts if the server write fails.
export default function SettingsView({
  collectionPublic,
}: {
  collectionPublic: boolean;
}) {
  const t = useT();
  const [on, setOn] = useState(collectionPublic);
  const [pending, start] = useTransition();

  function toggle(next: boolean) {
    setOn(next);
    start(async () => {
      const res = await setCollectionPublicAction(next);
      if (!res.ok) setOn(!next); // revert on failure
      else if (typeof res.value === "boolean") setOn(res.value);
    });
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {t("settings.privacy")}
        </Typography>
        <Stack sx={{ mt: 0.5 }}>
          <FormControlLabel
            control={
              <Switch
                checked={on}
                disabled={pending}
                onChange={(e) => toggle(e.target.checked)}
              />
            }
            label={t("settings.collectionPublic")}
          />
          <Typography variant="caption" color="text.secondary">
            {t("settings.collectionPublicHint")}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
