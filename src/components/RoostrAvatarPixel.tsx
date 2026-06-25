"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  COLOR_HEX,
  type Breed,
  type ColorSet,
  type WeightClass,
} from "@/lib/roostr";

// Detailed pixel-art avatar (the only renderer — matches the brand: logo + gene
// assets are pixel art). We rasterize primitives into a high-res pixel grid, then add a
// shade layer (belly shadow, highlights, feather edges) on top of a single
// diagonal light. Rendered to a tiny canvas scaled up with image-rendering:
// pixelated — crisp and cheap even with many cards on screen.
//
// No hand-authored bezier curves: an ellipse at 48px is just a clean pixel blob.
// Breed `tags` toggle structural detail (crest, hooked beak, longtail, …).

// Coordinates in buildGrid are authored in a 64-unit DESIGN space; the grid is
// rasterized at GRID = D * S so curves/feathers come out smooth and detailed.
const D = 64;
const S = 5;
const GRID = D * S; // 320 native
const BEAK_HEX = "#E9A23B";
const OUTLINE = "#15151b";
const EYE_WHITE = "#fbf6ea";
const PUPIL = "#0e1018";

// region ids
const E = 0;
const OUT = 1;
const BODY = 2;
const WING = 3;
const TAIL = 4;
const HACKLE = 5;
const COMB = 6;
const WATTLE = 7;
const BEAK = 8;
const EYE_W = 9;
const EYE_I = 10;
const EYE_P = 11;
const LEG = 12;
const SADDLE = 13;
const BARE_NECK = 14;

const WEIGHT_PX: Record<string, { rx: number; ry: number }> = {
  tiny: { rx: 12, ry: 11 },
  light: { rx: 13, ry: 12 },
  middle: { rx: 16, ry: 14 },
  heavy: { rx: 18, ry: 15 },
  huge: { rx: 20, ry: 16 },
};

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

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
function rgbHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => clamp8(c).toString(16).padStart(2, "0"))
    .join("")}`;
}
// blend two hex colors, t = 0..1
function lerpHex(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexRgb(a);
  const [r2, g2, b2] = hexRgb(b);
  return rgbHex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}
function hash01(x: number, y: number, seed: number): number {
  let n = (x * 374761393 + y * 668265263 + seed * 1442695041) >>> 0;
  n = (n ^ (n >>> 13)) >>> 0;
  n = Math.imul(n, 1274126177) >>> 0;
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
function smooth01(t: number): number {
  return t * t * (3 - 2 * t);
}
function lerpNum(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function fract(n: number): number {
  return n - Math.floor(n);
}
function valueNoise(dx: number, dy: number, scale: number, seed: number): number {
  const sx = dx / scale;
  const sy = dy / scale;
  const x0 = Math.floor(sx);
  const y0 = Math.floor(sy);
  const tx = smooth01(fract(sx));
  const ty = smooth01(fract(sy));
  const a = hash01(x0, y0, seed);
  const b = hash01(x0 + 1, y0, seed);
  const c = hash01(x0, y0 + 1, seed);
  const d = hash01(x0 + 1, y0 + 1, seed);
  return lerpNum(lerpNum(a, b, tx), lerpNum(c, d, tx), ty);
}
function periodicLine(v: number, width: number): number {
  const dist = Math.abs(fract(v) - 0.5) * 2;
  return Math.max(0, 1 - dist / width);
}
function materialTexture(id: number, x: number, y: number, seed: number): number {
  const dx = x / S;
  const dy = y / S;
  const coarse = valueNoise(dx, dy, 5.4, seed + id * 37) - 0.5;
  const grain = valueNoise(dx + 19, dy - 11, 2.6, seed + id * 73) - 0.5;
  let amt = coarse * 0.03 + grain * 0.012;

  if (id === BODY) {
    const softRows = periodicLine(dy / 4.2 + Math.sin(dx * 0.28 + seed) * 0.08, 0.22);
    const broken = valueNoise(dx + 31, dy, 3.8, seed + 101);
    amt -= softRows * broken * 0.025;
    amt += periodicLine(dy / 4.2 + 0.18 + Math.sin(dx * 0.28 + seed) * 0.08, 0.16) * 0.012;
  } else if (id === WING) {
    const vane = dx * 0.42 + dy * 0.68 + seed * 0.07;
    amt -= periodicLine(vane / 2.6, 0.18) * 0.055;
    amt += periodicLine(vane / 2.6 + 0.16, 0.13) * 0.022;
  } else if (id === HACKLE || id === SADDLE) {
    const flow = dx * 0.62 - dy * 0.28 + Math.sin(dy * 0.18) * 0.24 + seed * 0.05;
    amt -= periodicLine(flow / 2.1, 0.17) * 0.052;
    amt += periodicLine(flow / 2.1 + 0.2, 0.12) * 0.026;
  } else if (id === TAIL) {
    const vane = dx * 0.68 + dy * 0.22 + Math.sin(dy * 0.22) * 0.45 + seed * 0.09;
    amt -= periodicLine(vane / 2.7, 0.2) * 0.06;
    amt += periodicLine(vane / 2.7 + 0.22, 0.12) * 0.032;
  } else if (id === COMB || id === WATTLE) {
    amt += (valueNoise(dx, dy, 3.2, seed + 211) - 0.5) * 0.055;
    amt += periodicLine((dx + dy * 0.45) / 5.2 + seed * 0.03, 0.12) * -0.016;
  } else if (id === LEG || id === BEAK || id === BARE_NECK) {
    const rings = periodicLine(dy / 2.9 + seed * 0.05, 0.15);
    amt -= rings * 0.026;
    if (id === BEAK) amt += periodicLine(dx / 5.6 + dy / 11 + seed * 0.02, 0.18) * 0.018;
  }

  return amt;
}
function edgeShade(ids: Int8Array, x: number, y: number, id: number): number {
  let edge = 0;
  let seam = 0;
  const check = (xx: number, yy: number) => {
    if (!inb(xx, yy)) return;
    const nid = ids[at(xx, yy)];
    if (nid === id) return;
    if (nid === E || nid === OUT) edge++;
    else seam++;
  };
  check(x - 1, y);
  check(x + 1, y);
  check(x, y - 1);
  check(x, y + 1);
  return edge * -0.028 + seam * -0.014;
}
// box-blur the shade layer so light/shadow read as soft gradients, not blocky
// steps — the core "hybrid" move toward the painterly reference art.
function blurShade(sh: Int8Array): Float32Array {
  const out = new Float32Array(GRID * GRID);
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      let sum = 0;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || xx >= GRID || yy < 0 || yy >= GRID) continue;
          sum += sh[yy * GRID + xx];
          n++;
        }
      out[y * GRID + x] = sum / n;
    }
  return out;
}

// --- grid helpers ---
// Public ops (set/addSh/ellipse/line/quad) take 64-unit DESIGN coordinates and
// rasterize into the GRID (256) pixel grid, so shapes come out smooth/detailed.
// `half` thickness is in DESIGN units and scaled to keep stroke proportions.
type Grid = { ids: Int8Array; sh: Int8Array };
type EyeVariant = "alert" | "fierce";
type BodyShape = "standard" | "compact" | "deep" | "athletic" | "round";
type LegVariant = "standard" | "long" | "heavy" | "feathered";
type TailVariant = "standard" | "long" | "short" | "upright" | "fan";
const at = (x: number, y: number) => y * GRID + x;
const inb = (x: number, y: number) => x >= 0 && x < GRID && y >= 0 && y < GRID;
const halfPx = (half: number) => Math.round(half * S + (S - 1) / 2);

// low-level PIXEL-space writes
function put(g: Grid, px: number, py: number, id: number) {
  if (inb(px, py)) g.ids[at(px, py)] = id;
}
function putSh(g: Grid, px: number, py: number, d: number) {
  if (inb(px, py)) {
    const v = g.sh[at(px, py)] + d;
    g.sh[at(px, py)] = Math.max(-4, Math.min(4, v));
  }
}
// DESIGN cell → S×S pixel block
function set(g: Grid, x: number, y: number, id: number) {
  const bx = Math.round(x * S);
  const by = Math.round(y * S);
  for (let dy = 0; dy < S; dy++)
    for (let dx = 0; dx < S; dx++) put(g, bx + dx, by + dy, id);
}
function addSh(g: Grid, x: number, y: number, d: number) {
  const bx = Math.round(x * S);
  const by = Math.round(y * S);
  for (let dy = 0; dy < S; dy++)
    for (let dx = 0; dx < S; dx++) putSh(g, bx + dx, by + dy, d);
}
function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, id: number) {
  const CX = cx * S;
  const CY = cy * S;
  const RX = rx * S;
  const RY = ry * S;
  for (let y = Math.floor(CY - RY); y <= Math.ceil(CY + RY); y++)
    for (let x = Math.floor(CX - RX); x <= Math.ceil(CX + RX); x++) {
      const dx = (x - CX) / RX;
      const dy = (y - CY) / RY;
      if (dx * dx + dy * dy <= 1.04) put(g, x, y, id);
    }
}
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, half: number, id: number) {
  const X0 = x0 * S;
  const Y0 = y0 * S;
  const X1 = x1 * S;
  const Y1 = y1 * S;
  const H = halfPx(half);
  const steps = Math.ceil(Math.hypot(X1 - X0, Y1 - Y0)) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(X0 + (X1 - X0) * t);
    const cy = Math.round(Y0 + (Y1 - Y0) * t);
    for (let dy = -H; dy <= H; dy++)
      for (let dx = -H; dx <= H; dx++) put(g, cx + dx, cy + dy, id);
  }
}
// quadratic bezier swept with thickness `half`, painting id (or shading if id<0)
function quad(
  g: Grid,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  half: number,
  id: number,
  shd = 0,
) {
  const X0 = x0 * S;
  const Y0 = y0 * S;
  const CX = cx * S;
  const CY = cy * S;
  const X1 = x1 * S;
  const Y1 = y1 * S;
  const H = halfPx(half);
  const steps = Math.ceil(Math.hypot(X1 - X0, Y1 - Y0)) + 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const px = mt * mt * X0 + 2 * mt * t * CX + t * t * X1;
    const py = mt * mt * Y0 + 2 * mt * t * CY + t * t * Y1;
    const rxp = Math.round(px);
    const ryp = Math.round(py);
    for (let dy = -H; dy <= H; dy++)
      for (let dx = -H; dx <= H; dx++) {
        if (id >= 0) put(g, rxp + dx, ryp + dy, id);
        if (shd) putSh(g, rxp + dx, ryp + dy, shd);
      }
  }
}

function drawEye(g: Grid, ex: number, ey: number, variant: EyeVariant) {
  if (variant === "fierce") {
    // Narrow, angled eye: white still visible, but the dark brow makes it read
    // sharper and more game-bird-like.
    ellipse(g, ex, ey, 2.0, 1.05, EYE_W);
    ellipse(g, ex + 0.9, ey, 1, 1, EYE_I);
    set(g, ex + 1, ey, EYE_P);
    set(g, ex + 0.3, ey - 0.6, EYE_W);
    line(g, ex - 2.5, ey - 1.9, ex + 2.7, ey - 0.8, 0, OUT);
    quad(g, ex - 1.8, ey + 1.2, ex + 0.2, ey + 1.45, ex + 2, ey + 0.95, 0, -1, -2);
    addSh(g, ex + 2, ey + 1, -1);
    return;
  }

  // Round, alert eye: larger sclera, clear iris ring and a bright catch-light.
  ellipse(g, ex, ey, 2.2, 2.0, EYE_W);
  ellipse(g, ex + 0.8, ey, 1.15, 1.25, EYE_I);
  set(g, ex + 1, ey, EYE_P);
  set(g, ex + 0.1, ey - 1.1, EYE_W);
  quad(g, ex - 1.8, ey + 1.75, ex + 0.1, ey + 2.15, ex + 1.9, ey + 1.65, 0, -1, -2);
  line(g, ex - 1.8, ey - 2.3, ex + 1.5, ey - 2.6, 0, OUT);
  addSh(g, ex + 2, ey + 2, -1);
}

function drawBeak(g: Grid, bx: number, by: number, hooked: boolean) {
  const len = hooked ? 7.4 : 5.5;
  const tipDrop = hooked ? 1.7 : 0.35;
  const tipX = bx + len;
  const tipY = by + tipDrop;

  // Upper mandible: broad at the cheek, tapered to a point.
  for (let k = 0; k <= Math.ceil(len); k++) {
    const t = Math.min(1, k / len);
    const cx = bx + k;
    const centerY = by - 0.45 + (hooked ? t * t * 0.95 : t * 0.12);
    const half = (1 - t) * 1.55 + 0.18;
    line(g, cx, centerY - half, cx, centerY + half * 0.35, 0, BEAK);
  }

  // Lower mandible is smaller and darker, separated from the upper beak.
  for (let k = 0; k <= Math.ceil(len * 0.72); k++) {
    const t = Math.min(1, k / (len * 0.72));
    const cx = bx + k;
    const centerY = by + 1.15 + t * 0.12;
    const half = (1 - t) * 0.78 + 0.08;
    line(g, cx, centerY - half * 0.2, cx, centerY + half, 0, BEAK);
    addSh(g, cx, centerY + half, -1);
  }

  // Hooked breeds get a distinct downturned tip.
  if (hooked) {
    quad(g, tipX - 1.4, tipY - 0.4, tipX + 0.45, tipY + 0.7, tipX - 0.3, tipY + 1.8, 0.75, BEAK);
    quad(g, tipX - 1.1, tipY + 0.2, tipX + 0.1, tipY + 1.1, tipX - 0.6, tipY + 1.7, 0, -1, -2);
  }

  // Mouth seam, nostril and small highlights.
  quad(g, bx + 0.6, by + 0.45, bx + len * 0.48, by + 0.6, bx + len * 0.84, by + 0.28 + tipDrop * 0.4, 0, -1, -2);
  addSh(g, bx + 1.4, by - 0.65, -3);
  addSh(g, bx + 1, by - 1.35, 2);
  addSh(g, bx + 2, by - 1.2, 1);
  addSh(g, bx + 1, by + 1.55, -2);
}

function chooseBodyShape(tags: Set<string>, weightId: string, seed: number): BodyShape {
  if (
    tags.has("tiny") ||
    tags.has("small") ||
    tags.has("sprightly") ||
    tags.has("fast") ||
    tags.has("swift")
  ) {
    return "compact";
  }
  if (
    tags.has("fighter") ||
    tags.has("game") ||
    tags.has("duelist") ||
    tags.has("hard-feather") ||
    tags.has("reach")
  ) {
    return "athletic";
  }
  if (
    tags.has("giant") ||
    tags.has("largest") ||
    tags.has("heavy") ||
    tags.has("tank") ||
    tags.has("meat") ||
    weightId === "huge"
  ) {
    return "deep";
  }
  if (tags.has("fluffy") || tags.has("soft") || tags.has("round")) {
    return "round";
  }

  const variants: BodyShape[] = ["standard", "compact", "athletic", "round"];
  return variants[Math.abs(Math.trunc(seed)) % variants.length];
}

function chooseLegVariant(tags: Set<string>, weightId: string): LegVariant {
  if (tags.has("feathered-feet") || tags.has("fluffy") || tags.has("soft")) {
    return "feathered";
  }
  if (
    tags.has("fighter") ||
    tags.has("game") ||
    tags.has("duelist") ||
    tags.has("tall") ||
    tags.has("reach") ||
    tags.has("hard-feather")
  ) {
    return "long";
  }
  if (
    tags.has("giant") ||
    tags.has("largest") ||
    tags.has("heavy") ||
    tags.has("tank") ||
    tags.has("meat") ||
    weightId === "huge"
  ) {
    return "heavy";
  }
  return "standard";
}

function chooseTailVariant(tags: Set<string>, weightId: string, seed: number): TailVariant {
  if (tags.has("longtail")) return "long";
  if (
    tags.has("fighter") ||
    tags.has("game") ||
    tags.has("hard-feather") ||
    tags.has("tall") ||
    tags.has("duelist")
  ) {
    return "upright";
  }
  if (
    tags.has("giant") ||
    tags.has("heavy") ||
    tags.has("round") ||
    tags.has("fluffy") ||
    tags.has("tank") ||
    weightId === "huge"
  ) {
    return "fan";
  }
  if (tags.has("tiny") || tags.has("small") || tags.has("naked-neck")) {
    return "short";
  }

  const variants: TailVariant[] = ["standard", "short", "upright"];
  return variants[Math.abs(Math.trunc(seed >> 2)) % variants.length];
}

function drawTail(g: Grid, bodyCx: number, bodyCy: number, rx: number, ry: number, variant: TailVariant) {
  const tbx = bodyCx - rx + 5;
  const tby = bodyCy - 2;
  const config: Record<
    TailVariant,
    { n: number; reach: number; startDeg: number; spreadDeg: number; baseRx: number; baseRy: number; half: number }
  > = {
    standard: { n: 5, reach: rx + 8, startDeg: -64, spreadDeg: 58, baseRx: 5, baseRy: 6, half: 1 },
    long: { n: 8, reach: rx + ry + 20, startDeg: -52, spreadDeg: 92, baseRx: 5.5, baseRy: 7, half: 0.9 },
    short: { n: 4, reach: rx + 1, startDeg: -68, spreadDeg: 48, baseRx: 4.5, baseRy: 5.2, half: 1.25 },
    upright: { n: 5, reach: rx + 11, startDeg: -82, spreadDeg: 62, baseRx: 4.8, baseRy: 6.2, half: 1.05 },
    fan: { n: 6, reach: rx + 5, startDeg: -48, spreadDeg: 82, baseRx: 6.5, baseRy: 7.2, half: 1.35 },
  };
  const cfg = config[variant];

  ellipse(g, tbx, tby + 2, cfg.baseRx, cfg.baseRy, TAIL);
  if (variant === "fan") ellipse(g, tbx - 2, tby + 3, cfg.baseRx * 0.9, cfg.baseRy * 0.72, TAIL);

  for (let i = 0; i < cfg.n; i++) {
    const f = cfg.n === 1 ? 0 : i / (cfg.n - 1);
    const angleDeg = cfg.startDeg - f * cfg.spreadDeg;
    const ang = angleDeg * (Math.PI / 180);
    const len =
      cfg.reach *
      (variant === "long"
        ? 0.55 + 0.55 * f
        : variant === "fan"
          ? 0.7 + 0.25 * Math.sin(f * Math.PI)
          : 0.66 + 0.34 * f);
    const ox = Math.cos(ang);
    const oy = Math.sin(ang);
    const ex = tbx + ox * len;
    const ey = tby + oy * len;
    const bend = variant === "long" ? 0.42 : variant === "upright" ? 0.18 : 0.28;
    const ca = ang - bend;
    const mx = tbx + Math.cos(ca) * len * (variant === "short" ? 0.48 : 0.6);
    const my = tby + Math.sin(ca) * len * (variant === "short" ? 0.48 : 0.6);
    quad(g, tbx, tby, mx, my, ex, ey, cfg.half, TAIL);

    const px = -oy;
    const py = ox;
    quad(g, tbx + px, tby + py, mx + px, my + py, ex + px, ey + py, 0, -1, -2);
    quad(g, tbx - px, tby - py, mx - px, my - py, ex - px, ey - py, 0, -1, 1);

    if (variant === "long" && i >= cfg.n - 3) {
      quad(g, tbx - 1, tby + 1, mx - 2, my + 2, ex - 3, ey + 3, 0, -1, -1);
    }
  }

  if (variant === "short") {
    quad(g, tbx + 1, tby - 2, tbx - 2, tby - 8, tbx - 7, tby - 11, 1.2, TAIL);
  } else if (variant === "upright") {
    quad(g, tbx + 1, tby, tbx - 1, tby - 10, tbx - 4, tby - 19, 1, TAIL);
  }
}

function drawLegs({
  g,
  bodyCx,
  bodyCy,
  rx,
  ry,
  tags,
  variant,
}: {
  g: Grid;
  bodyCx: number;
  bodyCy: number;
  rx: number;
  ry: number;
  tags: Set<string>;
  variant: LegVariant;
}) {
  const footY = variant === "long" ? 61 : 60;
  const legTop = bodyCy + ry - (variant === "long" ? 2 : 1);
  const stance =
    variant === "heavy" ? 0.58 : variant === "long" ? 0.64 : variant === "feathered" ? 0.48 : 0.52;
  const legWidth = variant === "heavy" ? 2 : 1;
  const toeReach = variant === "long" ? 5 : variant === "heavy" ? 4.2 : 4;
  const toeDrop = variant === "long" ? 3.6 : variant === "heavy" ? 2.4 : 3;
  const backToe = variant === "long" ? 4 : 3;
  const legLean = variant === "long" ? 1.2 : variant === "heavy" ? 0.35 : 0.65;
  const lx1 = bodyCx - (variant === "heavy" ? 1 : 0);
  const lx2 = bodyCx + Math.round(rx * stance);

  for (const [i, lx] of [lx1, lx2].entries()) {
    const lean = (i === 0 ? -legLean : legLean) * 0.45;
    const ankleX = lx + lean;

    // Shank with slight natural lean. Heavy legs are thicker, long legs slimmer.
    for (let w = 0; w < legWidth; w++) {
      line(g, lx + w, legTop, ankleX + w, footY, 0, LEG);
    }
    if (variant !== "long") line(g, lx + legWidth, legTop + 1, ankleX + legWidth, footY, 0, LEG);

    // Scale bands, staggered so legs read as segmented instead of plain sticks.
    for (let yy = legTop + 1; yy <= footY; yy++) {
      if ((yy - legTop) % 2 === 0) {
        addSh(g, ankleX, yy, -1);
        if (legWidth > 1) addSh(g, ankleX + 1, yy, -1);
      }
    }

    // Feathered breeds get hock/foot puffs that partially cover the shank.
    if (variant === "feathered") {
      ellipse(g, lx + 0.5, legTop + 1.5, 3.2, 3.3, BODY);
      ellipse(g, ankleX + 0.5, footY - 1.5, 3.4, 2.5, BODY);
      quad(g, lx - 2, legTop + 1, lx - 1, legTop + 4, ankleX - 1, footY - 2, 0, -1, -2);
    }

    // Toes: spread changes by variant. Long/game birds get longer talons; heavy
    // birds get shorter, wider stance.
    line(g, ankleX, footY, ankleX + toeReach, footY + 0.8, 0, LEG);
    line(g, ankleX, footY, ankleX + toeReach * 0.72, footY + toeDrop, 0, LEG);
    line(g, ankleX, footY, ankleX + 0.8, footY + toeDrop + 1.2, 0, LEG);
    line(g, ankleX, footY, ankleX - backToe, footY + 1, 0, LEG);
    if (variant === "heavy") {
      line(g, ankleX + 1, footY, ankleX + toeReach * 0.78, footY + 1.6, 0, LEG);
    }

    // Claws stay small so the global outline does not make them too chunky.
    set(g, ankleX + toeReach + 0.8, footY + 1, OUT);
    set(g, ankleX + toeReach * 0.75 + 0.8, footY + toeDrop + 0.5, OUT);
    set(g, ankleX + 0.8, footY + toeDrop + 2, OUT);
    set(g, ankleX - backToe - 0.8, footY + 1, OUT);

    // Spurs: fighter/game birds get a longer back-pointing spur; multi-spur adds
    // a second higher point.
    const spurLen = variant === "long" ? 3 : 2;
    line(g, ankleX - 0.4, footY - 3.5, ankleX - spurLen, footY - 4.8, 0, LEG);
    set(g, ankleX - spurLen - 0.8, footY - 5, OUT);
    if (tags.has("multi-spur")) {
      line(g, ankleX - 0.4, footY - 5.2, ankleX - spurLen - 1, footY - 7.1, 0, LEG);
      set(g, ankleX - spurLen - 1.8, footY - 7.4, OUT);
    }
  }
}

function buildGrid(
  weightId: string,
  tags: Set<string>,
  eyeVariant: EyeVariant,
  bodyShape: BodyShape,
  legVariant: LegVariant,
  tailVariant: TailVariant,
): Grid {
  const g: Grid = { ids: new Int8Array(GRID * GRID), sh: new Int8Array(GRID * GRID) };
  const sz = WEIGHT_PX[weightId] ?? WEIGHT_PX.middle;
  const tall = tags.has("tall");
  let rx = sz.rx;
  let ry = sz.ry;
  const bodyCx = 24;
  let bodyCy = 37 - (tall ? 4 : 0);
  let breastForward = 0.5;
  let breastDrop = 0.34;
  let breastRx = 0.6;
  let breastRy = 0.92;
  let saddleBack = 0.42;
  let saddleLift = 0.42;
  let saddleRx = 0.52;
  let saddleRy = 0.58;
  let headForward = 4;
  let headLift = 3;

  switch (bodyShape) {
    case "compact":
      rx = Math.max(10, rx - 2);
      ry = Math.max(9, ry - 1);
      bodyCy += 1;
      breastForward = 0.42;
      breastDrop = 0.28;
      breastRx = 0.5;
      breastRy = 0.78;
      saddleBack = 0.34;
      saddleLift = 0.36;
      headForward = 3;
      headLift = 2;
      break;
    case "deep":
      rx += 1;
      ry += 2;
      bodyCy += 1;
      breastForward = 0.48;
      breastDrop = 0.44;
      breastRx = 0.68;
      breastRy = 1.02;
      saddleBack = 0.48;
      saddleLift = 0.34;
      headForward = 3;
      headLift = 2;
      break;
    case "athletic":
      rx += 1;
      ry = Math.max(10, ry - 2);
      bodyCy -= 1;
      breastForward = 0.58;
      breastDrop = 0.18;
      breastRx = 0.48;
      breastRy = 0.72;
      saddleBack = 0.5;
      saddleLift = 0.5;
      saddleRx = 0.6;
      saddleRy = 0.5;
      headForward = 5;
      headLift = 4;
      break;
    case "round":
      rx = Math.max(10, rx - 1);
      ry += 1;
      breastForward = 0.5;
      breastDrop = 0.36;
      breastRx = 0.76;
      breastRy = 0.95;
      saddleBack = 0.36;
      saddleLift = 0.34;
      saddleRx = 0.48;
      saddleRy = 0.62;
      headForward = 3.5;
      headLift = 2.5;
      break;
  }

  const headR = 8;
  const headCx = bodyCx + rx + headForward;
  const headCy = bodyCy - ry - headLift;

  const hooked =
    tags.has("fighter") || tags.has("game") || tags.has("strong") || tags.has("hard-feather");

  // ---- TAIL: breed-driven silhouettes (short, fan, upright, longtail) ----
  drawTail(g, bodyCx, bodyCy, rx, ry, tailVariant);

  // ---- BODY + breast ----
  ellipse(g, bodyCx, bodyCy, rx, ry, BODY);
  // teardrop: full low breast forward (right) + raised saddle toward the tail (left)
  ellipse(g, bodyCx + rx * breastForward, bodyCy + ry * breastDrop, rx * breastRx, ry * breastRy, BODY); // breast bulge
  ellipse(g, bodyCx - rx * saddleBack, bodyCy - ry * saddleLift, rx * saddleRx, ry * saddleRy, BODY); // saddle rise to tail base
  if (bodyShape === "deep") {
    ellipse(g, bodyCx + rx * 0.1, bodyCy + ry * 0.58, rx * 0.72, ry * 0.42, BODY); // low keel mass
  } else if (bodyShape === "athletic") {
    quad(g, bodyCx - rx * 0.55, bodyCy - ry * 0.22, bodyCx - rx * 0.05, bodyCy - ry * 0.62, bodyCx + rx * 0.62, bodyCy - ry * 0.35, 2, BODY);
  } else if (bodyShape === "round") {
    ellipse(g, bodyCx - rx * 0.1, bodyCy + ry * 0.22, rx * 0.78, ry * 0.76, BODY);
  }

  // shading: belly shadow, back/saddle highlight, breast under-shadow
  // (iterate pixel space, convert back to design units for the body math)
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (g.ids[at(x, y)] !== BODY) continue;
      const ny = (y / S - bodyCy) / ry;
      const nx = (x / S - bodyCx) / rx;
      if (ny > 0.1) putSh(g, x, y, -Math.round(ny * 2.5));
      if (ny < -0.25 && nx < 0.1) putSh(g, x, y, 1);
      if (nx > 0.55 && ny > 0.1) putSh(g, x, y, -1);
      if (bodyShape === "athletic" && nx < -0.15 && ny < -0.05) putSh(g, x, y, 1);
      if (bodyShape === "deep" && ny > 0.45) putSh(g, x, y, -1);
    }
  // breast scallop feather rows (3 rows of small arcs)
  for (let row = 0; row < 3; row++) {
    const yy = bodyCy + 1 + row * 3;
    for (let s = 0; s < 3; s++) {
      const sxx = bodyCx + rx * 0.22 + s * 3.5;
      quad(g, sxx, yy, sxx + 1.6, yy + 2, sxx + 3.2, yy, 0, -1, -2);
    }
  }

  // feathered feet puff
  if (tags.has("feathered-feet")) {
    ellipse(g, bodyCx + 1, bodyCy + ry + 4, 4, 4, BODY);
    ellipse(g, bodyCx + Math.round(rx * 0.5), bodyCy + ry + 4, 4, 4, BODY);
  }

  // ---- WING: covert mass + primaries sweeping DOWN-BACK (toward the tail) ----
  ellipse(g, bodyCx, bodyCy + 1, Math.round(rx * 0.62), Math.round(ry * 0.6), WING);
  for (let k = 0; k < 5; k++) {
    const yy = bodyCy - 3 + k * 2.2;
    // shoulder (front-up) → primaries trailing down-back (left)
    quad(g, bodyCx + rx * 0.45, yy, bodyCx, yy + 3, bodyCx - rx * 0.5, bodyCy + ry * 0.55 + k, 1, WING);
    quad(g, bodyCx + rx * 0.45, yy + 1, bodyCx, yy + 4, bodyCx - rx * 0.5, bodyCy + ry * 0.55 + k + 1, 0, -1, -2); // feather edge
  }
  // covert top highlight (along the leading edge)
  for (let x = bodyCx; x <= bodyCx + rx; x++) addSh(g, x, bodyCy - 2, 1);

  // ---- SADDLE: distinct back feathers between body, hackle and tail ----
  for (let k = 0; k < 5; k++) {
    const t = k / 4;
    const sx = bodyCx - rx * 0.55 + t * rx * 0.95;
    const sy = bodyCy - ry * 0.54 + Math.sin(t * Math.PI) * 1.2;
    const ex2 = sx + rx * 0.34;
    const ey2 = bodyCy - ry * 0.12 + k * 0.55;
    quad(g, sx, sy, sx + rx * 0.18, sy + 3.6, ex2, ey2, 1.1, SADDLE);
    quad(g, sx + 0.8, sy + 0.8, sx + rx * 0.2, sy + 3.8, ex2 - 0.6, ey2 + 0.4, 0, -1, -2);
  }
  for (let x = bodyCx - rx + 3; x <= bodyCx + rx * 0.35; x++) addSh(g, x, bodyCy - ry + 4, 1);

  // ---- HACKLE / mane: layered neck cape, over body but under the head ----
  if (tags.has("naked-neck")) {
    const nx = bodyCx + rx + 1;
    const ny = bodyCy - ry + 4;
    // Bare-neck breeds still need a visible narrow neck bridge. Keep it lean and
    // skin-toned so the missing hackle remains the defining silhouette.
    quad(g, nx, ny, nx + 4, ny - 6, headCx - 3, headCy + headR - 2, 2.1, BARE_NECK);
    quad(g, nx + 1, ny + 2, nx + 5, ny - 3, headCx - 1, headCy + headR + 1, 1.2, BARE_NECK);
    quad(g, nx + 2, ny, nx + 5, ny - 5, headCx - 1, headCy + headR - 1, 0, -1, -2);
    quad(g, nx - 1, ny - 1, nx + 2, ny - 6, headCx - 5, headCy + headR - 3, 0, -1, 1);
  } else {
    const neckTopX = headCx - 5.5;
    const neckTopY = headCy + headR - 3;
    const shoulderX = bodyCx + rx - 6;
    const shoulderY = bodyCy - ry + 5;
    const throatX = headCx + 0.5;
    const throatY = headCy + headR + 1;

    // Broad cape mass, then a front throat lock so the neck reads as layered.
    quad(g, shoulderX, shoulderY, bodyCx + rx + 1, bodyCy - ry - 4, neckTopX, neckTopY, 5.2, HACKLE);
    quad(g, shoulderX + 2, shoulderY + 5, bodyCx + rx + 4, bodyCy - ry + 2, throatX, throatY, 3.4, HACKLE);
    ellipse(g, shoulderX - 1, shoulderY + 5, 4.5, 5.5, HACKLE);

    // Serrated lower tips, like overlapping hackle feathers over the shoulder.
    for (let k = 0; k < 7; k++) {
      const t = k / 6;
      const sx = shoulderX - 4 + t * 13;
      const sy = shoulderY + 4 + Math.sin(t * Math.PI) * 2;
      quad(g, sx, sy, sx + 1.4, sy + 3.4, sx - 0.8, sy + 7.2, 0.8, HACKLE);
      quad(g, sx + 0.8, sy + 1.2, sx + 1.8, sy + 4, sx, sy + 6.8, 0, -1, -2);
    }

    // Directional feather seams and highlights following the neck curve.
    for (let k = 0; k < 8; k++) {
      const t = k / 7;
      const sx = neckTopX - 0.5 + t * 9.5;
      const sy = neckTopY + t * 7.5;
      const cx3 = sx - 1.8 + Math.sin(t * Math.PI) * 2.2;
      const ex3 = shoulderX - 4 + t * 13;
      const ey3 = shoulderY + 7 + Math.cos(t * Math.PI) * 1.3;
      quad(g, sx, sy, cx3, sy + 4, ex3, ey3, 0, -1, -2);
      quad(g, sx - 1, sy - 0.5, cx3 - 1, sy + 3, ex3 - 1.2, ey3 - 0.6, 0, -1, 1);
    }

    // Soft shadow where the cape tucks under the beak/head and onto the shoulder.
    quad(g, throatX, throatY - 1, throatX + 1.5, throatY + 3, shoulderX + 4, shoulderY + 7, 0, -1, -2);
    for (let x = shoulderX - 3; x <= shoulderX + 9; x++) addSh(g, x, shoulderY + 8, -1);
  }

  // ---- HEAD ----
  ellipse(g, headCx, headCy, headR, headR - 1, BODY);
  for (let y = Math.round((headCy - headR) * S); y <= Math.round((headCy + headR) * S); y++)
    for (let x = Math.round((headCx - headR) * S); x <= Math.round((headCx + headR) * S); x++) {
      if (!inb(x, y) || g.ids[at(x, y)] !== BODY) continue;
      if (y / S > headCy) putSh(g, x, y, -1); // cheek/jaw shadow
      if (y / S < headCy - 1 && x / S < headCx) putSh(g, x, y, 1); // crown highlight
    }

  // crest tuft
  if (tags.has("crest")) {
    ellipse(g, headCx - 4, headCy - headR + 1, 3, 4, HACKLE);
    ellipse(g, headCx, headCy - headR, 4, 4, HACKLE);
    ellipse(g, headCx + 4, headCy - headR + 1, 3, 4, HACKLE);
  }

  // ---- COMB: fleshy organic crown with rounded lobes + soft folds ----
  const combBaseY = headCy - headR + 1;
  const combStartX = headCx - 7;
  if (tags.has("crest")) {
    // Crested birds keep most of the comb tucked under the crest.
    quad(g, headCx - 4.5, combBaseY + 0.8, headCx - 1, combBaseY - 0.8, headCx + 3.2, combBaseY + 0.9, 1.3, COMB);
    ellipse(g, headCx - 3.5, combBaseY - 0.6, 1.7, 2.0, COMB);
    ellipse(g, headCx - 0.4, combBaseY - 1.2, 1.9, 2.4, COMB);
    ellipse(g, headCx + 2.6, combBaseY - 0.4, 1.4, 1.9, COMB);
    quad(g, headCx - 3.5, combBaseY + 0.6, headCx - 0.2, combBaseY + 1.2, headCx + 3.2, combBaseY + 0.7, 0, -1, -2);
    addSh(g, headCx - 1, combBaseY - 2, 2);
  } else {
    const tallComb =
      tags.has("fighter") ||
      tags.has("game") ||
      tags.has("proud") ||
      tags.has("long-crower");
    const toothHeights = tallComb
      ? [4.3, 6.2, 7.3, 6.5, 5.2, 3.8]
      : [3.7, 5.4, 6.2, 5.3, 4.0];
    const step = tallComb ? 2.35 : 2.65;
    const baseEnd = combStartX + (toothHeights.length - 1) * step + 2.2;

    // Curved blade base: a soft, thick ridge that follows the skull.
    quad(g, combStartX - 1.2, combBaseY + 0.7, headCx - 3.2, combBaseY - 1.0, baseEnd, combBaseY + 0.9, 1.55, COMB);
    ellipse(g, combStartX - 1.7, combBaseY + 1.3, 1.9, 2.4, COMB); // rear lobe

    for (let i = 0; i < toothHeights.length; i++) {
      const cx2 = combStartX + i * step;
      const h = toothHeights[i];
      const lean = (i - toothHeights.length / 2) * 0.18;
      // Each lobe is rounded and slightly overlaps the next, like a real single comb.
      ellipse(g, cx2 + lean, combBaseY - h * 0.48, 1.5, h * 0.55, COMB);
      quad(g, cx2 - 0.65, combBaseY - 0.1, cx2 + lean * 2, combBaseY - h * 0.82, cx2 + 0.25 + lean, combBaseY - h, 0.75, COMB);
      addSh(g, cx2 - 0.8, combBaseY - h + 0.7, 2);
      addSh(g, cx2 + 0.8, combBaseY - h * 0.24, -1);

      if (i > 0) {
        const foldX = cx2 - step * 0.45;
        quad(g, foldX, combBaseY - 0.4, foldX + 0.5, combBaseY - h * 0.5, foldX + 0.25, combBaseY - h * 0.78, 0, -1, -2);
      }
    }

    // Forward fold falls toward the beak and gives the comb a real attachment.
    quad(g, baseEnd - 0.2, combBaseY + 0.3, baseEnd + 1.7, combBaseY + 1.5, baseEnd + 0.9, combBaseY + 3.0, 1.05, COMB);
    quad(g, baseEnd - 0.6, combBaseY + 1.0, baseEnd + 0.9, combBaseY + 2.0, baseEnd + 0.5, combBaseY + 2.8, 0, -1, -2);

    // Underside shadow anchors the comb to the skull without heavy black lines.
    for (let x = combStartX - 2; x <= baseEnd + 1; x++) addSh(g, x, combBaseY + 1, -1);
  }

  // ---- WATTLE / BEARD ----
  if (tags.has("beard") || tags.has("bearded")) {
    ellipse(g, headCx + 1, headCy + headR, 4, 5, HACKLE);
  } else {
    line(g, headCx + 2, headCy + headR - 1, headCx + 2, headCy + headR + 3, 0, WATTLE);
    set(g, headCx + 3, headCy + headR + 2, WATTLE);
    set(g, headCx + 1, headCy + headR + 2, WATTLE);
  }

  // ---- BEAK: upper/lower mandibles + nostril + optional hook ----
  const bx = headCx + headR - 1;
  drawBeak(g, bx, headCy, hooked);

  // ---- EYE (two deterministic variants: alert round / fierce narrowed) ----
  const ex = headCx + 3;
  const ey = headCy - 1;
  drawEye(g, ex, ey, eyeVariant);

  // ---- LEGS: breed/weight-driven shanks, toes, claws and spurs ----
  drawLegs({ g, bodyCx, bodyCy, rx, ry, tags, variant: legVariant });

  // ---- OUTLINE: 1px dark ring around the silhouette ----
  const out = g.ids.slice();
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (g.ids[at(x, y)] !== E) continue;
      const near =
        (inb(x - 1, y) && g.ids[at(x - 1, y)] > E) ||
        (inb(x + 1, y) && g.ids[at(x + 1, y)] > E) ||
        (inb(x, y - 1) && g.ids[at(x, y - 1)] > E) ||
        (inb(x, y + 1) && g.ids[at(x, y + 1)] > E);
      if (near) out[at(x, y)] = OUT;
    }
  g.ids = out;
  return g;
}

export interface RoostrAvatarPixelProps {
  colors: ColorSet;
  pattern: string;
  breed: Breed;
  weightClass: WeightClass;
  seed: number;
  size?: number;
}

// Fills its parent (a square box). Parents define the size via width + aspect.
export default function RoostrAvatarPixel({
  colors,
  breed,
  weightClass,
  seed,
}: RoostrAvatarPixelProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const tags = useMemo(() => new Set(breed.tags), [breed.tags]);
  const eyeVariant: EyeVariant =
    Math.abs(Math.trunc(seed)) % 2 === 0 ? "alert" : "fierce";
  const bodyShape = useMemo(
    () => chooseBodyShape(tags, weightClass.id, seed),
    [tags, weightClass.id, seed],
  );
  const legVariant = useMemo(
    () => chooseLegVariant(tags, weightClass.id),
    [tags, weightClass.id],
  );
  const tailVariant = useMemo(
    () => chooseTailVariant(tags, weightClass.id, seed),
    [tags, weightClass.id, seed],
  );
  const grid = useMemo(
    () => buildGrid(weightClass.id, tags, eyeVariant, bodyShape, legVariant, tailVariant),
    [weightClass.id, tags, eyeVariant, bodyShape, legVariant, tailVariant],
  );

  const hex = useMemo(
    () => ({
      body: COLOR_HEX.body[colors.body.color] ?? "#b9722e",
      wing: COLOR_HEX.wing[colors.wing.color] ?? "#7b3f2e",
      tail: COLOR_HEX.tail[colors.tail.color] ?? "#222222",
      hackle: COLOR_HEX.hackle[colors.hackle.color] ?? "#c9962f",
      saddle: COLOR_HEX.saddle?.[colors.saddle.color] ?? "#c9962f",
      comb: COLOR_HEX.comb[colors.comb.color] ?? "#c1352b",
      leg: COLOR_HEX.leg[colors.leg.color] ?? "#e3b94e",
      eye: COLOR_HEX.eye[colors.eye.color] ?? "#c8861f",
      beak: COLOR_HEX.beak?.[colors.beak.color] ?? BEAK_HEX,
    }),
    [colors],
  );
  // Tail material effect (e.g. "Iridescent"/"Aurora") drives the feather sheen.
  const tailSheen = colors.tail.effect != null && colors.tail.effect !== "None";

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // 1) paint native-res pixels via ImageData (fast at 320²)
    const off =
      offRef.current ?? (offRef.current = document.createElement("canvas"));
    off.width = GRID;
    off.height = GRID;
    const octx = off.getContext("2d");
    if (!octx) return;

    const sh = blurShade(grid.sh);
    const baseHex = (id: number): string => {
      switch (id) {
        case BODY:
          return hex.body;
        case WING:
          return hex.wing;
        case TAIL:
          return hex.tail;
        case HACKLE:
          return hex.hackle;
        case SADDLE:
          return hex.saddle;
        case COMB:
        case WATTLE:
          return hex.comb;
        case BEAK:
          return hex.beak;
        case EYE_W:
          return EYE_WHITE;
        case EYE_I:
          return hex.eye;
        case EYE_P:
          return PUPIL;
        case LEG:
          return hex.leg;
        case BARE_NECK:
          return lerpHex(hex.leg, hex.beak, 0.28);
        default:
          return hex.body;
      }
    };

    const img = octx.createImageData(GRID, GRID);
    const data = img.data;
    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const p = at(x, y);
        const id = grid.ids[p];
        if (id === E) continue; // leave transparent
        let fill: string;
        if (id === OUT) {
          fill = OUTLINE;
        } else {
          const t = (x + y) / (2 * GRID);
          const material = materialTexture(id, x, y, seed);
          const boundary = edgeShade(grid.ids, x, y, id);
          const amt = 0.16 - t * 0.36 + sh[p] * 0.085 + material + boundary;
          fill = shade(baseHex(id), Math.max(-0.55, Math.min(0.45, amt)));
          // iridescent green/blue sheen banding on tail feathers — only when the
          // tail's material effect calls for it (design-space).
          if (id === TAIL && tailSheen) {
            const band = Math.round((x / S) * 3 + (y / S) * 2) % 9;
            if (band < 2) fill = lerpHex(fill, "#1f8a5a", 0.5);
            else if (band < 3) fill = lerpHex(fill, "#2f74a6", 0.45);
          }
        }
        const [r, gg, b] = hexRgb(fill);
        const o = p * 4;
        data[o] = r;
        data[o + 1] = gg;
        data[o + 2] = b;
        data[o + 3] = 255;
      }
    octx.putImageData(img, 0, 0);

    // 2) display: high-res pixel art, crisp enough to read as deliberate detail.
    cv.width = GRID;
    cv.height = GRID;
    ctx.clearRect(0, 0, GRID, GRID);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(off, 0, 0);
  }, [grid, hex, seed, tailSheen]);

  return (
    <canvas
      ref={ref}
      width={GRID}
      height={GRID}
      role="img"
      aria-label={`${breed.name.en} roostr avatar`}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        imageRendering: "pixelated",
        display: "block",
      }}
    />
  );
}
