"use client";

import { useEffect, useRef } from "react";
import {
  AVATAR_PARTS,
  WEIGHT_BELLY,
  partAssetPath,
  type AvatarTraits,
  type ColorChannel,
  type PartDef,
} from "@/lib/avatarV2";

// Layered avatar composer, "Telegram gift sticker" style: FLAT cel shading only
// (base fill + one flat shadow tone + one flat highlight per part — no gradients
// on the bird), one clean dark sticker outline around the whole silhouette, flat
// feather texturing, and per-bird micro-variation derived from the identity seed
// (iris color, blush, brow tilt, speckle layout). Loads one PNG per part when
// present; otherwise draws the procedural part. Tintable PNGs are grayscale →
// multiply-tinted.

const R = 512; // internal canvas px
const U = R / 64; // design-unit → px
// Nudge the bird left so it reads centered in the canvas/sphere (its head/beak
// extend right, so the raw layout sits a touch right-of-center).
const BIRD_DX = -3;
const OUTLINE = "rgba(43,32,22,0.92)"; // warm dark sticker outline
const OUTLINE_W = 2.4; // px at R=512

// Silhouette = non-uniform squash of the whole bird around the body center, plus a
// tail-length tweak — cheap but visibly distinct body types.
const SIL: Record<string, { sx: number; sy: number; tail: number }> = {
  standard: { sx: 1, sy: 1, tail: 1 },
  plump: { sx: 1.16, sy: 1.02, tail: 0.95 },
  tall: { sx: 0.9, sy: 1.16, tail: 1.05 },
  bantam: { sx: 0.86, sy: 0.84, tail: 0.85 },
  fluffy: { sx: 1.12, sy: 1.1, tail: 1.35 },
};

// Parts that move together as the HEAD (so a head tilt rotates eye/comb/beak too).
const HEAD_PARTS = new Set(["head", "comb", "wattle", "beak", "eye"]);

function channelColor(ch: ColorChannel, t: AvatarTraits): string {
  switch (ch) {
    case "base":
      return t.base;
    case "accent1":
      return t.accent1;
    case "accent2":
      return t.accent2;
    case "skin":
      return t.skin;
    default:
      return "#000000";
  }
}

// Parse "#rrggbb" or "rgb(r,g,b)" → [r,g,b]. shade() output feeds back into
// shade(), so both forms must round-trip.
function rgbOf(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    const h = color.slice(1);
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const m = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : [128, 128, 128];
}

function shade(color: string, amt: number): string {
  const [r, g, b] = rgbOf(color);
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Perceived brightness of a color (0–255) → pick a contrasting outline.
function lum(color: string): number {
  const [r, g, b] = rgbOf(color);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// --- per-bird micro-variation (deterministic from the identity seed) ---
function h32(seed: number, salt: number): number {
  let x = (Math.trunc(seed) ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}
function strHash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

const IRIS_COLORS = ["#E8A33D", "#D6802A", "#B85C22", "#8A5A2B", "#C99A2E", "#A9451F"];

interface Detail {
  iris: string;
  blush: number; // cheek blush alpha
  blushSize: number;
  browTilt: number; // radians, ± — gives each bird its own expression
  rowPhase: number; // feather-row horizontal phase
  tailSpread: number; // slight fan spread multiplier
  pupil: number; // pupil size multiplier
  freckles: number; // 0–2 cheek freckles
  seed: number;
}

function detailOf(t: AvatarTraits): Detail {
  const s = t.seed ?? strHash(t.base + t.accent1 + t.accent2 + t.pattern + t.patternColor);
  const f = (salt: number) => (h32(s, salt) % 1000) / 1000;
  return {
    iris: IRIS_COLORS[h32(s, 21) % IRIS_COLORS.length],
    blush: 0.18 + f(22) * 0.18,
    blushSize: 2.1 + f(23) * 1.1,
    browTilt: (f(24) - 0.5) * 0.5,
    rowPhase: f(25) * 3,
    tailSpread: 0.92 + f(26) * 0.16,
    pupil: 0.85 + f(29) * 0.3,
    freckles: h32(s, 28) % 3,
    seed: s,
  };
}

// Soft "sphere" backdrop behind the bird — gives depth + keeps legs/feet from
// blending into the card's tier background. The ONLY gradient in the render (it
// is the backdrop, not the bird). Drawn UN-squashed (not silhouette-scaled).
function drawSphere(ctx: CanvasRenderingContext2D) {
  const cx = 32 * U,
    cy = 33 * U,
    r = 31 * U;
  const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.2, cx, cy, r * 1.15);
  g.addColorStop(0, "#faf6ec");
  g.addColorStop(1, "#d8cfba");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1 * U;
  ctx.strokeStyle = "rgba(43,32,22,0.10)";
  ctx.beginPath();
  ctx.arc(cx, cy, r - 0.5 * U, 0, Math.PI * 2);
  ctx.stroke();
}

// Soft contact shadow under the feet (grounds the bird on the sphere). Two flat
// stacked ellipses — reads soft without a gradient.
function groundShadow(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(43,32,22,0.10)";
  ctx.beginPath();
  ctx.ellipse((36 + BIRD_DX) * U, 57 * U, 14 * U, 3.4 * U, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(43,32,22,0.12)";
  ctx.beginPath();
  ctx.ellipse((36 + BIRD_DX) * U, 57 * U, 9.5 * U, 2.3 * U, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- low-level primitives (design-unit coords) ---
function ell(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(cx * U, cy * U, rx * U, ry * U, 0, 0, Math.PI * 2);
  ctx.fill();
}
function clipEll(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number) {
  ctx.beginPath();
  ctx.ellipse(cx * U, cy * U, rx * U, ry * U, 0, 0, Math.PI * 2);
  ctx.clip();
}

// A tapered feather blade from a base point: widest ~60% along, rounded tip, flat
// fill + a darker central shaft. Reads as a feather while staying flat/cel.
function frond(
  ctx: CanvasRenderingContext2D,
  bx: number,
  by: number,
  angle: number,
  len: number,
  wid: number,
  color: string,
) {
  ctx.save();
  ctx.translate(bx * U, by * U);
  ctx.rotate(angle);
  const L = len * U;
  const w0 = wid * 0.4 * U;
  const w = wid * 1.05 * U;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, -w0);
  ctx.quadraticCurveTo(L * 0.55, -w, L, 0);
  ctx.quadraticCurveTo(L * 0.55, w, 0, w0);
  ctx.closePath();
  ctx.fill();
  // shaft
  ctx.strokeStyle = shade(color, -30);
  ctx.lineWidth = 0.35 * U;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(L * 0.85, 0);
  ctx.stroke();
  ctx.restore();
}

// A row of scalloped feather tips (arcs), used to texture the belly — thin, low
// alpha, so it reads as flat linework, not shading.
function featherRow(
  ctx: CanvasRenderingContext2D,
  y: number,
  x0: number,
  x1: number,
  r: number,
  phase: number,
  color: string,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = 0.4 * U;
  for (let x = x0 + phase; x < x1; x += r * 1.8) {
    ctx.beginPath();
    ctx.arc(x * U, y * U, r * U, Math.PI * 0.12, Math.PI * 0.88);
    ctx.stroke();
  }
}

// --- detailed per-part draws (design units), flat cel style ---
function drawPart(
  ctx: CanvasRenderingContext2D,
  p: PartDef,
  t: AvatarTraits,
  d: Detail,
  open = true,
) {
  const col = channelColor(p.channel, t);
  const tail = (SIL[t.silhouette]?.tail ?? 1) * d.tailSpread;
  switch (p.id) {
    case "tail": {
      // Fan from the BACK-LEFT, pointing up-left (bird faces right). Angles ~π
      // aim the blades left; >π lifts them up. Alternating flat tones.
      const bx = 24,
        by = 37;
      const fan = (specs: [number, number][], w = 3) =>
        specs.forEach(([a, l], i) =>
          frond(ctx, bx, by, a, l * tail, w, i % 2 ? shade(col, 18) : shade(col, -10)),
        );
      switch (t.tailType) {
        case "short":
          fan([[3.2, 10], [3.55, 12]]);
          break;
        case "fan":
          fan([[2.95, 13], [3.15, 14], [3.35, 15], [3.55, 15], [3.75, 14], [3.95, 13]]);
          break;
        case "long":
          fan([[3.1, 21], [3.35, 23], [3.6, 24], [3.85, 22]]);
          break;
        case "sickle":
          fan([[3.25, 15], [3.5, 17]]);
          // two long sickle blades arcing up + a curled tip
          fan([[3.85, 24], [4.05, 26]], 3.6);
          ctx.fillStyle = shade(col, 18);
          ell(ctx, 13, 16, 2.4, 1.6);
          ctx.fillStyle = "rgba(255,255,255,0.3)";
          ell(ctx, 12.5, 15.5, 0.9, 0.7);
          break;
        default:
          fan([[3.05, 14], [3.3, 15], [3.55, 16], [3.8, 17]]);
      }
      break;
    }
    case "body": {
      // Belly scales with weight class (heavy = chunkier; mostly wider).
      const wf = WEIGHT_BELLY[t.weight ?? "middle"] ?? 1;
      const brx = 17 * wf;
      const bry = 15 * (1 + (wf - 1) * 0.65);
      ctx.fillStyle = col;
      ell(ctx, 36, 38, brx, bry);
      ctx.save();
      clipEll(ctx, 36, 38, brx, bry);
      // flat belly shadow (bottom crescent) + flat back highlight (top-left)
      ctx.fillStyle = shade(col, -26);
      ell(ctx, 36, 38 + bry * 0.62, brx, bry * 0.72);
      ctx.fillStyle = shade(col, 22);
      ell(ctx, 30, 29.5, 9.5, 5);
      // flat feather scallops over the lower belly — texture as linework
      ctx.save();
      ctx.globalAlpha = 0.3;
      const rowCol = shade(col, -40);
      featherRow(ctx, 44.5, 22, 52, 2, d.rowPhase, rowCol);
      featherRow(ctx, 48, 22, 52, 2, d.rowPhase + 1.8, rowCol);
      featherRow(ctx, 51.2, 24, 50, 2, d.rowPhase + 0.8, rowCol);
      ctx.restore();
      ctx.restore();
      break;
    }
    case "wing": {
      // folded wing: flat teardrop + big rounded feather tips at the back edge
      const wcol = shade(col, -12);
      ctx.fillStyle = wcol;
      ell(ctx, 38, 41, 10.5, 8.5);
      ctx.save();
      clipEll(ctx, 38, 41, 10.5, 8.5);
      // two overlapping rows of big flat feather tips
      ctx.fillStyle = shade(col, -28);
      ell(ctx, 31, 44.5, 4.6, 3.4);
      ell(ctx, 35.5, 46, 4.6, 3.4);
      ell(ctx, 40, 47, 4.6, 3.4);
      ctx.fillStyle = shade(col, -42);
      ell(ctx, 30, 47, 4, 2.8);
      ell(ctx, 34.5, 48.5, 4, 2.8);
      ell(ctx, 39.5, 49.4, 4, 2.8);
      // one scallop row mid-wing
      ctx.save();
      ctx.globalAlpha = 0.3;
      featherRow(ctx, 41.5, 30, 46, 1.9, d.rowPhase, shade(col, -46));
      ctx.restore();
      // flat top highlight
      ctx.fillStyle = shade(col, 12);
      ell(ctx, 37, 35.6, 6.5, 2.4);
      ctx.restore();
      // thin rim — separates wing from the same-colored body
      ctx.strokeStyle = "rgba(43,32,22,0.25)";
      ctx.lineWidth = 0.5 * U;
      ctx.beginPath();
      ctx.ellipse(38 * U, 41 * U, 10.5 * U, 8.5 * U, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case "saddle": {
      if (t.neckType === "naked") {
        // bare-neck breed: skin throat, no hackle feathers
        ctx.fillStyle = t.skin;
        ell(ctx, 45, 30, 4, 6);
        ctx.fillStyle = shade(t.skin, -22);
        ell(ctx, 46, 33, 3, 3);
        // wrinkle lines — reads as bare skin
        ctx.strokeStyle = "rgba(43,32,22,0.25)";
        ctx.lineWidth = 0.4 * U;
        [30, 32.5].forEach((y) => {
          ctx.beginPath();
          ctx.moveTo(42.5 * U, y * U);
          ctx.quadraticCurveTo(45 * U, (y + 1) * U, 48 * U, y * U);
          ctx.stroke();
        });
      } else {
        // hackle cape — flat feathers draping from the neck down onto the
        // shoulder (down-left, tucked under the head so no blade crosses the chest)
        [0, 1, 2, 3].forEach((i) =>
          frond(
            ctx,
            46 - i * 0.9,
            26.5 + i * 1.5,
            2.35 + i * 0.09,
            6 - i * 0.5,
            1.5,
            i % 2 ? shade(col, 16) : col,
          ),
        );
      }
      break;
    }
    case "leg": {
      // Outline contrasts the leg color so legs never blend into the backdrop.
      const outline = lum(col) > 130 ? "#2b2b30" : "#efe9da";
      const legs = (color: string, w: number, claws: boolean) => {
        ctx.strokeStyle = color;
        ctx.lineCap = "round";
        [33, 40].forEach((lx) => {
          ctx.lineWidth = w * U;
          ctx.beginPath();
          ctx.moveTo(lx * U, 50 * U);
          ctx.lineTo(lx * U, 57 * U);
          ctx.stroke();
          ctx.lineWidth = (w - 0.5) * U;
          [-2.2, 0, 2.2].forEach((tx) => {
            ctx.beginPath();
            ctx.moveTo(lx * U, 57 * U);
            ctx.lineTo((lx + tx) * U, 59 * U);
            ctx.stroke();
          });
          // rear toe
          ctx.beginPath();
          ctx.moveTo(lx * U, 57 * U);
          ctx.lineTo((lx - 1.4) * U, 58 * U);
          ctx.stroke();
          if (claws) {
            // tiny claws at the toe tips
            ctx.save();
            ctx.strokeStyle = "#4a3a28";
            ctx.lineWidth = 0.55 * U;
            [-2.2, 0, 2.2].forEach((tx) => {
              ctx.beginPath();
              ctx.moveTo((lx + tx) * U, 59 * U);
              ctx.lineTo((lx + tx + (tx >= 0 ? 0.7 : -0.7)) * U, 59.7 * U);
              ctx.stroke();
            });
            ctx.restore();
          }
        });
        ctx.lineCap = "butt";
      };
      legs(outline, 2.6, false); // contrast outline
      legs(col, 1.6, true); // skin on top
      // scale texture — short flat ticks across each shank
      ctx.strokeStyle = shade(col, -34);
      ctx.lineWidth = 0.35 * U;
      [33, 40].forEach((lx) => {
        for (let y = 51; y < 56.6; y += 1.4) {
          ctx.beginPath();
          ctx.moveTo((lx - 0.7) * U, y * U);
          ctx.lineTo((lx + 0.7) * U, (y + 0.25) * U);
          ctx.stroke();
        }
      });
      if (t.legType === "feathered") {
        // foot feathering (Brahma/Cochin) — base-color puffs over the shanks
        const fc = channelColor("base", t);
        [33, 40].forEach((lx) => {
          ctx.fillStyle = fc;
          ell(ctx, lx, 52, 3.4, 3);
          ell(ctx, lx, 55, 3, 2.4);
          ctx.fillStyle = shade(fc, -22);
          ell(ctx, lx + 0.6, 56, 2, 1.2);
          ctx.save();
          ctx.globalAlpha = 0.4;
          featherRow(ctx, 53.4, lx - 2.6, lx + 2.6, 1.1, 0, shade(fc, -36));
          ctx.restore();
        });
      }
      break;
    }
    case "head": {
      ctx.fillStyle = col;
      ell(ctx, 49, 23, 9, 9);
      ctx.save();
      clipEll(ctx, 49, 23, 9, 9);
      // flat forehead highlight + flat jaw shade
      ctx.fillStyle = shade(col, 22);
      ell(ctx, 46.5, 18.5, 4.5, 3);
      ctx.fillStyle = shade(col, -22);
      ell(ctx, 50, 29.5, 7, 3.6);
      // cheek blush — the mimimi anchor, intensity per bird
      ctx.save();
      ctx.globalAlpha = d.blush;
      ctx.fillStyle = "#ff6d8a";
      ell(ctx, 53.4, 26.3, d.blushSize, d.blushSize * 0.62);
      ctx.restore();
      // freckles (0–2), placed by seed
      if (d.freckles > 0) {
        ctx.fillStyle = "rgba(43,32,22,0.35)";
        ell(ctx, 52.6 + (d.seed % 3) * 0.4, 24.6, 0.28, 0.28);
        if (d.freckles > 1) ell(ctx, 54, 25.4 + (d.seed % 2) * 0.5, 0.24, 0.24);
      }
      ctx.restore();
      if (t.neckType === "crested") {
        // Polish-style head tuft — base-color fronds pointing up.
        [-0.45, -0.15, 0.15, 0.45].forEach((a, i) =>
          frond(ctx, 48, 15.5, a - 1.57, 6 - Math.abs(a) * 2, 1.7, shade(channelColor("base", t), i % 2 ? 16 : 0)),
        );
      }
      break;
    }
    case "comb": {
      const lobe = (cx: number, cy: number, rx: number, ry: number) => {
        ctx.fillStyle = col;
        ell(ctx, cx, cy, rx, ry);
      };
      if (t.combType === "rose") {
        ([[46, 15, 3], [49, 14, 3.4], [52, 15, 3], [48, 16.5, 2.6], [50.5, 16.5, 2.4]] as [number, number, number][]).forEach(
          ([cx, cy, r]) => lobe(cx, cy, r, r * 0.8),
        );
        ctx.fillStyle = shade(col, -22);
        ell(ctx, 49, 17, 4, 1.4);
      } else if (t.combType === "pea") {
        [46, 49, 52].forEach((cx) => lobe(cx, 16, 1.6, 2.2));
        ctx.fillStyle = shade(col, -20);
        [46, 49, 52].forEach((cx) => ell(ctx, cx, 17.4, 1.1, 0.9));
      } else {
        // single — three rounded points, middle one taller
        [44, 48, 52].forEach((cx, i) => lobe(cx, 15 - (i === 1 ? 1.2 : 0), 3, 3.5));
        ctx.fillStyle = shade(col, -22);
        [44, 48, 52].forEach((cx) => ell(ctx, cx + 0.6, 16.6, 2, 1.3));
      }
      // one flat shine dot on the front lobe
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ell(ctx, 47.2, 13.6, 1, 0.7);
      break;
    }
    case "wattle": {
      ctx.fillStyle = col;
      ell(ctx, 53, 31, 2.4, 3.4);
      ell(ctx, 50, 32, 2, 3);
      ctx.fillStyle = shade(col, -20);
      ell(ctx, 53.6, 33, 1.4, 1.6);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ell(ctx, 52.4, 29.8, 0.7, 0.9);
      break;
    }
    case "beak": {
      // curved two-mandible beak, flat tones + mouth line
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(55.6 * U, 21.6 * U);
      ctx.quadraticCurveTo(61.5 * U, 21.2 * U, 63.2 * U, 24.3 * U);
      ctx.quadraticCurveTo(59.5 * U, 25.1 * U, 55.8 * U, 25 * U);
      ctx.closePath();
      ctx.fill();
      // bottom mandible (darker, tucked)
      ctx.fillStyle = shade(col, -26);
      ctx.beginPath();
      ctx.moveTo(56 * U, 25.1 * U);
      ctx.quadraticCurveTo(59.8 * U, 25.6 * U, 62 * U, 24.9 * U);
      ctx.quadraticCurveTo(59.4 * U, 27.4 * U, 56 * U, 27 * U);
      ctx.closePath();
      ctx.fill();
      // smile/mouth line
      ctx.strokeStyle = "rgba(43,32,22,0.55)";
      ctx.lineWidth = 0.45 * U;
      ctx.beginPath();
      ctx.moveTo(56 * U, 24.9 * U);
      ctx.quadraticCurveTo(59.5 * U, 25.5 * U, 62.6 * U, 24.6 * U);
      ctx.stroke();
      // nostril + one flat shine
      ctx.fillStyle = shade(col, -52);
      ell(ctx, 57.6, 22.9, 0.5, 0.4);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ell(ctx, 59.3, 22.5, 1.1, 0.45);
      break;
    }
    case "eye": {
      // brow — tiny tilted stroke above the eye; per-bird expression
      ctx.save();
      ctx.strokeStyle = "rgba(43,32,22,0.45)";
      ctx.lineWidth = 0.55 * U;
      ctx.translate(51.5 * U, 18.6 * U);
      ctx.rotate(d.browTilt);
      ctx.beginPath();
      ctx.moveTo(-1.6 * U, 0);
      ctx.quadraticCurveTo(0, -0.7 * U, 1.6 * U, 0);
      ctx.stroke();
      ctx.restore();
      if (!open) {
        // closed lid — a happy downward arc + a tiny lash
        ctx.strokeStyle = "#20222e";
        ctx.lineWidth = 0.9 * U;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(49.4 * U, 21.4 * U);
        ctx.quadraticCurveTo(51.4 * U, 23.2 * U, 53.4 * U, 21.4 * U);
        ctx.stroke();
        ctx.lineWidth = 0.5 * U;
        ctx.beginPath();
        ctx.moveTo(53.4 * U, 21.4 * U);
        ctx.lineTo(54.1 * U, 21.9 * U);
        ctx.stroke();
        ctx.lineCap = "butt";
        return;
      }
      // sclera → flat iris ring → pupil → catchlights
      ctx.fillStyle = "#fdfaf1";
      ell(ctx, 51.5, 21.5, 2.7, 2.9);
      ctx.fillStyle = shade(d.iris, -55);
      ell(ctx, 52, 21.7, 1.95, 2.15);
      ctx.fillStyle = d.iris;
      ell(ctx, 52, 21.7, 1.55, 1.75);
      ctx.fillStyle = "#12131c";
      ell(ctx, 52.15, 21.8, 1.05 * d.pupil, 1.2 * d.pupil);
      ctx.fillStyle = "#ffffff";
      ell(ctx, 51.45, 20.75, 0.62, 0.62);
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ell(ctx, 52.85, 22.5, 0.3, 0.3);
      // upper lid line
      ctx.strokeStyle = "rgba(32,34,46,0.55)";
      ctx.lineWidth = 0.5 * U;
      ctx.beginPath();
      ctx.arc(51.5 * U, 21.7 * U, 2.6 * U, Math.PI * 1.15, Math.PI * 1.8);
      ctx.stroke();
      break;
    }
    case "accessory": {
      if (t.accessory === "crown") {
        ctx.fillStyle = "#E7C200";
        [45, 49, 53].forEach((cx) => {
          ctx.beginPath();
          ctx.moveTo((cx - 1.6) * U, 11 * U);
          ctx.lineTo(cx * U, 7 * U);
          ctx.lineTo((cx + 1.6) * U, 11 * U);
          ctx.closePath();
          ctx.fill();
        });
        ctx.fillRect(43 * U, 11 * U, 12 * U, 2.2 * U);
        ctx.fillStyle = "#B89200"; // flat base shade band
        ctx.fillRect(43 * U, 12.4 * U, 12 * U, 0.8 * U);
        // gem + ball tips
        ctx.fillStyle = "#D6342B";
        ell(ctx, 49, 12.1, 0.9, 0.9);
        ctx.fillStyle = "rgba(255,255,255,0.6)";
        ell(ctx, 48.7, 11.8, 0.3, 0.3);
        ctx.fillStyle = "#F6DE6B";
        [45, 49, 53].forEach((cx) => ell(ctx, cx, 6.8, 0.7, 0.7));
      } else if (t.accessory === "scarf") {
        ctx.fillStyle = "#D6423A";
        ctx.beginPath();
        ctx.moveTo(43.5 * U, 33 * U);
        ctx.quadraticCurveTo(50 * U, 35.2 * U, 56.5 * U, 33.4 * U);
        ctx.lineTo(56.5 * U, 35.8 * U);
        ctx.quadraticCurveTo(50 * U, 37.6 * U, 43.5 * U, 35.6 * U);
        ctx.closePath();
        ctx.fill();
        // hanging end + fringe
        ctx.fillStyle = "#B72A22";
        ctx.beginPath();
        ctx.moveTo(43.8 * U, 34.5 * U);
        ctx.quadraticCurveTo(42.6 * U, 38 * U, 44.4 * U, 41 * U);
        ctx.lineTo(46.6 * U, 40.2 * U);
        ctx.quadraticCurveTo(45.6 * U, 37.5 * U, 46.4 * U, 35.2 * U);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = "#8f1f19";
        ctx.lineWidth = 0.5 * U;
        [44.7, 45.5, 46.3].forEach((x) => {
          ctx.beginPath();
          ctx.moveTo(x * U, 40.6 * U);
          ctx.lineTo((x - 0.2) * U, 41.8 * U);
          ctx.stroke();
        });
        // knit ribs — flat linework
        ctx.strokeStyle = "rgba(255,255,255,0.22)";
        ctx.lineWidth = 0.35 * U;
        [33.8, 34.7].forEach((y) => {
          ctx.beginPath();
          ctx.moveTo(44 * U, y * U);
          ctx.quadraticCurveTo(50 * U, (y + 2) * U, 56 * U, (y + 0.4) * U);
          ctx.stroke();
        });
      } else if (t.accessory === "spurs") {
        ctx.fillStyle = "#cfcfcf";
        ell(ctx, 31, 55, 1.4, 1.4);
        ell(ctx, 42, 55, 1.4, 1.4);
        ctx.fillStyle = "rgba(255,255,255,0.7)";
        ell(ctx, 30.6, 54.6, 0.4, 0.4);
        ell(ctx, 41.6, 54.6, 0.4, 0.4);
      }
      break;
    }
  }
}

function tinted(img: HTMLImageElement, color: string): HTMLCanvasElement {
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0);
  x.globalCompositeOperation = "multiply";
  x.fillStyle = color;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = "destination-in";
  x.drawImage(img, 0, 0);
  return c;
}

// Plumage pattern, clipped to the body. Each pattern mimics a real chicken
// plumage read: barred (curved bands), laced (scalloped crescents), mottled
// (seeded flecks) — recognizable at card size, all flat.
function patternOverlay(ctx: CanvasRenderingContext2D, t: AvatarTraits, d: Detail) {
  if (t.pattern === "none") return;
  const wf = WEIGHT_BELLY[t.weight ?? "middle"] ?? 1;
  const brx = 17 * wf;
  const bry = 15 * (1 + (wf - 1) * 0.65);
  ctx.save();
  clipEll(ctx, 36, 38, brx, bry);
  if (t.pattern === "stripes") {
    // barred — curved vertical bands following the body's roundness
    ctx.strokeStyle = t.patternColor;
    ctx.globalAlpha = 0.42;
    ctx.lineWidth = 1.5 * U;
    for (let x = 21; x < 54; x += 3.8) {
      ctx.beginPath();
      ctx.moveTo(x * U, 22 * U);
      ctx.quadraticCurveTo((x + 2.2) * U, 38 * U, x * U, 54 * U);
      ctx.stroke();
    }
  } else if (t.pattern === "spots") {
    // laced — rows of scalloped crescents (Wyandotte lacing)
    ctx.strokeStyle = t.patternColor;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 0.7 * U;
    for (let yy = 26; yy < 52; yy += 3.6) {
      for (let xx = 20; xx < 53; xx += 3.6) {
        const ox = ((yy / 3.6) % 2) * 1.8;
        ctx.beginPath();
        ctx.arc((xx + ox) * U, yy * U, 1.7 * U, Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      }
    }
  } else {
    // mottled/speckle — seeded flecks, varied size & tilt, some light-tipped
    for (let i = 0; i < 46; i++) {
      const fx = 21 + ((h32(d.seed, 100 + i) % 1000) / 1000) * 30;
      const fy = 25 + ((h32(d.seed, 200 + i) % 1000) / 1000) * 26;
      const fr = 0.5 + ((h32(d.seed, 300 + i) % 1000) / 1000) * 0.7;
      const rot = ((h32(d.seed, 400 + i) % 1000) / 1000) * Math.PI;
      ctx.save();
      ctx.translate(fx * U, fy * U);
      ctx.rotate(rot);
      ctx.globalAlpha = 0.35 + ((h32(d.seed, 500 + i) % 1000) / 1000) * 0.25;
      ctx.fillStyle = t.patternColor;
      ctx.beginPath();
      ctx.ellipse(0, 0, fr * 1.4 * U, fr * 0.8 * U, 0, 0, Math.PI * 2);
      ctx.fill();
      if (i % 3 === 0) {
        ctx.fillStyle = "rgba(255,252,240,0.5)";
        ctx.beginPath();
        ctx.ellipse(fr * 0.7 * U, 0, fr * 0.5 * U, fr * 0.35 * U, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }
  ctx.restore();
}

// Premium metallic sheen — a soft diagonal shine band composited onto bird pixels
// only; slowly sweeps when animated (gold/silver birds shimmer on the hero).
function premiumSheen(ctx: CanvasRenderingContext2D, time: number, animate: boolean) {
  const sweep = animate ? Math.sin(time * 0.6) * 0.18 : 0;
  const g = ctx.createLinearGradient(0, 0, R, R);
  const mid = 0.5 + sweep;
  g.addColorStop(Math.max(0, mid - 0.16), "rgba(255,255,255,0)");
  g.addColorStop(mid, "rgba(255,255,255,0.22)");
  g.addColorStop(Math.min(1, mid + 0.16), "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalCompositeOperation = "source-atop";
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, R, R);
  ctx.restore();
}

export default function AvatarV2({
  traits,
  size = 240,
  animate = true,
  fill = false,
}: {
  traits: AvatarTraits;
  size?: number;
  animate?: boolean;
  fill?: boolean; // stretch to the parent's width (square), instead of a fixed size
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgs = useRef<Map<string, HTMLImageElement | null | undefined>>(new Map());
  // offscreen layers: bird pixels + tinted outline silhouette (allocated once)
  const layers = useRef<{ bird: HTMLCanvasElement; line: HTMLCanvasElement } | null>(null);

  useEffect(() => {
    imgs.current = new Map();
    for (const p of AVATAR_PARTS) {
      imgs.current.set(p.id, undefined);
      const im = new Image();
      im.onload = () => imgs.current.set(p.id, im);
      im.onerror = () => imgs.current.set(p.id, null);
      im.src = partAssetPath(traits.silhouette, p.id);
    }
  }, [traits.silhouette]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (!layers.current) {
      const mk = () => {
        const c = document.createElement("canvas");
        c.width = R;
        c.height = R;
        return c;
      };
      layers.current = { bird: mk(), line: mk() };
    }
    const bctx = layers.current.bird.getContext("2d")!;
    const lctx = layers.current.line.getContext("2d")!;
    let raf = 0;
    const start = performance.now();
    const sil = SIL[traits.silhouette] ?? SIL.standard;
    const detail = detailOf(traits);

    const render = (time: number) => {
      ctx.clearRect(0, 0, R, R);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      drawSphere(ctx);
      groundShadow(ctx);

      // --- idle gestures (all derived from `time`) ---
      const bob = animate ? Math.sin(time * 2.3) * 0.8 : 0;
      const tailRot = animate ? Math.sin(time * 1.6) * 0.09 : 0;
      // Wing flutter: a subtle sway, phase-offset from the bob so it reads as a
      // living tuck-and-settle rather than moving in lockstep with the body.
      const wingRot = animate ? Math.sin(time * 2.0 + 0.6) * 0.05 : 0;
      const blink = animate && time % 3.4 < 0.12;
      // Head tilt: a slow curious lean every ~7s, held briefly then released.
      let headTilt = 0;
      if (animate) {
        const hp = time % 7;
        if (hp > 2 && hp < 3.6) headTilt = Math.sin(((hp - 2) / 1.6) * Math.PI) * 0.22;
      }
      // Leg scratch/dig: every ~9s the bird leans forward + a foot scrapes back.
      let scratch = 0;
      if (animate) {
        const sp = time % 9;
        if (sp > 5 && sp < 6.4) scratch = Math.sin(((sp - 5) / 1.4) * Math.PI);
      }

      // --- draw the bird onto its own layer (for the sticker outline) ---
      bctx.clearRect(0, 0, R, R);
      bctx.save();
      bctx.translate(BIRD_DX * U, 0); // center the bird (sphere/shadow stay put)
      // Silhouette squash around the body center.
      bctx.translate(36 * U, 40 * U);
      bctx.scale(sil.sx, sil.sy);
      bctx.translate(-36 * U, -40 * U);
      // Whole-bird forward lean while scratching (pivot at the feet).
      if (scratch) {
        bctx.translate(37 * U, 57 * U);
        bctx.rotate(scratch * 0.07);
        bctx.translate(-37 * U, -57 * U);
      }

      for (const p of [...AVATAR_PARTS].sort((a, b) => a.z - b.z)) {
        const isHead = HEAD_PARTS.has(p.id);
        const dy = animate && (p.anim === "bob" || isHead) ? bob : 0;
        const rot = animate && p.anim === "tailSway" ? tailRot : 0;

        if (p.id === "pattern") {
          bctx.save();
          bctx.translate(0, dy * U);
          patternOverlay(bctx, traits, detail);
          bctx.restore();
          continue;
        }
        if (p.id === "accessory" && traits.accessory === "none") continue;

        bctx.save();
        bctx.translate(0, dy * U);
        if (rot) {
          bctx.translate(24 * U, 40 * U);
          bctx.rotate(rot);
          bctx.translate(-24 * U, -40 * U);
        }
        // Wing sway — pivot at the shoulder so the wingtip flutters, not the whole wing.
        if (animate && p.id === "wing" && wingRot) {
          bctx.translate(42 * U, 34 * U);
          bctx.rotate(wingRot);
          bctx.translate(-42 * U, -34 * U);
        }
        if (isHead && headTilt) {
          bctx.translate(49 * U, 31 * U); // neck pivot
          bctx.rotate(headTilt);
          bctx.translate(-49 * U, -31 * U);
        }
        if (p.id === "leg" && scratch) bctx.translate(-scratch * 3 * U, 0); // foot scrape

        const img = imgs.current.get(p.id);
        if (img) {
          if (p.id === "eye" && blink) drawPart(bctx, p, traits, detail, false);
          else {
            const tc = p.channel === "none" ? img : tinted(img, channelColor(p.channel, traits));
            bctx.drawImage(tc, 0, 0, R, R);
          }
        } else {
          drawPart(bctx, p, traits, detail, !(p.id === "eye" && blink));
        }
        bctx.restore();
      }
      bctx.restore();
      if (traits.premium) premiumSheen(bctx, time, animate);

      // --- sticker outline: bird silhouette tinted dark, stamped in 8 directions ---
      lctx.clearRect(0, 0, R, R);
      lctx.globalCompositeOperation = "source-over";
      lctx.drawImage(layers.current!.bird, 0, 0);
      lctx.globalCompositeOperation = "source-in";
      lctx.fillStyle = OUTLINE;
      lctx.fillRect(0, 0, R, R);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        ctx.drawImage(layers.current!.line, Math.cos(a) * OUTLINE_W, Math.sin(a) * OUTLINE_W);
      }
      ctx.drawImage(layers.current!.bird, 0, 0);
    };

    const loop = (now: number) => {
      render(animate ? (now - start) / 1000 : 0);
      if (animate) raf = requestAnimationFrame(loop);
    };
    loop(performance.now());
    return () => cancelAnimationFrame(raf);
  }, [traits, animate]);

  return (
    <canvas
      ref={canvasRef}
      width={R}
      height={R}
      style={
        fill
          ? { width: "100%", height: "auto", display: "block" }
          : { width: size, height: size, display: "block" }
      }
    />
  );
}
