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

// DEBUG-only layered avatar composer. Renders to a low-res canvas (crisp pixels
// via image-rendering) and idle-animates. Loads one PNG per part when present;
// otherwise draws a DETAILED procedural placeholder so the look is close enough to
// judge before AI art exists. Tintable PNGs are grayscale → multiply-tinted.

const R = 384; // internal canvas px
const U = R / 64; // design-unit → px
// Nudge the bird left so it reads centered in the canvas/sphere (its head/beak
// extend right, so the raw layout sits a touch right-of-center).
const BIRD_DX = -3;

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

function shade(hex: string, amt: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (n: number) => Math.max(0, Math.min(255, Math.round(n + amt)));
  return `rgb(${f(r)},${f(g)},${f(b)})`;
}

// Perceived brightness of a hex color (0–255) → pick a contrasting outline.
function lum(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 128;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

// Soft "sphere" backdrop behind the bird — gives depth + keeps legs/feet from
// blending into the card's tier background. Drawn UN-squashed (not silhouette-scaled).
function drawSphere(ctx: CanvasRenderingContext2D) {
  const cx = 32 * U,
    cy = 33 * U,
    r = 31 * U;
  const g = ctx.createRadialGradient(cx - r * 0.34, cy - r * 0.4, r * 0.1, cx, cy, r);
  g.addColorStop(0, "#fbf8f1");
  g.addColorStop(0.55, "#ece6d7");
  g.addColorStop(1, "#cdc4af");
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 1 * U;
  ctx.strokeStyle = "rgba(0,0,0,0.10)";
  ctx.stroke();
}

// Soft contact shadow under the feet (grounds the bird on the sphere).
function groundShadow(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.16)";
  ctx.beginPath();
  ctx.ellipse((36 + BIRD_DX) * U, 57 * U, 14 * U, 3.4 * U, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- low-level pixel primitives (design-unit coords) ---
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
// A rotated feather frond (rounded blade) from base point, length & width in units.
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
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(len * 0.5 * U, 0, len * 0.5 * U, wid * U, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shade(color, -26); // shaft shadow
  ctx.fillRect(0, -0.5 * U, len * U, 1 * U);
  ctx.restore();
}

// --- detailed per-part placeholder draws (design units) ---
function drawPart(ctx: CanvasRenderingContext2D, p: PartDef, t: AvatarTraits, open = true) {
  const col = channelColor(p.channel, t);
  const tail = SIL[t.silhouette]?.tail ?? 1;
  switch (p.id) {
    case "tail": {
      // Fan from the BACK-LEFT, pointing up-left (bird faces right). Angles ~π
      // aim the blades left; >π lifts them up. Layered light→dark.
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
      ctx.fillStyle = shade(col, -30); // belly shadow
      ell(ctx, 36, 38 + bry * 0.6, brx, bry * 0.73);
      ctx.fillStyle = shade(col, 26); // back highlight
      ell(ctx, 30, 30, 9, 5);
      ctx.fillStyle = shade(col, -16); // a couple of feather seams
      ctx.fillRect(40 * U, 34 * U, 1 * U, 12 * U);
      ctx.fillRect(44 * U, 36 * U, 1 * U, 9 * U);
      ctx.restore();
      break;
    }
    case "wing": {
      ctx.fillStyle = shade(col, -14);
      ell(ctx, 38, 41, 11, 9);
      ctx.save();
      clipEll(ctx, 38, 41, 11, 9);
      // three feather edges
      ctx.fillStyle = shade(col, -34);
      [0, 1, 2].forEach((i) => ell(ctx, 34 + i * 4, 47 - i, 3, 2.4));
      ctx.fillStyle = shade(col, 18);
      ell(ctx, 36, 37, 6, 3); // top sheen
      ctx.restore();
      break;
    }
    case "saddle": {
      if (t.neckType === "naked") {
        // bare-neck breed: skin throat, no hackle feathers
        ctx.fillStyle = t.skin;
        ell(ctx, 45, 30, 4, 6);
        ctx.fillStyle = shade(t.skin, -22);
        ell(ctx, 46, 33, 3, 3);
      } else {
        // hackle/neck feather strokes
        ctx.fillStyle = col;
        [0, 1, 2, 3].forEach((i) =>
          frond(ctx, 44 - i, 30 + i * 1.6, -0.5, 6, 1.4, i % 2 ? shade(col, 16) : col),
        );
      }
      break;
    }
    case "leg": {
      // Outline contrasts the leg color so legs never blend into the backdrop.
      const outline = lum(col) > 130 ? "#2b2b30" : "#efe9da";
      const legs = (color: string, w: number) => {
        ctx.strokeStyle = color;
        [33, 40].forEach((lx) => {
          ctx.lineWidth = w * U;
          ctx.beginPath();
          ctx.moveTo(lx * U, 50 * U);
          ctx.lineTo(lx * U, 57 * U);
          ctx.stroke();
          ctx.lineWidth = (w - 0.5) * U;
          [-2, 0, 2].forEach((tx) => {
            ctx.beginPath();
            ctx.moveTo(lx * U, 57 * U);
            ctx.lineTo((lx + tx) * U, 59 * U);
            ctx.stroke();
          });
        });
      };
      legs(outline, 2.6); // contrast outline
      legs(col, 1.6); // skin on top
      if (t.legType === "feathered") {
        // foot feathering (Brahma/Cochin) — base-color puffs over the shanks
        const fc = channelColor("base", t);
        [33, 40].forEach((lx) => {
          ctx.fillStyle = fc;
          ell(ctx, lx, 52, 3.4, 3);
          ell(ctx, lx, 55, 3, 2.4);
          ctx.fillStyle = shade(fc, -22);
          ell(ctx, lx + 0.6, 56, 2, 1.2);
        });
      }
      break;
    }
    case "head": {
      ctx.fillStyle = col;
      ell(ctx, 49, 23, 9, 9);
      ctx.save();
      clipEll(ctx, 49, 23, 9, 9);
      ctx.fillStyle = shade(col, 22);
      ell(ctx, 47, 19, 4, 3); // forehead sheen
      ctx.fillStyle = shade(col, -24);
      ell(ctx, 50, 28, 7, 4); // jaw shade
      ctx.restore();
      if (t.neckType === "crested") {
        // Polish-style head tuft — base-color fronds pointing up.
        [-0.35, -0.05, 0.25].forEach((a) =>
          frond(ctx, 48, 15, a - 1.57, 6, 1.8, channelColor("base", t)),
        );
      }
      break;
    }
    case "comb": {
      if (t.combType === "rose") {
        ctx.fillStyle = col;
        ([[46, 15, 3], [49, 14, 3.4], [52, 15, 3], [48, 16.5, 2.6], [50.5, 16.5, 2.4]] as [number, number, number][]).forEach(
          ([cx, cy, r]) => ell(ctx, cx, cy, r, r * 0.8),
        );
        ctx.fillStyle = shade(col, -22);
        ell(ctx, 49, 17, 4, 1.4);
      } else if (t.combType === "pea") {
        ctx.fillStyle = col;
        [46, 49, 52].forEach((cx) => ell(ctx, cx, 16, 1.6, 2.2));
        ctx.fillStyle = shade(col, -20);
        [46, 49, 52].forEach((cx) => ell(ctx, cx, 17.4, 1.1, 0.9));
      } else {
        // single — three rounded points
        ctx.fillStyle = col;
        [44, 48, 52].forEach((cx, i) => ell(ctx, cx, 15 - (i === 1 ? 1 : 0), 3, 3.4));
        ctx.fillStyle = shade(col, -22);
        [44, 48, 52].forEach((cx) => ell(ctx, cx + 0.6, 16.5, 2, 1.4));
      }
      break;
    }
    case "wattle": {
      ctx.fillStyle = col;
      ell(ctx, 53, 31, 2.4, 3.4);
      ell(ctx, 50, 32, 2, 3);
      ctx.fillStyle = shade(col, -20);
      ell(ctx, 53.6, 33, 1.4, 1.6);
      break;
    }
    case "beak": {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(56 * U, 22 * U);
      ctx.lineTo(63 * U, 24.5 * U);
      ctx.lineTo(56 * U, 27 * U);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = shade(col, -34);
      ctx.fillRect(56 * U, 24.4 * U, 6 * U, 0.8 * U); // mouth line
      ctx.fillStyle = shade(col, -50);
      ell(ctx, 57.5, 23, 0.5, 0.5); // nostril
      break;
    }
    case "eye": {
      if (!open) {
        ctx.strokeStyle = "#0e1018";
        ctx.lineWidth = 1.4 * U;
        ctx.beginPath();
        ctx.moveTo(49 * U, 22 * U);
        ctx.lineTo(53 * U, 22 * U);
        ctx.stroke();
        return;
      }
      ctx.fillStyle = "#fbf6ea";
      ell(ctx, 51.5, 21.5, 2.6, 2.8);
      ctx.fillStyle = "#0e1018";
      ell(ctx, 52, 21.7, 1.6, 1.8);
      ctx.fillStyle = "#fbf6ea";
      ell(ctx, 51.4, 20.8, 0.7, 0.7); // catchlight
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
      } else if (t.accessory === "scarf") {
        ctx.fillStyle = "#D6342B";
        ctx.fillRect(44 * U, 33 * U, 12 * U, 3 * U);
        ell(ctx, 45, 37, 2, 3);
      } else if (t.accessory === "spurs") {
        ctx.fillStyle = "#cfcfcf";
        ell(ctx, 31, 55, 1.4, 1.4);
        ell(ctx, 42, 55, 1.4, 1.4);
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

function patternOverlay(ctx: CanvasRenderingContext2D, t: AvatarTraits) {
  if (t.pattern === "none") return;
  ctx.save();
  clipEll(ctx, 36, 38, 17, 15);
  ctx.fillStyle = t.patternColor;
  ctx.globalAlpha = 0.5;
  if (t.pattern === "stripes") {
    for (let i = -8; i < 16; i++) ctx.fillRect((22 + i * 3) * U, 0, 1.2 * U, R);
  } else {
    const step = t.pattern === "speckle" ? 3 : 5;
    for (let yy = 24; yy < 52; yy += step)
      for (let xx = 20; xx < 53; xx += step) ell(ctx, xx + ((yy / step) % 2), yy, 0.8, 0.8);
  }
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
    let raf = 0;
    const start = performance.now();
    const sil = SIL[traits.silhouette] ?? SIL.standard;

    const render = (time: number) => {
      ctx.clearRect(0, 0, R, R);
      ctx.imageSmoothingEnabled = false;
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

      ctx.save();
      ctx.translate(BIRD_DX * U, 0); // center the bird (sphere/shadow stay put)
      // Silhouette squash around the body center.
      ctx.translate(36 * U, 40 * U);
      ctx.scale(sil.sx, sil.sy);
      ctx.translate(-36 * U, -40 * U);
      // Whole-bird forward lean while scratching (pivot at the feet).
      if (scratch) {
        ctx.translate(37 * U, 57 * U);
        ctx.rotate(scratch * 0.07);
        ctx.translate(-37 * U, -57 * U);
      }

      for (const p of [...AVATAR_PARTS].sort((a, b) => a.z - b.z)) {
        const isHead = HEAD_PARTS.has(p.id);
        const dy = animate && (p.anim === "bob" || isHead) ? bob : 0;
        const rot = animate && p.anim === "tailSway" ? tailRot : 0;

        if (p.id === "pattern") {
          ctx.save();
          ctx.translate(0, dy * U);
          patternOverlay(ctx, traits);
          ctx.restore();
          continue;
        }
        if (p.id === "accessory" && traits.accessory === "none") continue;

        ctx.save();
        ctx.translate(0, dy * U);
        if (rot) {
          ctx.translate(24 * U, 40 * U);
          ctx.rotate(rot);
          ctx.translate(-24 * U, -40 * U);
        }
        // Wing sway — pivot at the shoulder so the wingtip flutters, not the whole wing.
        if (animate && p.id === "wing" && wingRot) {
          ctx.translate(42 * U, 34 * U);
          ctx.rotate(wingRot);
          ctx.translate(-42 * U, -34 * U);
        }
        if (isHead && headTilt) {
          ctx.translate(49 * U, 31 * U); // neck pivot
          ctx.rotate(headTilt);
          ctx.translate(-49 * U, -31 * U);
        }
        if (p.id === "leg" && scratch) ctx.translate(-scratch * 3 * U, 0); // foot scrape

        const img = imgs.current.get(p.id);
        if (img) {
          if (p.id === "eye" && blink) drawPart(ctx, p, traits, false);
          else {
            const tc = p.channel === "none" ? img : tinted(img, channelColor(p.channel, traits));
            ctx.drawImage(tc, 0, 0, R, R);
          }
        } else {
          drawPart(ctx, p, traits, !(p.id === "eye" && blink));
        }
        ctx.restore();
      }
      ctx.restore();
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
          ? { width: "100%", height: "auto", imageRendering: "pixelated", display: "block" }
          : { width: size, height: size, imageRendering: "pixelated", display: "block" }
      }
    />
  );
}
