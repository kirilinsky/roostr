// Readable text color over an arbitrary background hex (tier / gene / swatch color).
// PURE — no theme import. The theme module is "use client"; importing its default
// export into a Server Component yields a client-reference proxy whose `.palette` is
// undefined (crash: "Cannot read properties of undefined (reading 'text')"). Computing
// contrast from the hex directly runs safely in both server and client components.
const INK = "#2D2D32"; // == theme palette text.primary / border ink (Neo-Arcade)

export function contrastText(hex: string): string {
  const c = (hex || "").replace("#", "").trim();
  const full =
    c.length === 3
      ? c
          .split("")
          .map((x) => x + x)
          .join("")
      : c;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  if ([r, g, b].some((n) => Number.isNaN(n))) return INK;
  // Perceived (sRGB-weighted) luminance, 0..1. Bright bg → ink text; dark bg → white.
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.55 ? INK : "#FFFFFF";
}
