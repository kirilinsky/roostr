"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import CollectionCard from "@/components/CollectionCard";
import SynthGeneGrid from "@/components/SynthGeneGrid";
import { buySynthGeneAction } from "@/app/shop/synth-genes/actions";
import {
  SYNTH_GENE_MAX_SLOTS,
  canApplySynthGene,
  skillLabel,
  type HydratedRoostr,
  type SynthGene,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Buyable synth-gene catalog. Each card gets a Buy button; clicking it opens a
// picker modal of the owner's birds, filtered to those that can still take this
// gene (active, a free slot, not already carrying it). Pick one + confirm to spend
// science and splice the gene in. The buy is fully re-validated server-side.
export default function SynthGeneShop({
  roostrs,
  sci,
  price,
}: {
  roostrs: HydratedRoostr[];
  sci: number;
  price: number;
}) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const [gene, setGene] = useState<SynthGene | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<"sci" | "error" | null>(null);

  const canAfford = sci >= price;

  // Birds eligible for gene `g`: on the roster (active OR working — splicing is
  // fine while a bird earns at a station) + a free synth slot + not already
  // carrying it. Gifting birds are in limbo, so excluded. Same predicate the
  // server enforces (status check + canApplySynthGene). Sorted by the gene's
  // target skill DESC: the bird that's already best at it gains the most, so it
  // leads as the recommended pick.
  const eligibleFor = useCallback(
    (g: SynthGene) =>
      roostrs
        .filter(
          (r) =>
            (r.status === "active" || r.status === "working") &&
            canApplySynthGene(r.synthGeneIds, g.id),
        )
        .sort((a, b) => (b.stats[g.skill] ?? 0) - (a.stats[g.skill] ?? 0)),
    [roostrs],
  );

  const eligible = useMemo(
    () => (gene ? eligibleFor(gene) : []),
    [gene, eligibleFor],
  );
  // The lead bird is the recommended target; the rest list under it.
  const recommended = eligible[0] ?? null;
  const others = eligible.slice(1);

  function open(g: SynthGene) {
    setGene(g);
    // Pre-select the recommended (best-fit) bird so confirm is one tap away.
    setPicked(eligibleFor(g)[0]?.id ?? null);
    setError(null);
  }
  function close() {
    if (pending) return;
    setGene(null);
    setPicked(null);
    setError(null);
  }

  function confirm() {
    if (!gene || !picked) return;
    setError(null);
    startTransition(async () => {
      const res = await buySynthGeneAction(gene.id, picked);
      if (res.ok) {
        router.refresh();
        setGene(null);
        setPicked(null);
      } else {
        setError(res.error === "sci" ? "sci" : "error");
      }
    });
  }

  const priceTag = (
    <Stack direction="row" spacing={0.5} alignItems="center" component="span">
      <span>{price.toLocaleString()}</span>
      <Image src="/sci.png" alt="" width={16} height={16} style={{ height: 14, width: "auto" }} />
    </Stack>
  );

  return (
    <>
      {/* Balance readout */}
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Typography variant="body2" color="text.secondary">
          {t("shop.synth.balance")}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {sci.toLocaleString()}
        </Typography>
        <Image src="/sci.png" alt="" width={18} height={18} style={{ height: 16, width: "auto" }} />
      </Stack>

      <SynthGeneGrid
        renderAction={(g) => (
          <Button
            variant="contained"
            size="small"
            fullWidth
            onClick={() => open(g)}
            disabled={roostrs.length === 0}
          >
            <Stack direction="row" spacing={0.75} alignItems="center">
              <span>{t("shop.synth.buy")}</span>
              {priceTag}
            </Stack>
          </Button>
        )}
      />

      <Popup
        open={!!gene}
        onClose={close}
        title={gene ? gene.name[locale] : ""}
        maxWidth="md"
        fullScreenOnMobile
      >
        {gene && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              {t("shop.synth.pick.desc", { max: SYNTH_GENE_MAX_SLOTS })}
            </Typography>

            {eligible.length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
                {t("shop.synth.none")}
              </Typography>
            ) : (
              <>
                {/* Recommended: the bird already strongest in the gene's skill, so
                    the splice yields the most. Pre-selected on open. */}
                {recommended && (
                  <Stack spacing={1}>
                    <Box>
                      <Typography
                        variant="overline"
                        color="secondary.main"
                        sx={{ fontWeight: 800 }}
                      >
                        ⭐ {t("shop.synth.recommended")}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" component="div">
                        {t("shop.synth.recommendedHint", {
                          skill: skillLabel(gene.skill, locale),
                          value: recommended.stats[gene.skill] ?? 0,
                        })}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: {
                          xs: "repeat(2, minmax(0, 1fr))",
                          sm: "repeat(3, minmax(0, 1fr))",
                        },
                      }}
                    >
                      <CollectionCard
                        roostr={recommended}
                        compact
                        selected={picked === recommended.id}
                        onClick={() =>
                          setPicked(
                            picked === recommended.id ? null : (recommended.id ?? null),
                          )
                        }
                      />
                    </Box>
                  </Stack>
                )}

                {others.length > 0 && (
                  <Stack spacing={1}>
                    <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 800 }}>
                      {t("shop.synth.others")}
                    </Typography>
                    <Box
                      sx={{
                        display: "grid",
                        gap: 1.5,
                        gridTemplateColumns: {
                          xs: "repeat(2, minmax(0, 1fr))",
                          sm: "repeat(3, minmax(0, 1fr))",
                          md: "repeat(4, minmax(0, 1fr))",
                        },
                      }}
                    >
                      {others.map((r) => (
                        <CollectionCard
                          key={r.id}
                          roostr={r}
                          compact
                          selected={picked === r.id}
                          onClick={() => setPicked(picked === r.id ? null : (r.id ?? null))}
                        />
                      ))}
                    </Box>
                  </Stack>
                )}
              </>
            )}

            {error === "sci" && (
              <Typography variant="caption" color="error">
                {t("shop.synth.notEnough")}
              </Typography>
            )}
            {error === "error" && (
              <Typography variant="caption" color="error">
                {t("shop.synth.error")}
              </Typography>
            )}

            <Box sx={{ position: "sticky", bottom: 0, bgcolor: "background.paper", pt: 1 }}>
              <Button
                variant="contained"
                size="large"
                fullWidth
                onClick={confirm}
                disabled={!picked || !canAfford || pending}
              >
                {pending ? (
                  <CircularProgress size={20} color="inherit" />
                ) : (
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <span>{t("shop.synth.confirm")}</span>
                    {priceTag}
                  </Stack>
                )}
              </Button>
              {!canAfford && (
                <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.75 }}>
                  {t("shop.synth.notEnough")}
                </Typography>
              )}
            </Box>
          </Stack>
        )}
      </Popup>
    </>
  );
}
