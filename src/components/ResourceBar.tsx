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
import type { EnergyState } from "@/components/AppShell";

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
}: {
  src?: string;
  emoji?: string;
  label: string;
  value: number | string;
}) {
  return (
    <Box
      title={label}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: { xs: 0.25, md: 0.5 },
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
    </Box>
  );
}

// Fixed top-right resource HUD (corn coins / science / eggs / feathers). Moved
// out of the sidebar so balances stay visible on every page. The balance pill
// links to the Bank; a bell pill a couple px to its right opens Notifications.
export default function ResourceBar({
  coinBalance,
  eggsBalance,
  sciBalance,
  energy,
  feathersLabel,
  eggsLabel,
  sciLabel,
  notificationsLabel,
  notificationCount = 0,
}: {
  coinBalance?: number;
  eggsBalance?: number;
  sciBalance?: number;
  energy?: EnergyState;
  feathersLabel?: string;
  eggsLabel?: string;
  sciLabel?: string;
  notificationsLabel?: string;
  notificationCount?: number;
}) {
  return (
    <Box
      sx={{
        position: "fixed",
        top: { xs: 0, md: 12 },
        right: { xs: 8, md: 16 },
        // Mobile: a band the height of the top bar so the HUD vertical-centers with
        // the logo (no more height mismatch). Desktop: natural height at top: 12.
        height: { xs: 52, md: "auto" },
        zIndex: (theme) => theme.zIndex.drawer + 2,
        display: "flex",
        alignItems: "center",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "stretch", gap: 0.5 }}>
      <Card
        component={Link}
        href="/bank"
        sx={{
          px: { xs: 1, md: 1.5 },
          py: { xs: 0.5, md: 0.75 },
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
          spacing={{ xs: 0.75, md: 1.25 }}
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
            />
          )}
          {typeof eggsBalance === "number" && (
            <Counter
              src="/eggs.png"
              label={eggsLabel ?? "Eggs"}
              value={eggsBalance}
            />
          )}
          {energy && (
            <Counter
              src="/feather.png"
              label={feathersLabel ?? "Feathers"}
              value={`${energy.current}/${energy.max}`}
            />
          )}
          {/* Defense — TBA (raids/защита). Shows 0 until the system ships. */}
          {typeof coinBalance === "number" && (
            <Counter emoji="🛡️" label="Defense" value={0} />
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
              px: { xs: 0.75, md: 1 },
              display: "flex",
              alignItems: "center",
              textDecoration: "none",
              color: "inherit",
              cursor: "pointer",
              transition: (theme) => theme.transitions.create("box-shadow"),
              "&:hover": { boxShadow: 4 },
            }}
          >
            <Typography sx={{ fontSize: 18, lineHeight: 1 }}>🔔</Typography>
          </Card>
        </Badge>
      )}
      </Box>
    </Box>
  );
}
