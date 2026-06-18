"use client";

import { createTheme } from "@mui/material/styles";

// --- Design tokens (Neo-Arcade, Day Mode) ---
// Source of truth for the app's design system. Extend here, not ad-hoc in sx.

declare module "@mui/material/styles" {
  interface Palette {
    tertiary: Palette["primary"];
    neutral: Palette["primary"];
  }
  interface PaletteOptions {
    tertiary?: PaletteOptions["primary"];
    neutral?: PaletteOptions["primary"];
  }
}

declare module "@mui/material/Button" {
  interface ButtonPropsColorOverrides {
    tertiary: true;
    neutral: true;
  }
}

const base = createTheme();

const headlineFamily = "var(--font-headline), system-ui, sans-serif";
const bodyFamily = "var(--font-body), system-ui, sans-serif";

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0099CC" },
    secondary: { main: "#D600CC" },
    // Custom palette colors must be augmented (standard MUI pattern).
    tertiary: base.palette.augmentColor({
      color: { main: "#C29C00" },
      name: "tertiary",
    }),
    neutral: base.palette.augmentColor({
      color: { main: "#2D2D32" },
      name: "neutral",
    }),
    background: { default: "#ECECEF", paper: "#F5F5F7" },
    text: { primary: "#1C1C1F", secondary: "#5A5A60" },
    divider: "rgba(0,0,0,0.10)",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: bodyFamily,
    h1: { fontFamily: headlineFamily, fontWeight: 800 },
    h2: { fontFamily: headlineFamily, fontWeight: 800 },
    h3: { fontFamily: headlineFamily, fontWeight: 700 },
    h4: { fontFamily: headlineFamily, fontWeight: 700 },
    h5: { fontFamily: headlineFamily, fontWeight: 700 },
    h6: { fontFamily: headlineFamily, fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 10 } },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: { borderRadius: 16, border: "1px solid rgba(0,0,0,0.08)" },
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 16 } },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: { root: { borderRadius: 10 } },
    },
  },
});

export default theme;
