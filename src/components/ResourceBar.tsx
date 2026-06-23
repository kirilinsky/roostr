"use client";

import Image from "next/image";
import Link from "next/link";
import Badge from "@mui/material/Badge";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { EnergyState } from "@/components/AppShell";

function Counter({
  src,
  label,
  value,
}: {
  src: string;
  label: string;
  value: string;
}) {
  return (
    <Box title={label} sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Image
        src={src}
        alt={label}
        width={18}
        height={18}
        style={{ height: 18, width: "auto" }}
      />
      <Typography
        variant="body2"
        sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
        noWrap
      >
        {value}
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
        top: { xs: 9, md: 12 },
        right: { xs: 8, md: 16 },
        zIndex: (theme) => theme.zIndex.drawer + 2,
        display: "flex",
        alignItems: "stretch",
        gap: 0.5, // a couple px between the bank pill and the bell
      }}
    >
      <Card
        component={Link}
        href="/bank"
        sx={{
          px: 1.5,
          py: 0.75,
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
          spacing={1.25}
          alignItems="center"
          divider={<Divider orientation="vertical" flexItem />}
        >
          {typeof coinBalance === "number" && (
            <Counter
              src="/corn-coin.png"
              label="Corn Coin"
              value={coinBalance.toLocaleString()}
            />
          )}
          {typeof sciBalance === "number" && (
            <Counter
              src="/sci.png"
              label={sciLabel ?? "Science"}
              value={sciBalance.toLocaleString()}
            />
          )}
          {typeof eggsBalance === "number" && (
            <Counter
              src="/eggs.png"
              label={eggsLabel ?? "Eggs"}
              value={eggsBalance.toLocaleString()}
            />
          )}
          {energy && (
            <Counter
              src="/feather.png"
              label={feathersLabel ?? "Feathers"}
              value={`${energy.current}/${energy.max}`}
            />
          )}
        </Stack>
      </Card>

      {notificationsLabel && (
        <Badge
          badgeContent={notificationCount}
          color="secondary"
          overlap="circular"
          sx={{ "& .MuiBadge-badge": { fontWeight: 800 } }}
        >
          <Card
            component={Link}
            href="/notifications"
            title={notificationsLabel}
            aria-label={notificationsLabel}
            sx={{
              px: 1,
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
  );
}
