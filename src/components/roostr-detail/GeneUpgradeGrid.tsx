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
import GeneIcon from "@/components/GeneIcon";
import StatModBadges from "@/components/StatModBadges";
import { GENE_MAX_LEVEL, geneUpgradeCost, type HydratedRoostr } from "@/lib/roostr";
import { upgradeGeneAction } from "@/app/collection/[id]/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Brief "upgrade applied" pulse on the gene's button after a successful upgrade.
const successPulse = keyframes`
  0% { transform: scale(1); }
  45% { transform: scale(1.06); filter: brightness(1.25); }
  100% { transform: scale(1); filter: brightness(1); }
`;

// The genetic-upgrade section: header (title + coin balance) + a card per gene
// with its level, mods, and the spend-to-upgrade button. Owns the upgrade state.
export default function GeneUpgradeGrid({
  roostr,
  roostrId,
  coins,
  isOwner,
  canManage,
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  coins: number;
  isOwner: boolean;
  canManage: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [busyGene, setBusyGene] = useState<string | null>(null);
  const [flashGene, setFlashGene] = useState<string | null>(null);

  function upgrade(geneId: string) {
    setBusyGene(geneId);
    startTransition(async () => {
      const res = await upgradeGeneAction(roostrId, geneId);
      setBusyGene(null);
      if (res?.ok) {
        setFlashGene(geneId);
        window.setTimeout(() => setFlashGene((g) => (g === geneId ? null : g)), 600);
      }
    });
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="h5" sx={{ fontWeight: 800, textTransform: "uppercase" }}>
        {t("detail.geneticUpgrades")}
      </Typography>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        {roostr.genes.map((gene) => {
          const level = roostr.geneLevels[gene.id] ?? 1;
          const maxed = level >= GENE_MAX_LEVEL;
          const cost = geneUpgradeCost(level);
          const canAfford = coins >= cost;
          const disabled = !isOwner || maxed || !canAfford || (pending && busyGene === gene.id);
          return (
            <Card
              key={gene.id}
              sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1, height: "100%" }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <GeneIcon no={gene.no} family={gene.family} size={64} />
                <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
                    {gene.name[locale]}
                  </Typography>
                  <Chip
                    label={`${t("detail.lvl")} ${level}`}
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  />
                </Stack>
              </Stack>

              {/* gene's base effect (fixed identity) — magnitude grows with level,
                  reflected in the all-stats panel, not by mutating this. */}
              <Box sx={{ minHeight: 24 }}>
                <StatModBadges mods={gene.statMods} locale={locale} />
              </Box>

              {canManage ? (
                (() => {
                  const busy = pending && busyGene === gene.id;
                  return (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={disabled}
                      onClick={() => upgrade(gene.id)}
                      sx={{
                        // Pin to the card's bottom so every row's buttons align even
                        // when badge counts differ between genes.
                        mt: "auto",
                        ...(flashGene === gene.id
                          ? { animation: `${successPulse} 0.6s ease` }
                          : {}),
                      }}
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
                              {cost}
                              <Image
                                src="/corn-coin.png"
                                alt=""
                                width={18}
                                height={17}
                                style={{ height: 13, width: "auto" }}
                              />
                            </Box>
                          )}
                        </Stack>
                      )}
                    </Button>
                  );
                })()
              ) : null}
            </Card>
          );
        })}
      </Box>
    </Stack>
  );
}
