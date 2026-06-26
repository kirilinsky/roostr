"use client";

import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// --- Design tokens (Neo-Arcade Day Mode) ---
// Modern Brutalism × pixel-art: sharp corners (0 radius), thick ink borders, hard
// (un-blurred) offset shadows, uppercase display headings. Source of truth for the
// app's design system — extend HERE, never ad-hoc in sx.

const INK = "#2D2D32"; // borders / shadows / text — pure black avoided
const INSET = "#E1E1E1"; // level-1 inset surface

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

// `<Card variant="surface">` — a level-1 INSET panel (grey fill, ink border, no hard
// shadow). Default `<Card>` is an ELEVATED white panel with the 4px hard shadow.
declare module "@mui/material/Card" {
  interface CardPropsVariantOverrides {
    surface: true;
  }
}
// Card's ownerState.variant is typed from Paper — augment both so the `variant`
// prop is accepted AND the styleOverrides comparison type-checks.
declare module "@mui/material/Paper" {
  interface PaperPropsVariantOverrides {
    surface: true;
  }
}

const base = createTheme();

const headlineFamily = "var(--font-headline), system-ui, sans-serif";
const bodyFamily = "var(--font-body), system-ui, sans-serif";

// The signature hard shadow: a solid ink offset, no blur (4px down/right).
const hardShadow = `4px 4px 0 ${INK}`;

// Mobile (below `sm` = phones) trims the chrome a touch so dense screens fit:
// 1px ink borders instead of 2px, tighter gutters, smaller card padding. Lives
// here so the design system stays the single source — never inline per-screen.
const mobile = base.breakpoints.down("sm");

const theme = createTheme({
  palette: {
    mode: "light",
    primary: { main: "#0099CC" }, // Cyber Blue
    secondary: { main: "#D600CC" }, // Electric Magenta
    error: { main: "#BA1A1A" },
    // Custom palette colors must be augmented (standard MUI pattern).
    tertiary: base.palette.augmentColor({
      color: { main: "#C29C00" }, // Legendary Gold
      name: "tertiary",
    }),
    neutral: base.palette.augmentColor({
      color: { main: INK },
      name: "neutral",
    }),
    background: { default: "#F5F5F7", paper: "#FFFFFF" },
    text: { primary: INK, secondary: "#5A5A60" },
    divider: INK,
  },
  // Sharp, grid-based — no rounded corners anywhere by default.
  shape: { borderRadius: 0 },
  typography: {
    fontFamily: bodyFamily,
    // Display headings: Anybody, heavy, UPPERCASE (arcade "Insert Coin" feel).
    h1: { fontFamily: headlineFamily, fontWeight: 900, textTransform: "uppercase" },
    h2: { fontFamily: headlineFamily, fontWeight: 800, textTransform: "uppercase" },
    h3: { fontFamily: headlineFamily, fontWeight: 800, textTransform: "uppercase" },
    h4: { fontFamily: headlineFamily, fontWeight: 800, textTransform: "uppercase" },
    h5: { fontFamily: headlineFamily, fontWeight: 700, textTransform: "uppercase" },
    h6: { fontFamily: headlineFamily, fontWeight: 700, textTransform: "uppercase" },
    overline: { fontWeight: 700, letterSpacing: "0.08em" },
    button: { textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.04em" },
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true, disableRipple: true },
      styleOverrides: {
        root: { borderRadius: 0 },
        // Contained = physical key: ink border + hard shadow, "presses" on click.
        contained: {
          border: `2px solid ${INK}`,
          boxShadow: hardShadow,
          transition: "transform 80ms, box-shadow 80ms",
          "&:hover": {
            boxShadow: `2px 2px 0 ${INK}`,
            transform: "translate(2px, 2px)",
          },
          "&:active": { boxShadow: "none", transform: "translate(4px, 4px)" },
          "&.Mui-disabled": { boxShadow: "none", transform: "none" },
          [mobile]: { borderWidth: 1 },
        },
        outlined: {
          borderWidth: 2,
          "&:hover": { borderWidth: 2 },
          [mobile]: { borderWidth: 1, "&:hover": { borderWidth: 1 } },
        },
      },
    },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: ({ ownerState }) => ({
          borderRadius: 0,
          border: `2px solid ${INK}`,
          [mobile]: { borderWidth: 1 },
          ...(ownerState.variant === "surface"
            ? { backgroundColor: INSET, boxShadow: "none" }
            : { boxShadow: hardShadow }),
        }),
      },
    },
    MuiPaper: {
      styleOverrides: { rounded: { borderRadius: 0 } },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontWeight: 700,
          letterSpacing: "0.04em",
          border: `1px solid ${INK}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          "& .MuiOutlinedInput-notchedOutline": { borderWidth: 2, borderColor: INK },
          // Focus = Legendary Gold inner border.
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "#C29C00",
          },
          [mobile]: {
            "& .MuiOutlinedInput-notchedOutline": { borderWidth: 1 },
          },
        },
      },
    },
    MuiLinearProgress: {
      styleOverrides: { root: { borderRadius: 0, border: `1px solid ${INK}` } },
    },
    // Mobile: tighter page gutters (12px vs the 16px default) so wide content fits.
    MuiContainer: {
      styleOverrides: {
        root: {
          [mobile]: {
            paddingLeft: base.spacing(1.5),
            paddingRight: base.spacing(1.5),
          },
        },
      },
    },
    // Mobile: shave card inner padding a touch (12px vs 16px) for dense screens.
    MuiCardContent: {
      styleOverrides: {
        root: {
          [mobile]: { padding: base.spacing(1.5), "&:last-child": { paddingBottom: base.spacing(1.5) } },
        },
      },
    },
  },
});

// responsiveFontSizes scales every typography variant DOWN on smaller breakpoints
// (mobile gets the smallest sizes) — keeps headlines from overflowing on phones.
export default responsiveFontSizes(theme);
