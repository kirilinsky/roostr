"use client";

import { useState, useTransition } from "react";
import { keyframes } from "@emotion/react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneIcon from "@/components/SynthGeneIcon";
import StatModBadges from "@/components/StatModBadges";
import {
  SYNTH_GENE_MAX_SLOTS,
  SYNTH_GENE_MAX_LEVEL,
  synthGeneLevelOf,
  synthGeneUpgradeCost,
  skillLabel,
  type HydratedRoostr,
} from "@/lib/roostr";
import { upgradeSynthGeneAction } from "@/app/collection/[id]/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

const successPulse = keyframes`
  0% { transform: scale(1); }
  45% { transform: scale(1.06); filter: brightness(1.25); }
  100% { transform: scale(1); filter: brightness(1); }
`;

// The synth genes spliced into a bird + their upgrade controls. Upgrading costs
// SCIENCE on a steep curve (synthGeneUpgradeCost). Read-only when not the owner /
// not a roster bird (canUpgrade false). Mirrors GeneUpgradeGrid for the rolled DNA.
export default function SynthGeneStrip({
  roostr,
  roostrId,
  sci,
  isOwner,
  canUpgrade,
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  sci: number;
  isOwner: boolean;
  canUpgrade: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const genes = roostr.synthGenes;
  const [pending, startTransition] = useTransition();
  const [busyGene, setBusyGene] = useState<string | null>(null);
  const [flashGene, setFlashGene] = useState<string | null>(null);

  function upgrade(geneId: string) {
    setBusyGene(geneId);
    startTransition(async () => {
      const res = await upgradeSynthGeneAction(roostrId, geneId);
      setBusyGene(null);
      if (res?.ok) {
        setFlashGene(geneId);
        window.setTimeout(() => setFlashGene((g) => (g === geneId ? null : g)), 600);
      }
    });
  }

  return (
    <Stack spacing={1.5}>
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography variant="h5" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
          {t("detail.synthGenes")}
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          {isOwner && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {sci.toLocaleString()}
              </Typography>
              <Image src="/sci.png" alt="" width={18} height={18} style={{ height: 16, width: "auto" }} />
            </Stack>
          )}
          <Chip
            label={`${genes.length} / ${SYNTH_GENE_MAX_SLOTS}`}
            size="small"
            color="secondary"
            variant="outlined"
            sx={{ fontWeight: 800 }}
          />
        </Stack>
      </Stack>

      {genes.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {t("detail.synthEmpty")}
        </Typography>
      ) : (
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: {
              xs: "minmax(0, 1fr)",
              sm: "repeat(2, minmax(0, 1fr))",
            },
          }}
        >
          {genes.map((g) => {
            const level = synthGeneLevelOf(roostr.synthGeneLevels, g.id);
            const maxed = level >= SYNTH_GENE_MAX_LEVEL;
            const cost = synthGeneUpgradeCost(level);
            const canAfford = sci >= cost;
            const busy = pending && busyGene === g.id;
            const disabled = maxed || !canAfford || busy;
            return (
              <Card key={g.id} sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <SynthGeneIcon no={g.no} size={56} />
                  <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                      {g.name[locale]}
                    </Typography>
                    <Stack direction="row" spacing={0.75} alignItems="center">
                      <Chip
                        label={`${t("detail.lvl")} ${level}`}
                        size="small"
                        variant="outlined"
                      />
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {skillLabel(g.skill, locale)}
                      </Typography>
                    </Stack>
                  </Box>
                </Stack>

                <StatModBadges mods={g.statMods} locale={locale} />

                {canUpgrade && (
                  <Button
                    variant="contained"
                    size="small"
                    color="secondary"
                    disabled={disabled}
                    onClick={() => upgrade(g.id)}
                    sx={flashGene === g.id ? { animation: `${successPulse} 0.6s ease` } : undefined}
                  >
                    {busy ? (
                      <CircularProgress size={18} color="inherit" />
                    ) : (
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <span>{maxed ? t("detail.maxLevel") : t("detail.upgrade")}</span>
                        {!maxed && (
                          <Box
                            component="span"
                            sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, opacity: 0.9 }}
                          >
                            {cost.toLocaleString()}
                            <Image src="/sci.png" alt="" width={16} height={16} style={{ height: 13, width: "auto" }} />
                          </Box>
                        )}
                      </Stack>
                    )}
                  </Button>
                )}
              </Card>
            );
          })}
        </Box>
      )}
    </Stack>
  );
}
