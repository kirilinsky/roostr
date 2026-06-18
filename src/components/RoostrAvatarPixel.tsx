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

const GRID = 64;
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

// --- grid helpers ---
type Grid = { ids: Int8Array; sh: Int8Array };
const at = (x: number, y: number) => y * GRID + x;
const inb = (x: number, y: number) => x >= 0 && x < GRID && y >= 0 && y < GRID;

function set(g: Grid, x: number, y: number, id: number) {
  if (inb(x, y)) g.ids[at(x, y)] = id;
}
function addSh(g: Grid, x: number, y: number, d: number) {
  if (inb(x, y)) {
    const v = g.sh[at(x, y)] + d;
    g.sh[at(x, y)] = Math.max(-4, Math.min(4, v));
  }
}
function ellipse(g: Grid, cx: number, cy: number, rx: number, ry: number, id: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.04) set(g, x, y, id);
    }
}
function line(g: Grid, x0: number, y0: number, x1: number, y1: number, half: number, id: number) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x0 + (x1 - x0) * t);
    const cy = Math.round(y0 + (y1 - y0) * t);
    for (let dy = -half; dy <= half; dy++)
      for (let dx = -half; dx <= half; dx++) set(g, cx + dx, cy + dy, id);
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
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 6;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;
    const rx = Math.round(px);
    const ry = Math.round(py);
    for (let dy = -half; dy <= half; dy++)
      for (let dx = -half; dx <= half; dx++) {
        if (id >= 0) set(g, rx + dx, ry + dy, id);
        if (shd) addSh(g, rx + dx, ry + dy, shd);
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

  // ---- TAIL: individual sickle feathers fanning up-back ----
  const tbx = bodyCx - rx + 3;
  const tby = bodyCy + 2;
  const nF = long ? 5 : 4;
  const baseReach = long ? rx + 26 : rx + 11;
  const baseRise = long ? ry + 30 : ry + 14;
  ellipse(g, tbx, tby - 2, 4, 5, TAIL); // base mass connecting to body
  for (let i = 0; i < nF; i++) {
    const len = baseReach + i * 3;
    const ri = baseRise + i * 3;
    const by = tby - i * 2;
    quad(g, tbx + 2, by, tbx - len * 0.5, by - ri * 0.6, tbx - len, by - ri, 1, TAIL);
    quad(g, tbx + 2, by + 1, tbx - len * 0.5 + 1, by - ri * 0.6 + 2, tbx - len + 2, by - ri + 3, 0, -1, -2); // dark seam
    quad(g, tbx, by - 1, tbx - len * 0.55, by - ri * 0.62, tbx - len, by - ri - 1, 0, -1, 2); // light edge
  }

  // ---- HACKLE neck (skipped for naked-neck) ----
  if (!tags.has("naked-neck")) {
    quad(g, bodyCx + rx - 4, bodyCy - ry + 3, bodyCx + rx + 2, headCy + headR + 3, headCx - 3, headCy + headR - 1, 4, HACKLE);
    // individual neck feathers (dark seams, diagonal)
    for (let k = 0; k < 5; k++) {
      const sx = bodyCx + rx - 2 + k * 2;
      quad(g, sx, bodyCy - ry + 4, sx + 2, (bodyCy - ry + headCy) / 2, headCx - 4 + k, headCy + headR - 1, 0, -1, -2);
    }
  }

  // ---- BODY + breast ----
  ellipse(g, bodyCx, bodyCy, rx, ry, BODY);
  ellipse(g, bodyCx + rx * 0.55, bodyCy + ry * 0.2, rx * 0.55, ry * 0.82, BODY); // breast bulge

  // shading: belly shadow, back/saddle highlight, breast under-shadow
  for (let y = 0; y < GRID; y++)
    for (let x = 0; x < GRID; x++) {
      if (g.ids[at(x, y)] !== BODY) continue;
      const ny = (y - bodyCy) / ry;
      const nx = (x - bodyCx) / rx;
      if (ny > 0.1) addSh(g, x, y, -Math.round(ny * 2.5));
      if (ny < -0.25 && nx < 0.1) addSh(g, x, y, 1);
      if (nx > 0.55 && ny > 0.1) addSh(g, x, y, -1);
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

  // ---- WING: covert mass + layered primary feathers ----
  ellipse(g, bodyCx - 1, bodyCy + 1, Math.round(rx * 0.6), Math.round(ry * 0.62), WING);
  for (let k = 0; k < 5; k++) {
    const yy = bodyCy - 3 + k * 2.5;
    quad(g, bodyCx - rx * 0.5, yy, bodyCx, yy + 3, bodyCx + rx * 0.5, bodyCy + ry * 0.6 + k, 1, WING);
    quad(g, bodyCx - rx * 0.5, yy + 1, bodyCx, yy + 4, bodyCx + rx * 0.5, bodyCy + ry * 0.6 + k + 1, 0, -1, -2); // feather edge
  }
  // covert top highlight
  for (let x = bodyCx - rx; x <= bodyCx; x++) addSh(g, x, bodyCy - 2, 1);

  // ---- HEAD ----
  ellipse(g, headCx, headCy, headR, headR - 1, BODY);
  for (let y = headCy - headR; y <= headCy + headR; y++)
    for (let x = headCx - headR; x <= headCx + headR; x++) {
      if (g.ids[at(x, y)] !== BODY) continue;
      if (y > headCy) addSh(g, x, y, -1); // cheek/jaw shadow
      if (y < headCy - 1 && x < headCx) addSh(g, x, y, 1); // crown highlight
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

  // ---- BEAK (two-tone + nostril) ----
  const bx = headCx + headR;
  const beakLen = hooked ? 8 : 6;
  for (let k = 0; k < beakLen; k++) {
    const span = k < 2 ? 1 : 0;
    for (let dy = -span; dy <= span; dy++) set(g, bx + k, headCy + dy, BEAK);
  }
  set(g, bx + beakLen - 1, headCy + 1, BEAK);
  set(g, bx + beakLen - 2, headCy + 1, BEAK);
  if (hooked) set(g, bx + beakLen, headCy + 2, BEAK);
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
  const lx1 = bodyCx + 1;
  const lx2 = bodyCx + Math.round(rx * 0.5);
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
    ctx.clearRect(0, 0, GRID, GRID);

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

    for (let y = 0; y < GRID; y++)
      for (let x = 0; x < GRID; x++) {
        const id = grid.ids[at(x, y)];
        if (id === E) continue;
        let fill: string;
        if (id === OUT) {
          fill = OUTLINE;
        } else {
          const t = (x + y) / (2 * GRID);
          const amt = 0.16 - t * 0.36 + grid.sh[at(x, y)] * 0.085;
          fill = shade(baseHex(id), Math.max(-0.55, Math.min(0.45, amt)));
        }
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, 1, 1);
      }
  }, [grid, hex]);

  return (
    <canvas
      ref={ref}
      width={GRID}
      height={GRID}
      role="img"
      aria-label={`${breed.name.en} roostr pixel avatar`}
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
