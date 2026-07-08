"use client";

import Link from "next/link";
import Image from "next/image";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import { MONO_FONT, userPhoto } from "@/lib/tokens";
import type { ProvenanceEvent } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Ownership-history modal: the bird's chain of custody as a vertical timeline,
// oldest first. Each entry = a holder (user, or "the wild" after a release) with
// its from–to dates; the last entry is the current holder ("to this day").
// Pixel-game framing: square avatars, square timeline nodes, mono dates.

// Event kind → icon + label key (unknown kinds fall back to "transfer").
const KIND_META: Record<string, { icon: string; key: string }> = {
  hatch: { icon: "🥚", key: "detail.historyKind.hatch" },
  gift: { icon: "🎁", key: "detail.historyKind.gift" },
  market: { icon: "🛒", key: "detail.historyKind.market" },
  trade: { icon: "🔄", key: "detail.historyKind.trade" },
  reward: { icon: "🏆", key: "detail.historyKind.reward" },
  evolution: { icon: "⚗️", key: "detail.historyKind.evolution" },
  event: { icon: "🎪", key: "detail.historyKind.event" },
  release: { icon: "🕊️", key: "detail.historyKind.release" },
};
const KIND_FALLBACK = { icon: "📦", key: "detail.historyKind.transfer" };

export default function OwnershipHistoryModal({
  open,
  onClose,
  events,
}: {
  open: boolean;
  onClose: () => void;
  events: ProvenanceEvent[];
}) {
  const t = useT();
  const locale = useLocale();
  const fmt = (iso: string) => new Date(iso).toLocaleDateString(locale);

  return (
    <Popup open={open} onClose={onClose} title={t("detail.historyTitle")} maxWidth="xs">
      <Stack sx={{ pt: 0.5 }}>
        {events.map((e, i) => {
          const meta = KIND_META[e.kind] ?? KIND_FALLBACK;
          const last = i === events.length - 1;
          const until = last ? t("detail.historyNow") : fmt(events[i + 1].at);
          const name = e.user ? e.user.name : t("detail.ownerWild");
          return (
            <Stack key={`${e.at}-${i}`} direction="row" spacing={1.5}>
              {/* timeline rail: square node + connecting line */}
              <Stack alignItems="center" sx={{ width: 44, flexShrink: 0 }}>
                {e.user ? (
                  <Avatar
                    component={Link}
                    href={`/${e.user.id}`}
                    src={userPhoto(e.user.photoUrl)}
                    alt={name}
                    variant="square"
                    sx={{
                      width: 44,
                      height: 44,
                      border: 2,
                      borderColor: last ? "secondary.main" : "neutral.main",
                    }}
                  >
                    {name.charAt(0)}
                  </Avatar>
                ) : (
                  <Box
                    sx={{
                      width: 44,
                      height: 44,
                      border: 2,
                      borderColor: last ? "secondary.main" : "neutral.main",
                      borderStyle: "dashed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 22,
                    }}
                  >
                    🕊️
                  </Box>
                )}
                {!last && (
                  <Box sx={{ flexGrow: 1, minHeight: 16, borderLeft: 3, borderColor: "divider" }} />
                )}
              </Stack>

              <Stack spacing={0.25} sx={{ minWidth: 0, flexGrow: 1, pb: last ? 0 : 2 }}>
                <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
                  {e.user ? (
                    <Typography
                      component={Link}
                      href={`/${e.user.id}`}
                      variant="body2"
                      noWrap
                      sx={{
                        fontWeight: 800,
                        color: "text.primary",
                        textDecoration: "none",
                        "&:hover": { textDecoration: "underline" },
                      }}
                    >
                      {name}
                    </Typography>
                  ) : (
                    <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
                      {name}
                    </Typography>
                  )}
                  {last && (
                    <Chip
                      label={`★ ${t("detail.historyCurrent")}`}
                      size="small"
                      color="secondary"
                      sx={{ fontWeight: 800 }}
                    />
                  )}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  {meta.icon} {t(meta.key)}
                  {e.price != null && (
                    <Box component="span" sx={{ display: "inline-flex", alignItems: "center", gap: 0.25, ml: 0.5 }}>
                      · {e.price.toLocaleString()}
                      <Image
                        src="/corn-coin.png"
                        alt=""
                        width={18}
                        height={17}
                        style={{ height: 11, width: "auto" }}
                      />
                    </Box>
                  )}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontFamily: MONO_FONT, fontVariantNumeric: "tabular-nums" }}
                >
                  {fmt(e.at)} — {until}
                </Typography>
              </Stack>
            </Stack>
          );
        })}
        {events.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            {t("detail.historyEmpty")}
          </Typography>
        )}
      </Stack>
    </Popup>
  );
}
