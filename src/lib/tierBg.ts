// Avatar backdrop tinted by tier. Uses the tier's own color (D gray, C brown,
// B blue, A green, S purple, R orange, X gold) as a muted dark gradient so the
// pixel art still reads on top.
function clamp8(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function shade(hex: string, amount: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const target = amount < 0 ? 0 : 255;
  const t = Math.min(1, Math.abs(amount));
  const mix = (c: number) => clamp8(c + (target - c) * t);
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

export function tierBackground(color: string): string {
  return `radial-gradient(circle at 50% 32%, ${shade(color, -0.1)}, ${shade(color, -0.6)} 78%)`;
}
