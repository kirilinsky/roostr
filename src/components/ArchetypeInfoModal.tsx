"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import {
  ARCHETYPES,
  FAMILIES,
  roleLabel,
  skillLabel,
  type Gene,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

const FAMILY = Object.fromEntries(FAMILIES.map((f) => [f.id, f]));
const ARCH = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a]));

// Explains archetypes in general, then why THIS rooster got its archetype
// (derived from its genes' families: a Work gene + a combat/util gene → Hybrid;
// otherwise the most-represented family decides the role).
export default function ArchetypeInfoModal({
  roleId,
  genes,
  open,
  onClose,
}: {
  roleId: string;
  genes: Gene[];
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const arch = ARCH[roleId];

  const families = genes.map((g) => g.family);
  const hasWork = families.includes("Work");
  const hasOther = families.some((f) => f !== "Work");
  const isHybrid = roleId === "Hybrid" || (hasWork && hasOther);

  const counts = new Map<string, number>();
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1);
  const dominant = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const dominantName = dominant ? FAMILY[dominant]?.name[locale] ?? dominant : "";

  return (
    <Popup open={open} onClose={onClose} title={roleLabel(roleId, locale)}>
      <Stack spacing={2}>
        <Typography variant="body2">{t("archetype.intro")}</Typography>

        {arch && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              {t("archetype.profile")}
            </Typography>
            {arch.families.length > 0 && (
              <Typography variant="body2">
                {t("archetype.families")}:{" "}
                {arch.families
                  .map((f) => FAMILY[f]?.name[locale] ?? f)
                  .join(" · ")}
              </Typography>
            )}
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {arch.strengths.map((s) => (
                <Chip
                  key={s}
                  size="small"
                  variant="outlined"
                  color="success"
                  label={`+ ${skillLabel(s, locale)}`}
                />
              ))}
              {arch.weaknesses.map((s) => (
                <Chip
                  key={s}
                  size="small"
                  variant="outlined"
                  color="error"
                  label={`− ${skillLabel(s, locale)}`}
                />
              ))}
            </Stack>
          </Box>
        )}

        <Divider />

        <Box>
          <Typography variant="overline" color="text.secondary">
            {t("archetype.why")}
          </Typography>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
            {genes.map((g) => (
              <Chip
                key={g.id}
                size="small"
                variant="outlined"
                label={`${g.name[locale]} · ${FAMILY[g.family]?.name[locale] ?? g.family}`}
                sx={{ borderColor: FAMILY[g.family]?.color, borderWidth: 2 }}
              />
            ))}
          </Stack>
          <Typography variant="body2" sx={{ mt: 1 }}>
            {isHybrid
              ? t("archetype.whyHybrid")
              : t("archetype.whyDominant", {
                  family: dominantName,
                  role: roleLabel(roleId, locale),
                })}
          </Typography>
        </Box>
      </Stack>
    </Popup>
  );
}
