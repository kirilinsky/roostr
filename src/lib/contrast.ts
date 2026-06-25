import theme from "@/theme";

// Readable text color over an arbitrary background hex (tier / gene / swatch color).
// Uses the design-system theme's contrast logic instead of hardcoded hexes, so it
// tracks `text.primary` if the palette changes. Single source for all callers.
export function contrastText(hex: string): string {
  try {
    return theme.palette.getContrastText(hex);
  } catch {
    return theme.palette.text.primary;
  }
}
