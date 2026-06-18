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
import TelegramLoginButton from "@/components/TelegramLoginButton";
import Footer from "@/components/Footer";

const DRAWER_WIDTH = 260;

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export interface ShellUser {
  name: string;
  photoUrl?: string;
}

export interface EnergyState {
  current: number;
  max: number;
}

export default function AppShell({
  user,
  coinBalance,
  energy,
  feathersLabel,
  botUsername,
  mainNav,
  bottomNav,
  loginLabel,
  children,
}: {
  user: ShellUser | null;
  coinBalance?: number;
  energy?: EnergyState;
  feathersLabel?: string;
  botUsername: string;
  mainNav: NavItem[];
  bottomNav: NavItem[];
  loginLabel: string;
  children: ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const close = () => setMobileOpen(false);

  const navList = (items: NavItem[]) => (
    <List>
      {items.map((it) => (
        <ListItem key={it.href} disablePadding>
          <ListItemButton
            component={Link}
            href={it.href}
            selected={pathname === it.href}
            onClick={close}
          >
            <ListItemIcon sx={{ minWidth: 40, fontSize: 22 }}>
              {it.icon}
            </ListItemIcon>
            <ListItemText primary={it.label} />
          </ListItemButton>
        </ListItem>
      ))}
    </List>
  );

  const drawer = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Logo */}
      <Box
        component={Link}
        href="/"
        onClick={close}
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          p: 2,
        }}
      >
        <Image
          src="/roostr_logo.png"
          alt="Roostr"
          width={138}
          height={60}
          priority
          style={{ height: 48, width: "auto" }}
        />
      </Box>
      <Divider />

      {/* Mini profile / login */}
      <Box sx={{ p: 2 }}>
        {user ? (
          <Box
            component={Link}
            href="/profile"
            onClick={close}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.5,
              textDecoration: "none",
              color: "inherit",
            }}
          >
            <Avatar
              src={user.photoUrl}
              alt={user.name}
              sx={{ width: 40, height: 40 }}
            >
              {user.name.charAt(0) || "?"}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" noWrap>
                {user.name}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mt: 0.25,
                  color: "text.secondary",
                }}
              >
                {typeof coinBalance === "number" && (
                  <Box
                    title="Corn Coin"
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Image
                      src="/corn-coin.png"
                      alt="Corn Coin"
                      width={18}
                      height={17}
                      style={{ height: 16, width: "auto" }}
                    />
                    <Typography variant="body2" noWrap>
                      {coinBalance.toLocaleString()}
                    </Typography>
                  </Box>
                )}
                {energy && (
                  <Box
                    title={feathersLabel ?? "Feathers"}
                    sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                  >
                    <Image
                      src="/feather.png"
                      alt={feathersLabel ?? "Feathers"}
                      width={16}
                      height={16}
                      style={{ height: 16, width: "auto" }}
                    />
                    <Typography variant="body2" noWrap>
                      {energy.current}/{energy.max}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {loginLabel}
            </Typography>
            <TelegramLoginButton botUsername={botUsername} />
          </Box>
        )}
      </Box>
      <Divider />

      {navList(mainNav)}

      <Box sx={{ flexGrow: 1 }} />

      <Divider />
      {navList(bottomNav)}
    </Box>
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100dvh" }}>
      {/* Mobile top bar */}
      <AppBar
        position="fixed"
        color="default"
        elevation={1}
        sx={{
          display: { md: "none" },
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <IconButton
            edge="start"
            onClick={() => setMobileOpen(true)}
            aria-label="open menu"
          >
            ☰
          </IconButton>
          <Image
            src="/roostr_logo.png"
            alt="Roostr"
            width={92}
            height={40}
            priority
            style={{ height: 32, width: "auto" }}
          />
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
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        {/* spacer for the mobile app bar */}
        <Toolbar sx={{ display: { md: "none" } }} />
        <Box sx={{ flexGrow: 1 }}>{children}</Box>
        <Footer />
      </Box>
    </Box>
  );
}
