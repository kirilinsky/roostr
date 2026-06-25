"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { keyframes } from "@emotion/react";
import { alpha } from "@mui/material/styles";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrCard from "@/components/RoostrCard";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import { hatchAction } from "@/app/incubator/actions";
import { useT } from "@/i18n/I18nProvider";

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-16px) rotate(1.5deg); }
`;
// Glow breathes while a hatch is available.
const pulse = keyframes`
  0%, 100% { opacity: 0.45; }
  50% { opacity: 1; }
`;
// Aura rings expand outward from the egg when it's ready to crack.
const ring = keyframes`
  0% { transform: scale(0.65); opacity: 0.6; }
  100% { transform: scale(1.8); opacity: 0; }
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
            sx={{ fontWeight: 800, animation: `${pop} 0.45s ease-out both` }}
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
    <Stack spacing={3} alignItems="center" sx={{ width: "100%", maxWidth: 540 }}>
      {/* Incubator chamber — dark, glows + auras brighten when a hatch is ready. */}
      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "1 / 1",
          maxHeight: 460,
          borderRadius: 5,
          overflow: "hidden",
          bgcolor: (theme) => theme.palette.grey[900],
          boxShadow: 8,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Radial glow */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background: (theme) =>
              `radial-gradient(circle at 50% 46%, ${alpha(
                theme.palette.primary.main,
                canHatch ? 0.5 : 0.16,
              )} 0%, transparent 62%)`,
            animation: canHatch ? `${pulse} 3s ease-in-out infinite` : "none",
          }}
        />

        {/* Expanding auras when ready to hatch */}
        {eggClickable &&
          [0, 1].map((i) => (
            <Box
              key={i}
              sx={{
                position: "absolute",
                width: 210,
                height: 210,
                borderRadius: "50%",
                border: (theme) =>
                  `2px solid ${alpha(theme.palette.secondary.main, 0.55)}`,
                animation: `${ring} 2.6s ease-out ${i * 1.3}s infinite`,
              }}
            />
          ))}

        {/* The egg */}
        <Box
          role={eggClickable ? "button" : undefined}
          aria-label={eggClickable ? t("incubator.hatch") : undefined}
          onClick={eggClickable ? hatch : undefined}
          sx={{
            position: "relative",
            zIndex: 1,
            lineHeight: 0,
            opacity: canHatch ? 1 : 0.45,
            cursor: eggClickable ? "pointer" : "default",
            filter: (theme) =>
              canHatch
                ? `drop-shadow(0 0 24px ${alpha(theme.palette.primary.main, 0.55)})`
                : "none",
            transition: "opacity 0.3s",
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
            style={{ width: 220, height: "auto", display: "block" }}
          />
        </Box>

        {pending && (
          <Box sx={{ position: "absolute", bottom: 18, zIndex: 2 }}>
            <CircularProgress size={24} color="secondary" />
          </Box>
        )}
      </Box>

      {/* Status + action */}
      <Stack spacing={1.5} alignItems="center" sx={{ width: "100%", minHeight: 92 }}>
        {canHatch ? (
          <>
            <Typography variant="body2" color="text.secondary">
              {t("incubator.cost")}
            </Typography>
            <Button
              variant="contained"
              size="large"
              onClick={hatch}
              disabled={pending}
              fullWidth
              sx={{ maxWidth: 320, py: 1.25, fontSize: "1.05rem" }}
            >
              🥚 {t("incubator.hatch")}
            </Button>
          </>
        ) : (
          <Typography color="text.secondary" textAlign="center">
            {t("incubator.noEggs")}
          </Typography>
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
