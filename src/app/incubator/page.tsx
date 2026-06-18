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
import { type RolledRoostr } from "@/lib/roostr";
import { markDiscovered } from "@/lib/dex";
import { hatchAction } from "@/app/incubator/actions";
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
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

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

  // Reflect the server's authoritative cooldown into the local countdown.
  // cooldownUntil is the unlock time; the timer is anchored one full cooldown
  // before it. null clears the cooldown (admins have no limit).
  const applyCooldown = useCallback((cooldownUntil: number | null) => {
    if (cooldownUntil === null) {
      setLastHatchAt(null);
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const anchor = cooldownUntil - HATCH_COOLDOWN_MS;
    setLastHatchAt(anchor);
    window.localStorage.setItem(STORAGE_KEY, String(anchor));
  }, []);

  const hatch = useCallback(async () => {
    if (pending) return;
    setPending(true);
    setNotice(null);
    try {
      // Server is authoritative: it enforces the daily limit and decides the
      // cooldown. The client clock is only UX. Keep the local dex mark until
      // the Roostrdex reads discoveries from the DB.
      const res = await hatchAction();
      if (!res.ok) {
        if (res.reason === "cooldown") applyCooldown(res.cooldownUntil);
        else setNotice(t("incubator.needLogin"));
        return;
      }
      applyCooldown(res.cooldownUntil);
      markDiscovered(res.roostr.breed.id);
      setResult(res.roostr);
    } finally {
      setPending(false);
    }
  }, [pending, applyCooldown, t]);

  const eggClickable = hydrated && ready;

  return (
    <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
      <Stack spacing={4} alignItems="center" textAlign="center">
        <Stack spacing={1} alignItems="center">
          <Typography variant="h4" component="h1">
            {t("incubator.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("incubator.subtitle")}
          </Typography>
        </Stack>

        {result ? (
          // Reveal: full-width so the (wide) card never gets clipped.
          <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
            <Typography variant="subtitle1" color="primary">
              {t("incubator.hatched")}
            </Typography>
            <RoostrCard roostr={result} />
            <Button variant="text" onClick={() => setResult(null)}>
              {t("incubator.continue")}
            </Button>
          </Stack>
        ) : (
          <>
            {/* Dark incubator chamber. bg matches the egg.png backdrop (#010612)
                so the near-black PNG blends seamlessly; glow brightens when ready. */}
            <Box
              sx={{
                position: "relative",
                width: "100%",
                minHeight: 380,
                borderRadius: 4,
                overflow: "hidden",
                bgcolor: "#010612",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                "&::before": {
                  content: '""',
                  position: "absolute",
                  inset: 0,
                  opacity: ready ? 1 : 0.45,
                  transition: "opacity 0.5s ease",
                },
              }}
            >
              <Box
                role={eggClickable ? "button" : undefined}
                aria-label={eggClickable ? t("incubator.hatch") : undefined}
                onClick={eggClickable && !pending ? hatch : undefined}
                sx={{
                  position: "relative",
                  zIndex: 1,
                  lineHeight: 0,
                  cursor: eggClickable && !pending ? "pointer" : "default",
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
            </Box>

            {/* Status + actions */}
            <Stack spacing={2} alignItems="center" sx={{ minHeight: 96 }}>
              {!hydrated ? null : ready ? (
                <>
                  <Typography color="text.secondary">
                    {t("incubator.ready")}
                  </Typography>
                  <Button
                    variant="contained"
                    size="large"
                    onClick={hatch}
                    disabled={pending}
                  >
                    {t("incubator.hatch")}
                  </Button>
                </>
              ) : (
                <>
                  <Typography
                    color="text.secondary"
                    sx={{ fontVariantNumeric: "tabular-nums" }}
                  >
                    {t("incubator.nextIn", {
                      time: formatRemaining(remaining),
                    })}
                  </Typography>
                  <Button
                    variant="outlined"
                    color="secondary"
                    size="large"
                    disabled
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
              {notice && (
                <Typography variant="body2" color="error">
                  {notice}
                </Typography>
              )}
            </Stack>
          </>
        )}
      </Stack>
    </Container>
  );
}
