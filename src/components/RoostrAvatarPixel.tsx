"use client";

import { useMemo } from "react";
import {
  COLOR_HEX,
  type Breed,
  type ColorSet,
  type WeightClass,
} from "@/lib/roostr";

// Pixel-art avatar — matches the brand (the logo + gene assets are pixel art).
//
// Key trick: we do NOT hand-author bezier curves (that's where the vector version
// read as "drawn by a kid"). We rasterize plain primitives (ellipse/line) into a
// low-res grid — an ellipse at 34px IS just a clean pixel blob, nothing to get
// wrong. Layers paint in order; each region is recolored from COSMETICS and shaded
// by a single diagonal light (§2). Add-on chunks toggle by breed `tags`.

const GRID = 34;
const BEAK_HEX = "#E9A23B";
const OUTLINE = "#17171d";
const EYE_WHITE = "#fbf6ea";

// region ids
const E = 0; // empty
const BODY = 1;
const WING = 2;
const TAIL = 3;
const HACKLE = 4;
const COMB = 5;
const BEAK = 6;
const EYE_W = 7;
const EYE_I = 8;
const LEG = 9;
const WATTLE = 10;
const OUT = 11;

const WEIGHT_PX: Record<string, { rx: number; ry: number }> = {
  tiny: { rx: 6, ry: 5 },
  light: { rx: 7, ry: 6 },
  middle: { rx: 8, ry: 6 },
  heavy: { rx: 9, ry: 7 },
  huge: { rx: 10, ry: 8 },
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
  const t = Math.abs(amount);
  const mix = (c: number) => clamp8(c + (target - c) * t);
  return `#${[mix(r), mix(g), mix(b)]
    .map((c) => c.toString(16).padStart(2, "0"))
    .join("")}`;
}

// --- grid raster helpers ---
type Grid = Int8Array;
const at = (x: number, y: number) => y * GRID + x;
const inb = (x: number, y: number) => x >= 0 && x < GRID && y >= 0 && y < GRID;

function setCell(g: Grid, x: number, y: number, id: number) {
  if (inb(x, y)) g[at(x, y)] = id;
}
function fillEllipse(g: Grid, cx: number, cy: number, rx: number, ry: number, id: number) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      if (dx * dx + dy * dy <= 1.05) setCell(g, x, y, id);
    }
  }
}
function fillLine(g: Grid, x0: number, y0: number, x1: number, y1: number, half: number, id: number) {
  const steps = Math.ceil(Math.hypot(x1 - x0, y1 - y0)) + 1;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const cx = Math.round(x0 + (x1 - x0) * t);
    const cy = Math.round(y0 + (y1 - y0) * t);
    for (let dy = -half; dy <= half; dy++)
      for (let dx = -half; dx <= half; dx++) setCell(g, cx + dx, cy + dy, id);
  }
}

// Build the layer grid from the body shape + breed tags (no colors yet).
function buildGrid(weightId: string, tags: Set<string>): Grid {
  const g = new Int8Array(GRID * GRID);
  const sz = WEIGHT_PX[weightId] ?? WEIGHT_PX.middle;
  const tall = tags.has("tall");
  const rx = sz.rx;
  const ry = sz.ry;
  const bodyCx = 13;
  const bodyCy = 18 - (tall ? 2 : 0);

  // head anchored to body front edge (never collides as weight scales)
  const headR = 4;
  const headCx = bodyCx + rx + 2;
  const headCy = bodyCy - ry - 1;

  // TAIL — 3 diagonal feather strokes sweeping up-back (left)
  const long = tags.has("longtail");
  const reach = long ? rx + 9 : rx + 3;
  const rise = long ? ry + 11 : ry + 5;
  const tbx = bodyCx - rx + 1;
  const tby = bodyCy - 1;
  fillLine(g, tbx, tby, tbx - reach, tby - rise, 1, TAIL);
  fillLine(g, tbx, tby + 2, tbx - reach + 1, tby - rise + 3, 1, TAIL);
  fillLine(g, tbx, tby + 4, tbx - reach + 2, tby - rise + 6, 1, TAIL);

  // HACKLE neck band (skipped for naked-neck breeds — §3.1 exception)
  if (!tags.has("naked-neck")) {
    fillLine(g, bodyCx + rx - 2, bodyCy - ry + 1, headCx - 1, headCy + headR, 2, HACKLE);
  }

  // BODY + WING
  fillEllipse(g, bodyCx, bodyCy, rx, ry, BODY);
  fillEllipse(g, bodyCx - 1, bodyCy + 1, Math.round(rx * 0.6), Math.round(ry * 0.6), WING);

  // feathered feet — body-color puff at the ankles
  if (tags.has("feathered-feet")) {
    fillEllipse(g, bodyCx + 1, bodyCy + ry + 2, 2, 2, BODY);
    fillEllipse(g, bodyCx + Math.round(rx * 0.5), bodyCy + ry + 2, 2, 2, BODY);
  }

  // HEAD (body color)
  fillEllipse(g, headCx, headCy, headR, headR, BODY);

  // CREST — feather tuft behind/above head
  if (tags.has("crest")) {
    fillEllipse(g, headCx - 3, headCy - 3, 2, 3, HACKLE);
    fillEllipse(g, headCx, headCy - 4, 2, 2, HACKLE);
  }

  // COMB — serrations on top of head
  for (let i = 0; i < 3; i++) {
    const x = headCx - 2 + i * 2;
    fillLine(g, x, headCy - headR, x, headCy - headR - 2 - (i === 1 ? 1 : 0), 0, COMB);
  }
  setCell(g, headCx - 3, headCy - headR + 1, COMB);

  // WATTLE / BEARD under the chin
  if (tags.has("beard") || tags.has("bearded")) {
    fillEllipse(g, headCx, headCy + headR, 2, 3, HACKLE);
  } else {
    fillLine(g, headCx + 1, headCy + headR, headCx + 1, headCy + headR + 2, 0, WATTLE);
  }

  // BEAK — shape varies by breed (like the tail). Fighter/game breeds get a
  // longer, heavier, downward-hooked beak; others a plain short point.
  const hooked =
    tags.has("fighter") ||
    tags.has("game") ||
    tags.has("strong") ||
    tags.has("hard-feather");
  const beakLen = hooked ? 4 : 3;
  for (let k = 0; k < beakLen; k++) {
    const span = k === 0 ? 1 : 0; // tall base, then a 1px point
    for (let dy = -span; dy <= span; dy++) setCell(g, headCx + headR + k, headCy + dy, BEAK);
  }
  if (hooked) setCell(g, headCx + headR + beakLen - 1, headCy + 1, BEAK); // hook curves down

  // EYE — front of head
  setCell(g, headCx + 1, headCy - 1, EYE_W);
  setCell(g, headCx + 2, headCy - 1, EYE_I);

  // LEGS + feet
  const footY = GRID - 3 + (tall ? 0 : 0);
  const lx1 = bodyCx + 1;
  const lx2 = bodyCx + Math.round(rx * 0.5);
  for (const lx of [lx1, lx2]) {
    fillLine(g, lx, bodyCy + ry - 1, lx, footY, 0, LEG);
    setCell(g, lx + 1, footY, LEG);
    setCell(g, lx + 2, footY, LEG);
    setCell(g, lx - 1, footY, LEG);
  }

  // OUTLINE — 1px dark ring around the silhouette (logo look)
  const outlined = g.slice();
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      if (g[at(x, y)] !== E) continue;
      const near =
        (inb(x - 1, y) && g[at(x - 1, y)] !== E) ||
        (inb(x + 1, y) && g[at(x + 1, y)] !== E) ||
        (inb(x, y - 1) && g[at(x, y - 1)] !== E) ||
        (inb(x, y + 1) && g[at(x, y + 1)] !== E);
      if (near) outlined[at(x, y)] = OUT;
    }
  }
  return outlined;
}

export interface RoostrAvatarPixelProps {
  colors: ColorSet;
  pattern: string;
  breed: Breed;
  weightClass: WeightClass;
  seed: number;
  size?: number;
}

export default function RoostrAvatarPixel({
  colors,
  breed,
  weightClass,
  size = 180,
}: RoostrAvatarPixelProps) {
  const tags = useMemo(() => new Set(breed.tags), [breed.tags]);
  const grid = useMemo(
    () => buildGrid(weightClass.id, tags),
    [weightClass.id, tags],
  );

  const hex = useMemo(
    () => ({
      body: COLOR_HEX.body[colors.body] ?? "#b9722e",
      wing: COLOR_HEX.wing[colors.wing] ?? "#7b3f2e",
      tail: COLOR_HEX.tail[colors.tail] ?? "#222222",
      hackle: COLOR_HEX.hackle[colors.hackle] ?? "#c9962f",
      comb: COLOR_HEX.comb[colors.comb] ?? "#c1352b",
      leg: COLOR_HEX.leg[colors.leg] ?? "#e3b94e",
      eye: COLOR_HEX.eye[colors.eye] ?? "#c8861f",
      // beak is a cosmetic layer now; fall back for pre-beak rows.
      beak: COLOR_HEX.beak?.[colors.beak] ?? BEAK_HEX,
    }),
    [colors],
  );

  function baseHex(id: number): string {
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
      default:
        return hex.body;
    }
  }

  const px = size / GRID;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < GRID; y++) {
    for (let x = 0; x < GRID; x++) {
      const id = grid[at(x, y)];
      if (id === E) continue;
      let fill: string;
      if (id === OUT) {
        fill = OUTLINE;
      } else {
        // single diagonal light: top-left bright → bottom-right shadow
        const t = (x + y) / (2 * GRID);
        fill = shade(baseHex(id), 0.18 - t * 0.42);
      }
      rects.push(
        <rect key={`${x}-${y}`} x={x * px} y={y * px} width={px + 0.5} height={px + 0.5} fill={fill} />,
      );
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`${breed.name.en} roostr pixel avatar`}
      shapeRendering="crispEdges"
      style={{ display: "block" }}
    >
      {rects}
    </svg>
  );
}
