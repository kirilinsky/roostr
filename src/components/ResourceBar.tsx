"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Tween a balance from its previous value to the new one (easeOutCubic, ~520ms) and
// pulse (scale + accent color) when it GROWS — so a claim visibly "lands" in the HUD.
function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(value);
  const prev = useRef(value);
  const [bump, setBump] = useState(false);

  useEffect(() => {
    const from = prev.current;
    const to = value;
    prev.current = value;
    if (from === to) return;
    // Pulse on any change — grow (claim) or shrink (hatch/spend).
    setBump(true);
    const bumpTimer = setTimeout(() => setBump(false), 480);
    const dur = 520;
    let startTs: number | null = null;
    let raf = 0;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min(1, (ts - startTs) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (bumpTimer) clearTimeout(bumpTimer);
    };
  }, [value]);

  return (
    <Box
      component="span"
      sx={{
        display: "inline-block",
        transition: "transform .18s ease, color .18s ease",
        transform: bump ? "scale(1.22)" : "scale(1)",
        color: bump ? "secondary.main" : "inherit",
      }}
    >
      {display.toLocaleString()}
    </Box>
  );
}

function Counter({
  src,
  emoji,
  label,
  value,
  rate,
  rateUnit,
  hideRate = false,
}: {
  src?: string;
  emoji?: string;
  label: string;
  value: number | string;
  rate?: number; // rounded income — shown as a small "+N{unit}" tag when ≥ 1
  rateUnit?: string;
  hideRate?: boolean; // mobile: drop the "+N/h" tag to save bar width
}) {
  return (
    <Box
      title={label}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.25,
      }}
    >
      {emoji ? (
        <Box component="span" sx={{ fontSize: 16, lineHeight: 1 }}>
          {emoji}
        </Box>
      ) : (
        <Image
          src={src ?? ""}
          alt={label}
          width={18}
          height={18}
          style={{ height: 16, width: "auto" }}
        />
      )}
      <Typography
        component="div"
        sx={{
          fontWeight: 800,
          fontVariantNumeric: "tabular-nums",
          fontSize: { xs: "0.78rem", md: "0.875rem" },
        }}
        noWrap
      >
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </Typography>
      {!hideRate && typeof rate === "number" && rate >= 1 && (
        <Typography
          component="span"
          sx={{
            fontWeight: 800,
            fontVariantNumeric: "tabular-nums",
            color: "primary.main",
            lineHeight: 1,
            fontSize: { xs: "0.58rem", md: "0.65rem" },
          }}
          noWrap
        >
          +{rate}
          {rateUnit ?? "/h"}
        </Typography>
      )}
    </Box>
  );
}

// Resource HUD (corn coins / science / eggs / feathers) + notifications bell.
// Two layouts driven by `variant`:
//   - "fixed"  (default, DESKTOP): floats top-right over content, every page.
//   - "inline" (MOBILE): bare row meant to sit INSIDE the top AppBar next to the
//     burger, so header + HUD are one bar (no fixed-overlap on narrow screens).
// The balance pill links to the Bank; the bell pill opens Notifications.
export default function ResourceBar({
  coinBalance,
  eggsBalance,
  sciBalance,
  defenseBalance,
  sciPerHour,
  eggsPerDay,
  perHourLabel,
  perDayLabel,
  feathersBalance,
  feathersLabel,
  eggsLabel,
  sciLabel,
  notificationsLabel,
  notificationCount = 0,
  variant = "fixed",
}: {
  coinBalance?: number;
  eggsBalance?: number;
  sciBalance?: number;
  defenseBalance?: number;
  sciPerHour?: number;
  eggsPerDay?: number;
  perHourLabel?: string;
  perDayLabel?: string;
  feathersBalance?: number;
  feathersLabel?: string;
  eggsLabel?: string;
  sciLabel?: string;
  notificationsLabel?: string;
  notificationCount?: number;
  variant?: "fixed" | "inline";
}) {
  // Mobile (inline) trims everything: no rate tags, tighter pill + gaps.
  const dense = variant === "inline";
  const hud = (
    <Box sx={{ display: "flex", alignItems: "stretch", gap: dense ? 0.25 : 0.5, minWidth: 0 }}>
      <Card
        component={Link}
        href="/bank"
        sx={{
          px: dense ? 0.75 : { xs: 1, md: 1.5 },
          py: dense ? 0.25 : { xs: 0.5, md: 0.75 },
          display: "block",
          textDecoration: "none",
          color: "inherit",
          cursor: "pointer",
          transition: (theme) => theme.transitions.create("box-shadow"),
          "&:hover": { boxShadow: 4 },
        }}
      >
        <Stack
          direction="row"
          spacing={dense ? 0.5 : { xs: 0.75, md: 1.25 }}
          alignItems="center"
          divider={<Divider orientation="vertical" flexItem />}
        >
          {typeof coinBalance === "number" && (
            <Counter src="/corn-coin.png" label="Corn Coin" value={coinBalance} />
          )}
          {typeof sciBalance === "number" && (
            <Counter
              src="/sci.png"
              label={sciLabel ?? "Science"}
              value={sciBalance}
              rate={sciPerHour}
              rateUnit={perHourLabel}
              hideRate={dense}
            />
          )}
          {typeof eggsBalance === "number" && (
            <Counter
              src="/eggs.png"
              label={eggsLabel ?? "Eggs"}
              value={eggsBalance}
              rate={eggsPerDay}
              rateUnit={perDayLabel}
              hideRate={dense}
            />
          )}
          {typeof feathersBalance === "number" && (
            <Counter
              src="/feather.png"
              label={feathersLabel ?? "Feathers"}
              value={feathersBalance}
            />
          )}
          {/* Base defense — live Σ Crow of guards on watch (0 when none assigned). */}
          {typeof coinBalance === "number" && (
            <Counter
              src="/defense.png"
              label="Defense"
              value={defenseBalance ?? 0}
            />
          )}
        </Stack>
      </Card>

      {notificationsLabel && (
        <Badge
          badgeContent={notificationCount}
          color="error"
          overlap="circular"
          sx={{ "& .MuiBadge-badge": { fontWeight: 800 } }}
        >
          <Card
            component={Link}
            href="/notifications"
            title={notificationsLabel}
            aria-label={notificationsLabel}
            sx={{
              px: dense ? 1.25 : { xs: 0.75, md: 1 },
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              transition: (theme) => theme.transitions.create("box-shadow"),
              "&:hover": { boxShadow: 4 },
            }}
          >
            <Typography sx={{ fontSize: dense ? 17 : 18, lineHeight: 1 }}>🔔</Typography>
          </Card>
        </Badge>
      )}
      </Box>
  );

  // Mobile: rendered inside the AppBar Toolbar (see AppShell). Shrinkable + scrolls
  // horizontally (hidden scrollbar) so a full HUD never overflows a narrow bar.
  if (variant === "inline")
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          overflowX: "auto",
          scrollbarWidth: "none",
          "&::-webkit-scrollbar": { display: "none" },
        }}
      >
        {hud}
      </Box>
    );

  // Desktop: float top-right over content (hidden on mobile, where the inline
  // variant lives in the header instead).
  return (
    <Box
      sx={{
        position: "fixed",
        top: 12,
        right: 16,
        zIndex: (theme) => theme.zIndex.drawer + 2,
        display: { xs: "none", md: "flex" },
        alignItems: "center",
      }}
    >
      {hud}
    </Box>
  );
}
