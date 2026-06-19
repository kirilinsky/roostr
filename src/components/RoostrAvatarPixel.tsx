"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  COLOR_HEX,
  type Breed,
  type ColorSet,
  type WeightClass,
} from "@/lib/roostr";

// Detailed pixel-art avatar (the only renderer — matches the brand: logo + gene
// assets are pixel art). We rasterize primitives into a 48×48 grid, then add a
// shade layer (belly shadow, highlights, feather edges) on top of a single
// diagonal light. Rendered to a tiny canvas scaled up with image-rendering:
// pixelated — crisp and cheap even with many cards on screen.
//
// No hand-authored bezier curves: an ellipse at 48px is just a clean pixel blob.
// Breed `tags` toggle structural detail (crest, hooked beak, longtail, …).

// Coordinates in buildGrid are authored in a 64-unit DESIGN space; the grid is
// rasterized at GRID = D * S so curves/feathers come out smooth and detailed.
const D = 64;
const S = 4;
const GRID = D * S; // 256 native
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

function buildGrid(weightId: string, tags: Set<string>): Grid {
  const g: Grid = { ids: new Int8Array(GRID * GRID), sh: new Int8Array(GRID * GRID) };
  const sz = WEIGHT_PX[weightId] ?? WEIGHT_PX.middle;
  const tall = tags.has("tall");
  const rx = sz.rx;
  const ry = sz.ry;
  const bodyCx = 24;
  const bodyCy = 37 - (tall ? 4 : 0);

  const headR = 8;
  const headCx = bodyCx + rx + 4;
  const headCy = bodyCy - ry - 3;

  const hooked =
    tags.has("fighter") || tags.has("game") || tags.has("strong") || tags.has("hard-feather");
  const long = tags.has("longtail");

  // ---- TAIL: sickle feathers fanned by ANGLE (fountain, not a parallel tube) ----
  const tbx = bodyCx - rx + 5;
  const tby = bodyCy - 2;
  const nF = long ? 7 : 5;
  const reach = long ? rx + ry + 14 : rx + 8;
  ellipse(g, tbx, tby + 2, 5, 6, TAIL); // base mass connecting to body
  for (let i = 0; i < nF; i++) {
    const f = i / (nF - 1); // 0 = short covert over back → 1 = long back sickle
    const ang = (-68 - f * 60) * (Math.PI / 180); // spread up → up-back-left
    const len = reach * (0.6 + 0.4 * f);
    const ox = Math.cos(ang);
    const oy = Math.sin(ang);
    const ex = tbx + ox * len;
    const ey = tby + oy * len;
    const ca = ang - 0.28; // bow control back-left → sickle curve
    const mx = tbx + Math.cos(ca) * len * 0.6;
    const my = tby + Math.sin(ca) * len * 0.6;
    quad(g, tbx, tby, mx, my, ex, ey, 1, TAIL);
    const px = -oy; // unit perpendicular → feather separation seam + edge
    const py = ox;
    quad(g, tbx + px, tby + py, mx + px, my + py, ex + px, ey + py, 0, -1, -2); // dark seam
    quad(g, tbx - px, tby - py, mx - px, my - py, ex - px, ey - py, 0, -1, 1); // light edge
  }

  // ---- HACKLE neck (skipped for naked-neck) ----
  if (!tags.has("naked-neck")) {
    // fuller cape: thick main drape + lower shoulder spread
    quad(g, bodyCx + rx - 5, bodyCy - ry + 2, bodyCx + rx + 3, headCy + headR + 4, headCx - 3, headCy + headR - 2, 6, HACKLE);
    quad(g, bodyCx + rx - 3, bodyCy - ry + 7, bodyCx + rx + 4, headCy + headR + 7, headCx - 2, headCy + headR + 1, 4, HACKLE);
    // individual neck feathers (dark seams, diagonal)
    for (let k = 0; k < 6; k++) {
      const sx = bodyCx + rx - 3 + k * 2;
      quad(g, sx, bodyCy - ry + 4, sx + 2, (bodyCy - ry + headCy) / 2, headCx - 4 + k, headCy + headR - 1, 0, -1, -2);
    }
  }

  // ---- BODY + breast ----
  ellipse(g, bodyCx, bodyCy, rx, ry, BODY);
  // teardrop: full low breast forward (right) + raised saddle toward the tail (left)
  ellipse(g, bodyCx + rx * 0.5, bodyCy + ry * 0.34, rx * 0.6, ry * 0.92, BODY); // breast bulge (fuller, lower)
  ellipse(g, bodyCx - rx * 0.42, bodyCy - ry * 0.42, rx * 0.52, ry * 0.58, BODY); // saddle rise to tail base

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

  // ---- COMB: serrated teeth + base shade ----
  const combY = headCy - headR + 1;
  for (let i = 0; i < 5; i++) {
    const cx2 = headCx - 6 + i * 2;
    const h = 3 + (i % 2 === 0 ? 1 : 0) + (i === 2 ? 1 : 0);
    line(g, cx2, combY, cx2, combY - h, 0, COMB);
  }
  line(g, headCx - 6, combY, headCx + 3, combY, 0, COMB);
  for (let x = headCx - 6; x <= headCx + 3; x++) addSh(g, x, combY, -1);

  // ---- WATTLE / BEARD ----
  if (tags.has("beard") || tags.has("bearded")) {
    ellipse(g, headCx + 1, headCy + headR, 4, 5, HACKLE);
  } else {
    line(g, headCx + 2, headCy + headR - 1, headCx + 2, headCy + headR + 3, 0, WATTLE);
    set(g, headCx + 3, headCy + headR + 2, WATTLE);
    set(g, headCx + 1, headCy + headR + 2, WATTLE);
  }

  // ---- BEAK: tapered triangular wedge (sharp point, not a round blob) ----
  const bx = headCx + headR - 1;
  const beakLen = hooked ? 7 : 5;
  for (let k = 0; k <= beakLen; k++) {
    const tt = k / beakLen;
    const h = (1 - tt) * 1.9; // half-height tapers to 0 at the tip
    const cy = headCy + (hooked ? tt * tt * 1.4 : tt * 0.2); // hook curves down
    line(g, bx + k, cy - h, bx + k, cy + h, 0, BEAK); // vertical column → wedge
  }
  addSh(g, bx + 1, headCy - 1, 2); // upper mandible highlight
  addSh(g, bx + 2, headCy + 1, -2); // lower mandible shadow
  addSh(g, bx, headCy, -3); // nostril

  // ---- EYE (sclera + iris + pupil + highlight) ----
  const ex = headCx + 3;
  const ey = headCy - 1;
  ellipse(g, ex, ey, 2, 2, EYE_W);
  ellipse(g, ex + 1, ey, 1, 1, EYE_I);
  set(g, ex + 1, ey, EYE_P);
  set(g, ex, ey - 1, EYE_W); // catch-light

  // ---- LEGS: 2px scaled shanks + toes + claws + spur ----
  const footY = 60;
  const lx1 = bodyCx; // shifted ~2% left relative to the body
  const lx2 = bodyCx + Math.round(rx * 0.5) - 1;
  const legTop = bodyCy + ry - 1;
  for (const lx of [lx1, lx2]) {
    line(g, lx, legTop, lx, footY, 0, LEG);
    line(g, lx + 1, legTop, lx + 1, footY, 0, LEG);
    // scale bands
    for (let yy = legTop; yy <= footY; yy++)
      if ((yy - legTop) % 2 === 0) {
        addSh(g, lx, yy, -1);
        addSh(g, lx + 1, yy, -1);
      }
    // toes (3 fwd + 1 back)
    line(g, lx, footY, lx + 4, footY + 1, 0, LEG);
    line(g, lx, footY, lx + 3, footY + 3, 0, LEG);
    line(g, lx, footY, lx + 1, footY + 4, 0, LEG);
    line(g, lx, footY, lx - 3, footY + 1, 0, LEG);
    // claws (dark tips)
    set(g, lx + 5, footY + 1, OUT);
    set(g, lx + 4, footY + 3, OUT);
    set(g, lx + 1, footY + 5, OUT);
    set(g, lx - 4, footY + 1, OUT);
    // spur (back-pointing)
    set(g, lx - 1, footY - 4, LEG);
    set(g, lx - 2, footY - 5, LEG);
    if (tags.has("multi-spur")) set(g, lx - 3, footY - 7, LEG);
  }

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
}: RoostrAvatarPixelProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const offRef = useRef<HTMLCanvasElement | null>(null);
  const tags = useMemo(() => new Set(breed.tags), [breed.tags]);
  const grid = useMemo(() => buildGrid(weightClass.id, tags), [weightClass.id, tags]);

  const hex = useMemo(
    () => ({
      body: COLOR_HEX.body[colors.body] ?? "#b9722e",
      wing: COLOR_HEX.wing[colors.wing] ?? "#7b3f2e",
      tail: COLOR_HEX.tail[colors.tail] ?? "#222222",
      hackle: COLOR_HEX.hackle[colors.hackle] ?? "#c9962f",
      comb: COLOR_HEX.comb[colors.comb] ?? "#c1352b",
      leg: COLOR_HEX.leg[colors.leg] ?? "#e3b94e",
      eye: COLOR_HEX.eye[colors.eye] ?? "#c8861f",
      beak: COLOR_HEX.beak?.[colors.beak] ?? BEAK_HEX,
    }),
    [colors],
  );

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const ctx = cv.getContext("2d");
    if (!ctx) return;

    // 1) paint native-res pixels via ImageData (fast at 256²)
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
          const amt = 0.16 - t * 0.36 + sh[p] * 0.085;
          fill = shade(baseHex(id), Math.max(-0.55, Math.min(0.45, amt)));
          // iridescent green/blue sheen banding on tail feathers (design-space)
          if (id === TAIL) {
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

    // 2) display: a light blur softens the high-res pixels — hybrid look
    cv.width = GRID;
    cv.height = GRID;
    ctx.clearRect(0, 0, GRID, GRID);
    ctx.filter = "blur(0.4px)";
    ctx.drawImage(off, 0, 0);
    ctx.filter = "none";
  }, [grid, hex]);

  return (
    <canvas
      ref={ref}
      width={256}
      height={256}
      role="img"
      aria-label={`${breed.name.en} roostr avatar`}
      style={{
        width: "100%",
        height: "100%",
        aspectRatio: "1 / 1",
        imageRendering: "auto",
        display: "block",
      }}
    />
  );
}
