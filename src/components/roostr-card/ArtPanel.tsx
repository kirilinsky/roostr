"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import RoostrAvatar from "@/components/RoostrAvatar";
import { contrastText } from "@/lib/contrast";
import { tierBackground } from "@/lib/tierBg";
import { MONO_FONT } from "@/lib/tokens";
import type { AvatarTraits } from "@/lib/avatarV2";
import type { TierMeta, WeightClass } from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Push a hex toward black/white by `amount` (−1..1) — the art panel backdrop.
function shadeHex(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const target = amount < 0 ? 0 : 255;
  const k = Math.min(1, Math.abs(amount));
  const mix = (c: number) =>
    Math.max(0, Math.min(255, Math.round(c + (target - c) * k)));
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

// Left side of the DNA-passport card: top chips, the avatar, and the 4-color
// colorway strip — all driven by the bird's V2 cosmetic.
export default function ArtPanel({
  cosmetic,
  tier,
  rating,
  seed,
  weightClass,
}: {
  cosmetic: AvatarTraits;
  tier: TierMeta;
  rating: number;
  seed: number;
  weightClass: WeightClass;
}) {
  const t = useT();
  const locale = useLocale();
  const bodyHex = cosmetic.base;
  const seedId = `#${seed.toString(16).padStart(6, "0").toUpperCase()}`;
  const weightLabel = `${weightClass.kg} ${locale === "ru" ? "кг" : "kg"}`;
  const swatches: { labelKey: string; hex: string }[] = [
    { labelKey: "card.body", hex: cosmetic.base },
    { labelKey: "card.tail", hex: cosmetic.accent1 },
    { labelKey: "card.comb", hex: cosmetic.accent2 },
    { labelKey: "card.leg", hex: cosmetic.skin },
  ];

  return (
    <Box
      sx={(theme) => ({
        width: { xs: "100%", md: 292 },
        flexShrink: 0,
        p: { xs: 2, md: 2 },
        display: "flex",
        flexDirection: "column",
        gap: 1.5,
        borderRight: { md: 1 },
        borderBottom: { xs: 1, md: 0 },
        borderColor: "divider",
        background: [
          `linear-gradient(135deg, ${alpha(theme.palette.common.white, 0.2)} 0 1px, transparent 1px 10px)`,
          `radial-gradient(circle at 72% 16%, ${alpha(tier.color, 0.58)}, transparent 34%)`,
          `linear-gradient(155deg, ${bodyHex}, ${shadeHex(bodyHex, -0.3)})`,
        ].join(", "),
      })}
    >
      {/* top chips */}
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {cosmetic.pattern !== "none" && (
            <Chip
              label={cosmetic.pattern}
              size="small"
              sx={{
                bgcolor: "common.black",
                color: "common.white",
                fontWeight: 800,
                textTransform: "capitalize",
                borderRadius: 0.75,
              }}
            />
          )}
          <Chip
            label={weightClass.name[locale]}
            size="small"
            title={weightLabel}
            sx={{
              bgcolor: "common.black",
              color: "common.white",
              fontWeight: 800,
              cursor: "help",
              borderRadius: 0.75,
            }}
          />
        </Stack>
        <Stack spacing={0.5} alignItems="flex-end">
          <Chip
            label={seedId}
            size="small"
            sx={{
              bgcolor: "background.paper",
              fontFamily: MONO_FONT,
              borderRadius: 0.75,
              boxShadow: 2,
            }}
          />
          <Chip
            label={`${tier.id} · ${rating}`}
            size="small"
            title={`${t("card.rating")} ${rating}`}
            sx={{
              bgcolor: tier.color,
              color: contrastText(tier.color),
              fontWeight: 800,
              borderRadius: 0.75,
              boxShadow: 2,
            }}
          />
        </Stack>
      </Stack>

      {/* art — deterministic pixel avatar composited from this roostr's params */}
      <Box
        sx={(theme) => ({
          alignSelf: "center",
          width: "100%",
          maxWidth: 244,
          aspectRatio: "1 / 1",
          borderRadius: 0,
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: tierBackground(tier.color),
          border: "2px solid",
          borderColor: alpha(theme.palette.common.white, 0.82),
          boxShadow: [
            `0 16px 28px ${alpha(theme.palette.common.black, 0.22)}`,
            `inset 0 0 0 1px ${alpha(theme.palette.common.black, 0.18)}`,
          ].join(", "),
        })}
      >
        <RoostrAvatar traits={cosmetic} fill />
      </Box>

      {/* Colorway — the bird's 4 V2 colors (matches the avatar). */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
          gap: 0.75,
        }}
      >
        {swatches.map(({ labelKey, hex }) => (
          <Box
            key={labelKey}
            title={`${t(labelKey)}: ${hex}`}
            sx={{
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 0.25,
              px: 0.5,
              py: 0.5,
              borderRadius: 0.75,
              bgcolor: "rgba(0,0,0,0.34)",
              color: "common.white",
              boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.18)",
            }}
          >
            <Box
              sx={{
                width: "100%",
                height: 18,
                borderRadius: 0.25,
                bgcolor: hex,
                border: "1px solid",
                borderColor: "rgba(255,255,255,0.72)",
              }}
            />
            <Typography
              variant="caption"
              noWrap
              sx={{ minWidth: 0, fontSize: "0.62rem", fontWeight: 800 }}
            >
              {t(labelKey)}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
