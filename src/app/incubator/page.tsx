"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrCard from "@/components/RoostrCard";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import { markDiscovered } from "@/lib/dex";
import { useT } from "@/i18n/I18nProvider";

// One free hatch per day; boost lets the player skip the wait for currency.
// No backend yet — the cooldown lives in localStorage. Move to the server
// (and a real spend) when the economy is wired up.
const HATCH_COOLDOWN_MS = 24 * 60 * 60 * 1000;
const BOOST_COST = 50; // Corn Coin, placeholder cost
const STORAGE_KEY = "roostr.incubator.lastHatchAt";

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-16px) rotate(1.5deg); }
`;

function formatRemaining(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

export default function IncubatorPage() {
  const t = useT();
  const [lastHatchAt, setLastHatchAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [hydrated, setHydrated] = useState(false);
  const [result, setResult] = useState<RolledRoostr | null>(null);

  // Restore the cooldown after mount to avoid SSR/client markup mismatch.
  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    if (Number.isFinite(parsed)) setLastHatchAt(parsed);
    setHydrated(true);
  }, []);

  // Tick once a second so the countdown stays live.
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const remaining = lastHatchAt
    ? Math.max(0, lastHatchAt + HATCH_COOLDOWN_MS - now)
    : 0;
  const ready = remaining <= 0;

  const hatch = useCallback(() => {
    const ts = Date.now();
    setLastHatchAt(ts);
    window.localStorage.setItem(STORAGE_KEY, String(ts));
    const rolled = rollRoostr();
    markDiscovered(rolled.breed.id);
    setResult(rolled);
  }, []);

  const eggClickable = hydrated && ready && !result;

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4} alignItems="center" textAlign="center">
        <Stack spacing={1} alignItems="center">
          <Typography variant="h4" component="h1">
            {t("incubator.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("incubator.subtitle")}
          </Typography>
        </Stack>

        {/* Center stage: a dark incubator chamber. The near-black egg.png
            blends seamlessly into it; ambient glow brightens when ready. */}
        <Box
          sx={{
            position: "relative",
            width: "100%",
            minHeight: 380,
            borderRadius: 4,
            overflow: "hidden",
            bgcolor: "#04060f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(circle at 50% 42%, rgba(0,153,204,0.30), transparent 62%)",
              opacity: ready ? 1 : 0.45,
              transition: "opacity 0.5s ease",
            },
          }}
        >
          {result ? (
            <Stack spacing={2} alignItems="center" sx={{ zIndex: 1, p: 2 }}>
              <Typography variant="subtitle1" color="primary">
                {t("incubator.hatched")}
              </Typography>
              <RoostrCard roostr={result} />
              <Button variant="text" onClick={() => setResult(null)}>
                {t("incubator.continue")}
              </Button>
            </Stack>
          ) : (
            <Box
              role={eggClickable ? "button" : undefined}
              aria-label={eggClickable ? t("incubator.hatch") : undefined}
              onClick={eggClickable ? hatch : undefined}
              sx={{
                position: "relative",
                zIndex: 1,
                lineHeight: 0,
                cursor: eggClickable ? "pointer" : "default",
                animation: `${float} 4s ease-in-out infinite`,
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
          )}
        </Box>

        {/* Status + actions. Hidden while a hatch result is on screen. */}
        {!result && (
          <Stack spacing={2} alignItems="center" sx={{ minHeight: 96 }}>
            {!hydrated ? null : ready ? (
              <>
                <Typography color="text.secondary">
                  {t("incubator.ready")}
                </Typography>
                <Button variant="contained" size="large" onClick={hatch}>
                  {t("incubator.hatch")}
                </Button>
              </>
            ) : (
              <>
                <Typography
                  color="text.secondary"
                  sx={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {t("incubator.nextIn", { time: formatRemaining(remaining) })}
                </Typography>
                <Button
                  variant="outlined"
                  color="secondary"
                  size="large"
                  onClick={hatch}
                >
                  <Stack direction="row" spacing={0.75} alignItems="center">
                    <span>⚡ {t("incubator.boost")}</span>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 0.25,
                        opacity: 0.85,
                      }}
                    >
                      · {BOOST_COST}
                      <Image
                        src="/corn-coin.png"
                        alt="Corn Coin"
                        width={18}
                        height={17}
                        style={{ height: 14, width: "auto" }}
                      />
                    </Box>
                  </Stack>
                </Button>
              </>
            )}
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
