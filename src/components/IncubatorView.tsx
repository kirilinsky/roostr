"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrCard from "@/components/RoostrCard";
import { type RolledRoostr } from "@/lib/roostr";
import { hatchAction } from "@/app/incubator/actions";
import { useT } from "@/i18n/I18nProvider";

const float = keyframes`
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-16px) rotate(1.5deg); }
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
      setResult(res.roostr);
      // Re-render the layout so the HUD egg balance reflects the spend (animated).
      router.refresh();
    } finally {
      setPending(false);
    }
  }, [pending, canHatch, t]);

  const eggClickable = canHatch && !pending;

  if (result) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ width: "100%" }}>
        <Typography variant="subtitle1" color="primary">
          {t("incubator.hatched")}
        </Typography>
        <RoostrCard roostr={result} />
        <Button variant="text" onClick={() => setResult(null)}>
          {t("incubator.continue")}
        </Button>
      </Stack>
    );
  }

  return (
    <>
      {/* Egg balance */}
      <Stack direction="row" spacing={1} alignItems="center">
        <Image
          src="/eggs.png"
          alt={t("resource.eggs")}
          width={24}
          height={24}
          style={{ height: 24, width: "auto" }}
        />
        <Typography sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>
          {admin ? "∞" : eggs.toLocaleString()}
        </Typography>
      </Stack>

      {/* Dark incubator chamber; glow brightens when a hatch is available. */}
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
        }}
      >
        <Box
          role={eggClickable ? "button" : undefined}
          aria-label={eggClickable ? t("incubator.hatch") : undefined}
          onClick={eggClickable ? hatch : undefined}
          sx={{
            position: "relative",
            zIndex: 1,
            lineHeight: 0,
            opacity: canHatch ? 1 : 0.5,
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
      </Box>

      {/* Status + action */}
      <Stack spacing={2} alignItems="center" sx={{ minHeight: 96 }}>
        {canHatch ? (
          <>
            <Typography color="text.secondary">
              {t("incubator.cost")}
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
          <Typography color="text.secondary" textAlign="center">
            {t("incubator.noEggs")}
          </Typography>
        )}
        {notice && (
          <Typography variant="body2" color="error">
            {notice}
          </Typography>
        )}
      </Stack>
    </>
  );
}
