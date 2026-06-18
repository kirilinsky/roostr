"use client";

import Box from "@mui/material/Box";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import { SKILLS } from "@/lib/roostr";
import {
  STAT_KIND_COLOR,
  STAT_KIND_LABEL_KEY,
  STAT_KIND_ORDER,
} from "@/lib/statKinds";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Legend for the stat colors: red = attack, blue = defense, green = utility.
// Lists the skills that fall under each kind with their descriptions.
export default function StatInfoModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();

  return (
    <Popup open={open} onClose={onClose} title={t("stats.kindsTitle")}>
      <Stack spacing={2}>
        {STAT_KIND_ORDER.map((kind) => {
          const skills = SKILLS.filter((s) => s.kind === kind);
          return (
            <Box key={kind}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    bgcolor: `${STAT_KIND_COLOR[kind]}.main`,
                    flexShrink: 0,
                  }}
                />
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                  {t(STAT_KIND_LABEL_KEY[kind])}
                </Typography>
              </Stack>
              <Stack spacing={0.5} sx={{ mt: 0.5, pl: 2.5 }}>
                {skills.map((s) => (
                  <Box key={s.id}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>
                      {s.name[locale]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.description[locale]}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Box>
          );
        })}
      </Stack>
    </Popup>
  );
}
