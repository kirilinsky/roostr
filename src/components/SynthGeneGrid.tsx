"use client";

import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneIcon from "@/components/SynthGeneIcon";
import StatModBadges from "@/components/StatModBadges";
import { SYNTH_GENES, skillLabel } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { MONO_FONT } from "@/lib/tokens";

// Shared synthetic-gene catalog grid — rendered both in the lab gene shop and the
// Roostrpedia synth-genes article so the two never drift. Read-only.
export default function SynthGeneGrid() {
  const locale = useLocale();
  const t = useT();
  const genes = [...SYNTH_GENES].sort((a, b) => a.no - b.no);

  return (
    <Box
      sx={{
        display: "grid",
        gap: 2,
        gridTemplateColumns: {
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          lg: "repeat(3, 1fr)",
        },
      }}
    >
      {genes.map((g) => (
        <Card
          key={g.id}
          sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}
        >
          <Stack direction="row" alignItems="center" spacing={1}>
            <SynthGeneIcon no={g.no} size={75} />
            <Box sx={{ minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                <Box
                  component="span"
                  sx={{ fontFamily: MONO_FONT, color: "text.secondary", mr: 0.5 }}
                >
                  #{String(g.no).padStart(2, "0")}
                </Box>
                {g.name[locale]}
              </Typography>
              <Chip
                label={t("lab.synthTag")}
                size="small"
                color="secondary"
                sx={{ height: 18, fontSize: 11, fontWeight: 700 }}
              />
            </Box>
          </Stack>

          <StatModBadges mods={g.statMods} locale={locale} />

          <Typography variant="caption" color="text.secondary" component="div">
            {t("pedia.genes.boosts")}: {skillLabel(g.skill, locale)}
          </Typography>
          <Typography variant="caption" sx={{ fontStyle: "italic" }}>
            {g.lore[locale]}
          </Typography>
        </Card>
      ))}
    </Box>
  );
}
