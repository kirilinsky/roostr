"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { keyframes } from "@emotion/react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrCard from "@/components/RoostrCard";
import ResourceIcon from "@/components/ResourceIcon";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import { hatchAction } from "@/app/incubator/actions";
import { useT } from "@/i18n/I18nProvider";

const headlineFamily = "var(--font-headline), system-ui, sans-serif";

// The egg hovers; its ground shadow shrinks/fades in counter-time so the float
// reads as real lift instead of a slide.
const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-16px) rotate(1.5deg); }
`;
const shadowBob = keyframes`
  0%, 100% { transform: scaleX(1); opacity: 0.28; }
  50% { transform: scaleX(0.72); opacity: 0.14; }
`;
// Aura rings expand outward from the egg when it's ready to crack.
const ring = keyframes`
  0% { transform: scale(0.6); opacity: 0.55; }
  100% { transform: scale(1.85); opacity: 0; }
`;
// The egg shakes the moment you hatch it.
const wobble = keyframes`
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-9deg); }
  40% { transform: rotate(8deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(5deg); }
`;
// New rooster pops into view on reveal.
const pop = keyframes`
  0% { transform: scale(0.6); opacity: 0; }
  60% { transform: scale(1.06); }
  100% { transform: scale(1); opacity: 1; }
`;

// A pixel-arcade corner bracket (one of four framing the chamber).
function CornerTick({ pos }: { pos: "tl" | "tr" | "bl" | "br" }) {
  const top = pos[0] === "t";
  const left = pos[1] === "l";
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        zIndex: 2,
        width: 16,
        height: 16,
        top: top ? 8 : "auto",
        bottom: top ? "auto" : 8,
        left: left ? 8 : "auto",
        right: left ? "auto" : 8,
        borderColor: "secondary.main",
        borderStyle: "solid",
        borderWidth: 0,
        borderTopWidth: top ? 3 : 0,
        borderBottomWidth: top ? 0 : 3,
        borderLeftWidth: left ? 3 : 0,
        borderRightWidth: left ? 0 : 3,
      }}
    />
  );
}

// Hatching: each hatch spends ONE egg (no money, no cooldown). Egg balance is
// authoritative on the server; we seed from it and reflect the post-hatch count.
export default function IncubatorView({
  initialEggs,
  admin,
}: {
  initialEggs: number;
  admin: boolean;
}) {
  const t = useT();
  const router = useRouter();
  const [eggs, setEggs] = useState(initialEggs);
  const [result, setResult] = useState<RolledRoostr | null>(null);
  const [debugResult, setDebugResult] = useState(false); // current reveal is a visual-only roll
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const canHatch = admin || eggs > 0;

  const hatch = useCallback(async () => {
    if (pending || !canHatch) return;
    setPending(true);
    setNotice(null);
    try {
      const res = await hatchAction();
      if (!res.ok) {
        setNotice(
          res.reason === "no-eggs"
            ? t("incubator.noEggs")
            : t("incubator.needLogin"),
        );
        return;
      }
      if (res.eggsLeft !== null) setEggs(res.eggsLeft);
      setDebugResult(false);
      setResult(res.roostr);
      // Re-render the layout so the HUD egg balance reflects the spend (animated).
      router.refresh();
    } finally {
      setPending(false);
    }
  }, [pending, canHatch, t, router]);

  const eggClickable = canHatch && !pending;

  // Admin-only: a PURELY VISUAL hatch — rolls a rooster client-side to preview the
  // reveal animation. No egg spent, nothing persisted, no achievements/quests.
  const debugHatch = useCallback(() => {
    if (pending) return;
    setNotice(null);
    setDebugResult(true);
    setResult(rollRoostr());
  }, [pending]);

  // ── Reveal: celebrate the freshly hatched rooster ──
  if (result) {
    return (
      <Stack spacing={2.5} alignItems="center" sx={{ width: "100%", maxWidth: 540 }}>
        <Stack spacing={0.5} alignItems="center">
          <Typography
            variant="h5"
            color="primary"
            sx={{
              fontFamily: headlineFamily,
              fontWeight: 900,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              animation: `${pop} 0.45s ease-out both`,
            }}
          >
            🎉 {t("incubator.hatched")}
          </Typography>
          {debugResult && (
            <Typography variant="caption" color="text.secondary">
              🐛 {t("incubator.debugNote")}
            </Typography>
          )}
        </Stack>
        <Box
          sx={{
            animation: `${pop} 0.55s cubic-bezier(0.2, 0.8, 0.2, 1.2) both`,
            filter: (theme) =>
              `drop-shadow(0 0 28px ${alpha(theme.palette.secondary.main, 0.5)})`,
          }}
        >
          <RoostrCard roostr={result} />
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Button
            variant="outlined"
            color="neutral"
            onClick={() => setResult(null)}
          >
            {t("incubator.continue")}
          </Button>
          {debugResult ? (
            <Button variant="contained" color="neutral" onClick={debugHatch}>
              🐛 {t("incubator.debugHatch")}
            </Button>
          ) : (
            canHatch && (
              <Button
                variant="contained"
                disabled={pending}
                onClick={() => {
                  setResult(null);
                  hatch();
                }}
              >
                🥚 {t("incubator.hatch")}
              </Button>
            )
          )}
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={2.5} alignItems="center" sx={{ width: "100%", maxWidth: 540 }}>
      {/* Incubator chamber — bright arcade "hatch pod": framed panel, checker floor,
          corner ticks, an egg-count HUD and a "READY" beacon when a hatch is armed. */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          maxHeight: 460,
          overflow: "hidden",
          bgcolor: "background.paper",
          border: 2,
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Checkerboard floor — subtle, from the divider token (no hardcoded color). */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            backgroundImage: (theme) => {
              const d = alpha(theme.palette.text.primary, 0.04);
              return `linear-gradient(45deg, ${d} 25%, transparent 25%), linear-gradient(-45deg, ${d} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${d} 75%), linear-gradient(-45deg, transparent 75%, ${d} 75%)`;
            },
            backgroundSize: "28px 28px",
            backgroundPosition: "0 0, 0 14px, 14px -14px, -14px 0",
          }}
        />

        {/* Soft spotlight — brightens to secondary/primary when a hatch is ready. */}
        <Box
          aria-hidden
          sx={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            background: (theme) =>
              `radial-gradient(circle at 50% 44%, ${alpha(
                canHatch ? theme.palette.secondary.main : theme.palette.text.primary,
                canHatch ? 0.14 : 0.05,
              )} 0%, transparent 60%)`,
          }}
        />

        <CornerTick pos="tl" />
        <CornerTick pos="tr" />
        <CornerTick pos="bl" />
        <CornerTick pos="br" />

        {/* Egg-count HUD chip (top-left). */}
        <Chip
          size="small"
          label={
            <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
              <ResourceIcon kind="egg" size={14} />
              <Box component="span" sx={{ fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>
                {admin ? "∞" : eggs}
              </Box>
            </Box>
          }
          sx={{
            position: "absolute",
            top: 12,
            left: 12,
            zIndex: 3,
            height: 24,
            bgcolor: "background.default",
            border: 1,
            borderColor: "divider",
          }}
        />

        {/* READY beacon (top-right) — only when a hatch is armed. */}
        {canHatch && (
          <Chip
            size="small"
            color="secondary"
            label={`● ${t("incubator.ready")}`}
            sx={{
              position: "absolute",
              top: 12,
              right: 12,
              zIndex: 3,
              height: 24,
              fontWeight: 800,
              fontSize: 10,
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          />
        )}

        {/* Expanding auras when ready to hatch */}
        {eggClickable &&
          [0, 1].map((i) => (
            <Box
              key={i}
              aria-hidden
              sx={{
                position: "absolute",
                zIndex: 1,
                width: 210,
                height: 210,
                borderRadius: "50%",
                border: (theme) =>
                  `2px solid ${alpha(theme.palette.secondary.main, 0.5)}`,
                animation: `${ring} 2.6s ease-out ${i * 1.3}s infinite`,
              }}
            />
          ))}

        {/* Egg + its ground shadow, stacked so the float reads as lift. */}
        <Stack alignItems="center" sx={{ position: "relative", zIndex: 1 }}>
          <Box
            role={eggClickable ? "button" : undefined}
            aria-label={eggClickable ? t("incubator.hatch") : undefined}
            onClick={eggClickable ? hatch : undefined}
            sx={{
              lineHeight: 0,
              opacity: canHatch ? 1 : 0.4,
              cursor: eggClickable ? "pointer" : "default",
              filter: (theme) =>
                canHatch
                  ? `drop-shadow(0 0 22px ${alpha(theme.palette.secondary.main, 0.45)})`
                  : "grayscale(0.6)",
              transition: "opacity 0.3s, filter 0.3s",
              animation: pending
                ? `${wobble} 0.5s ease-in-out infinite`
                : `${float} 4s ease-in-out infinite`,
            }}
          >
            <Image
              src="/egg.png"
              alt=""
              width={1024}
              height={1024}
              priority
              style={{ width: 200, height: "auto", display: "block" }}
            />
          </Box>
          {/* ground shadow */}
          <Box
            aria-hidden
            sx={{
              mt: 1,
              width: 128,
              height: 20,
              borderRadius: "50%",
              bgcolor: (theme) => alpha(theme.palette.text.primary, 0.9),
              filter: "blur(6px)",
              animation: canHatch && !pending ? `${shadowBob} 4s ease-in-out infinite` : "none",
              opacity: canHatch ? 0.22 : 0.1,
            }}
          />
        </Stack>

        {pending && (
          <Box sx={{ position: "absolute", bottom: 16, zIndex: 3 }}>
            <CircularProgress size={24} color="secondary" />
          </Box>
        )}
      </Box>

      {/* Status + action — arcade console strip under the pod. */}
      <Stack spacing={1.25} alignItems="center" sx={{ width: "100%", minHeight: 108 }}>
        <Stack direction="row" spacing={0.75} alignItems="center">
          <Box sx={{ width: 8, height: 8, bgcolor: canHatch ? "secondary.main" : "text.disabled" }} />
          <Typography
            sx={{
              fontFamily: headlineFamily,
              fontWeight: 900,
              fontSize: "0.8rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: canHatch ? "text.primary" : "text.disabled",
            }}
          >
            {canHatch ? t("incubator.ready") : t("incubator.charging")}
          </Typography>
        </Stack>

        {canHatch ? (
          <>
            <Button
              variant="contained"
              size="large"
              onClick={hatch}
              disabled={pending}
              fullWidth
              sx={{
                maxWidth: 340,
                py: 1.3,
                fontFamily: headlineFamily,
                fontWeight: 900,
                fontSize: "1.05rem",
                letterSpacing: "0.04em",
              }}
            >
              🥚 {t("incubator.hatch")}
            </Button>
            <Typography variant="caption" color="text.secondary" textAlign="center">
              {t("incubator.tapHint")}
            </Typography>
          </>
        ) : (
          <>
            <Typography color="text.secondary" textAlign="center">
              {t("incubator.noEggs")}
            </Typography>
            <Button
              component={Link}
              href="/farm"
              variant="outlined"
              color="secondary"
              sx={{ maxWidth: 340 }}
              fullWidth
            >
              🌾 {t("incubator.getEggs")}
            </Button>
          </>
        )}
        {admin && (
          <Button
            variant="text"
            color="neutral"
            size="small"
            onClick={debugHatch}
            disabled={pending}
          >
            🐛 {t("incubator.debugHatch")}
          </Button>
        )}
        {notice && (
          <Typography variant="body2" color="error">
            {notice}
          </Typography>
        )}
      </Stack>
    </Stack>
  );
}
