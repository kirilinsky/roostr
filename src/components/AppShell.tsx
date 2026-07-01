"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Box from "@mui/material/Box";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import DevLoginButtons from "@/components/DevLoginButtons";
import Footer from "@/components/Footer";
import ResourceBar from "@/components/ResourceBar";

const DRAWER_WIDTH = 260;

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface ShellUser {
  id: number;
  name: string;
  photoUrl?: string;
}

export default function AppShell({
  user,
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
  notificationCount,
  mainNav,
  bottomNav,
  viewProfileLabel,
  aboutLabel,
  supportLabel,
  children,
}: {
  user: ShellUser | null;
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
  mainNav: NavItem[];
  bottomNav: NavItem[];
  viewProfileLabel: string;
  aboutLabel: string;
  supportLabel: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setMobileOpen(false);

  // Shared HUD props → rendered twice: fixed top-right on desktop, and inline
  // inside the mobile top bar (merged with the burger, no fixed-overlap).
  const hudProps = {
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
    notificationCount,
  };

  if (!user) {
    return (
      <Box
        component="main"
        sx={{
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          minWidth: 0,
        }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
        <Footer aboutLabel={aboutLabel} supportLabel={supportLabel} />
      </Box>
    );
  }

  // Sidebar nav, dialed a bit more "Neo-Arcade pixel": square blocks (no rounding),
  // headline (pixel) font labels in uppercase, and a hard 3px inset bar (no blur)
  // for the active/hover state instead of a soft highlight. All via theme tokens.
  const navList = (items: NavItem[]) => (
    <List>
      {items.map((it) => (
        <ListItem key={it.href} disablePadding>
          <ListItemButton
            component={Link}
            href={it.href}
            selected={pathname === it.href}
            onClick={close}
            sx={{
              borderRadius: 0,
              // Mobile: bigger tap target; desktop keeps the tighter row.
              py: { xs: 1.15, md: 0.75 },
              "& .MuiListItemText-primary": {
                fontFamily: "var(--font-headline), system-ui, sans-serif",
                fontWeight: 700,
                fontSize: { xs: "1rem", md: "0.9rem" },
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              },
              "&:hover": {
                boxShadow: (theme) => `inset 3px 0 0 ${theme.palette.divider}`,
              },
              "&.Mui-selected, &.Mui-selected:hover": {
                bgcolor: "action.selected",
                boxShadow: (theme) =>
                  `inset 3px 0 0 ${theme.palette.secondary.main}`,
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: { xs: 44, md: 40 }, fontSize: { xs: 26, md: 22 } }}>
              {it.icon}
            </ListItemIcon>
            <ListItemText primary={it.label} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  const drawer = (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        // Mobile: clear the fixed top bar (logo block is hidden there).
        pt: { xs: "52px", md: 0 },
      }}
    >
      {/* Logo — hidden on mobile (the top bar already shows it). */}
      <Box
        component={Link}
        href="/"
        onClick={close}
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          gap: 1.25,
          minHeight: 72,
          px: 1.75,
          py: 1,
          textDecoration: "none",
          color: "inherit",
          borderBottom: "1px solid",
          borderColor: "divider",
          "&:hover": {
            bgcolor: "action.hover",
          },
        }}
      >
        <Image
          src="/roostr_logo.png"
          alt="Roostr"
          width={92}
          height={40}
          priority
          style={{ height: 48, width: "auto", display: "block", flexShrink: 0 }}
        />
        <Box sx={{ minWidth: 0 }}>
          <Typography
            sx={{
              fontFamily: "var(--font-headline), system-ui, sans-serif",
              fontWeight: 800,
              fontSize: "1rem",
              lineHeight: 1,
              textTransform: "uppercase",
            }}
          >
            Roostr
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              display: "block",
              mt: 0.25,
              lineHeight: 1.1,
              textTransform: "uppercase",
            }}
          >
            Hatch / Fight / Trade
          </Typography>
        </Box>
      </Box>

      {/* Mini profile */}
      <Box sx={{ p: 2 }}>
        <Box
          component={Link}
          href={`/${user.id}`}
          onClick={close}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            p: 1,
            borderRadius: 0,
            border: 1,
            borderColor: "divider",
            textDecoration: "none",
            color: "inherit",
            transition: "background-color .15s, border-color .15s",
            "&:hover": {
              bgcolor: "action.hover",
              borderColor: "primary.main",
            },
          }}
        >
          <Avatar
            src={user.photoUrl}
            alt={user.name}
            sx={{ width: 40, height: 40 }}
          >
            {user.name.charAt(0) || "?"}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="subtitle1" noWrap>
              {user.name}
            </Typography>
            <Typography
              variant="caption"
              noWrap
              sx={{ display: "block", color: "primary.main", fontWeight: 600 }}
            >
              {viewProfileLabel} ›
            </Typography>
          </Box>
        </Box>
      </Box>

      {/* Dev-only fake auth (localhost). No-op in production. */}
      <DevLoginButtons />

      <Divider />

      {navList(mainNav)}

      <Box sx={{ flexGrow: 1 }} />

      <Divider />
      {navList(bottomNav)}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {/* Resource HUD — desktop: fixed top-right (component hides itself on xs). */}
      <ResourceBar variant="fixed" {...hudProps} />

      {/* Mobile top bar = header + HUD in ONE component: burger, logo, then the
          inline HUD. No separate fixed HUD floating over it. */}
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{
          display: { md: "none" },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar
          disableGutters
          sx={{ gap: 0.5, minHeight: 56, px: 0.75, alignItems: "center" }}
        >
          <IconButton
            onClick={() => setMobileOpen(true)}
            aria-label="open menu"
            sx={{ flexShrink: 0, width: 44, height: 44, fontSize: 30, lineHeight: 1 }}
          >
            ☰
          </IconButton>
          {/* Logo — only where there's room (sm+); xs gives its width to the HUD. */}
          <Box
            sx={{ display: { xs: "none", sm: "flex" }, alignItems: "center", flexShrink: 0 }}
          >
            <Image
              src="/roostr_logo.png"
              alt="Roostr"
              width={92}
              height={40}
              priority
              style={{ height: 28, width: "auto" }}
            />
          </Box>
          <Box sx={{ flexGrow: 1, minWidth: 0 }} />
          <ResourceBar variant="inline" {...hudProps} />
        </Toolbar>
      </AppBar>

      {/* Drawers */}
      <Box
        component="nav"
        sx={{ width: { md: DRAWER_WIDTH }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={close}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          open
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": { width: DRAWER_WIDTH, boxSizing: "border-box" },
          }}
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: "100dvh",
          // minWidth:0 lets this flex column shrink below wide content (e.g. the
          // scrollable notification tabs) instead of forcing horizontal overflow.
          minWidth: 0,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {/* spacer for the mobile app bar */}
        <Toolbar sx={{ display: { md: "none" } }} />
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>{children}</Box>
        <Footer aboutLabel={aboutLabel} supportLabel={supportLabel} />
      </Box>
    </Box>
  );
}
