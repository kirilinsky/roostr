"use client";

import { useId, useMemo } from "react";
import {
  COLOR_HEX,
  type Breed,
  type ColorSet,
  type WeightClass,
} from "@/lib/roostr";

// Deterministic SVG avatar for a rolled roostr (.notes/VISUAL-GENERATION.md).
//
// Model (§1): seed -> layers -> color masks -> picture. One fixed silhouette +
// tintable layers + add-on layers toggled by the breed's `tags`. Same input
// always paints the same rooster. Vector stays crisp at small Telegram sizes (§2).
//
// Style: refined vector with light/shadow. Each layer is filled with a diagonal
// gradient (highlight top-left → shadow bottom-right, §2 single light logic) and
// outlined tone-on-tone (a darker shade of its own hue), not flat black — keeps it
// out of "cartoon" territory while staying readable.
//
// Pose is fixed (§2): 3/4 standing "passport" view, facing right. Weight reshapes
// the body mass; breed tags add structural layers without breaking the frame.

const VIEW = 220;

// Beak/horn is not a cosmetic layer in COSMETICS.json — fixed warm horn tone.
const BEAK_HEX = "#E9A23B";

// Weight class -> body mass (rx/ry) + vertical center.
const WEIGHT_SHAPE: Record<string, { rx: number; ry: number; cy: number }> = {
  tiny: { rx: 40, ry: 35, cy: 140 },
  light: { rx: 44, ry: 38, cy: 138 },
  middle: { rx: 49, ry: 41, cy: 136 },
  heavy: { rx: 55, ry: 44, cy: 138 },
  huge: { rx: 60, ry: 47, cy: 140 },
};

// --- deterministic helpers ---

// mulberry32 — tiny seeded PRNG so speckle/mottle placement is stable per seed.
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function clamp8(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

// Mix a hex toward black (amount<0) or white (amount>0), -1..1.
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

// Diagonal volume gradient (highlight → base → shadow), single light source.
function Grad({ id, hex }: { id: string; hex: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stopColor={shade(hex, 0.32)} />
      <stop offset="50%" stopColor={hex} />
      <stop offset="100%" stopColor={shade(hex, -0.34)} />
    </linearGradient>
  );
}

export interface RoostrAvatarProps {
  colors: ColorSet;
  pattern: string;
  breed: Breed;
  weightClass: WeightClass;
  seed: number;
  size?: number;
}

export default function RoostrAvatar({
  colors,
  pattern,
  breed,
  weightClass,
  seed,
  size = 180,
}: RoostrAvatarProps) {
  const uid = useId().replace(/[:]/g, "");

  const hex = useMemo(
    () => ({
      body: COLOR_HEX.body[colors.body] ?? "#b9722e",
      wing: COLOR_HEX.wing[colors.wing] ?? "#7b3f2e",
      tail: COLOR_HEX.tail[colors.tail] ?? "#222222",
      hackle: COLOR_HEX.hackle[colors.hackle] ?? "#c9962f",
      comb: COLOR_HEX.comb[colors.comb] ?? "#c1352b",
      leg: COLOR_HEX.leg[colors.leg] ?? "#e3b94e",
      eye: COLOR_HEX.eye[colors.eye] ?? "#c8861f",
    }),
    [colors],
  );

  const tags = useMemo(() => new Set(breed.tags), [breed.tags]);
  const nakedNeck = tags.has("naked-neck");
  const hasCrest = tags.has("crest");
  const hasBeard = tags.has("beard") || tags.has("bearded");
  const featheredFeet = tags.has("feathered-feet");
  const longTail = tags.has("longtail");
  const tall = tags.has("tall");

  const shape = WEIGHT_SHAPE[weightClass.id] ?? WEIGHT_SHAPE.middle;
  const bodyCx = 100;
  const bodyCy = shape.cy - (tall ? 10 : 0);
  const { rx, ry } = shape;

  // Head is anchored to the body's front edge so it never collides with the body
  // as weight scales rx (the v1 fixed-x head overlapped the body on Huge).
  const headRx = 19;
  const headRy = 16;
  const headCx = bodyCx + rx + 16;
  const headCy = bodyCy - ry - 22;
  // Face art was authored around a head at (158,70); translate that group into place.
  const faceDx = headCx - 158;
  const faceDy = headCy - 70;

  // gradient/clip ids (unique per instance — many avatars can share a page).
  const g = (k: string) => `${k}-${uid}`;
  const clipId = g("clip");

  const patternOverlay = useMemo(
    () => buildPatternOverlay(pattern, hex.body, bodyCx, bodyCy, rx, ry, seed),
    [pattern, hex.body, bodyCx, bodyCy, rx, ry, seed],
  );

  // Leg & foot geometry.
  const footY = 196;
  const legTopY = bodyCy + ry - 6;
  const shankX1 = bodyCx + 2;
  const shankX2 = bodyCx + rx * 0.5;
  const ankleY = legTopY + (footY - legTopY) * 0.4;

  // tone-on-tone outline for a given hue
  const line = (h: string, w = 1.4) => ({
    stroke: shade(h, -0.5),
    strokeWidth: w,
    strokeLinejoin: "round" as const,
  });

  // hackle/neck band: body shoulder -> head base -> down the breast.
  const neckPath = `M ${bodyCx + rx * 0.42} ${bodyCy - ry * 0.42}
    C ${bodyCx + rx * 0.7} ${bodyCy - ry * 0.95}, ${headCx - 26} ${headCy + 22}, ${headCx - 8} ${headCy + headRy - 2}
    L ${headCx + 4} ${headCy + headRy + 2}
    C ${headCx - 6} ${headCy + 26}, ${bodyCx + rx * 0.95} ${bodyCy - ry * 0.2}, ${bodyCx + rx * 0.72} ${bodyCy + ry * 0.12}
    Z`;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      role="img"
      aria-label={`${breed.name.en} roostr avatar`}
      style={{ display: "block" }}
    >
      <defs>
        <clipPath id={clipId}>
          <ellipse cx={bodyCx} cy={bodyCy} rx={rx} ry={ry} />
        </clipPath>
        <Grad id={g("body")} hex={hex.body} />
        <Grad id={g("wing")} hex={hex.wing} />
        <Grad id={g("tail")} hex={hex.tail} />
        <Grad id={g("hackle")} hex={hex.hackle} />
        <Grad id={g("comb")} hex={hex.comb} />
        <Grad id={g("leg")} hex={hex.leg} />
      </defs>

      {/* TAIL — behind body, single layered sickle with feather veins */}
      <path
        d={tailPath(bodyCx - rx * 0.45, bodyCy - ry * 0.1, longTail)}
        fill={`url(#${g("tail")})`}
        {...line(hex.tail, 1.6)}
      />
      <g stroke={shade(hex.tail, -0.4)} strokeWidth={1.4} fill="none" opacity={0.55}>
        {tailVeins(bodyCx - rx * 0.45, bodyCy - ry * 0.1, longTail)}
      </g>

      {/* LEGS — feathered shank puff (if any) tucked behind the toes */}
      {featheredFeet && (
        <g fill={shade(hex.body, 0.05)} {...line(hex.body, 1.2)}>
          <ellipse cx={shankX1} cy={ankleY + 6} rx={11} ry={14} />
          <ellipse cx={shankX2} cy={ankleY + 6} rx={11} ry={14} />
        </g>
      )}
      <g stroke={`url(#${g("leg")})`} strokeWidth={6} strokeLinecap="round" fill="none">
        <path d={`M ${shankX1} ${legTopY} L ${shankX1 - 2} ${footY}`} />
        <path d={`M ${shankX2} ${legTopY} L ${shankX2 + 2} ${footY}`} />
      </g>
      <g stroke={shade(hex.leg, -0.15)} strokeWidth={3.4} strokeLinecap="round" fill="none">
        {[shankX1 - 2, shankX2 + 2].map((fx, i) => (
          <g key={i}>
            <path d={`M ${fx} ${footY} L ${fx + 12} ${footY + 4}`} />
            <path d={`M ${fx} ${footY} L ${fx + 8} ${footY + 9}`} />
            <path d={`M ${fx} ${footY} L ${fx} ${footY + 10}`} />
            <path d={`M ${fx} ${footY} L ${fx - 7} ${footY + 6}`} />
          </g>
        ))}
      </g>

      {/* BODY mass + breast, then a soft top-left highlight */}
      <ellipse
        cx={bodyCx}
        cy={bodyCy}
        rx={rx}
        ry={ry}
        fill={`url(#${g("body")})`}
        {...line(hex.body, 1.6)}
      />
      <path
        d={`M ${bodyCx + rx - 10} ${bodyCy - 8}
            q 28 8 24 32 q -4 22 -30 24 q -18 1 -22 -16 Z`}
        fill={`url(#${g("body")})`}
        {...line(hex.body, 1.4)}
      />
      <ellipse
        cx={bodyCx - rx * 0.32}
        cy={bodyCy - ry * 0.42}
        rx={rx * 0.5}
        ry={ry * 0.3}
        fill="#ffffff"
        opacity={0.14}
      />

      {/* pattern overlay (clipped to body) */}
      {patternOverlay && <g clipPath={`url(#${clipId})`}>{patternOverlay}</g>}

      {/* WING — folded over the body side */}
      <path
        d={`M ${bodyCx - 30} ${bodyCy - 18}
            q 40 -10 56 14 q 8 14 -10 26 q -28 14 -48 -6 q -10 -18 2 -34 Z`}
        fill={`url(#${g("wing")})`}
        {...line(hex.wing, 1.6)}
      />
      <g stroke={shade(hex.wing, -0.28)} strokeWidth={1.6} fill="none" opacity={0.65}>
        <path d={`M ${bodyCx - 16} ${bodyCy - 10} q 26 2 34 22`} />
        <path d={`M ${bodyCx - 20} ${bodyCy} q 30 2 38 16`} />
        <path d={`M ${bodyCx - 22} ${bodyCy + 10} q 28 0 36 10`} />
      </g>

      {/* NECK / HACKLE (or bare red skin for naked-neck breeds, §3.1 exception) */}
      <path
        d={neckPath}
        fill={nakedNeck ? shade(hex.comb, 0.04) : `url(#${g("hackle")})`}
        {...line(nakedNeck ? hex.comb : hex.hackle, 1.5)}
      />
      {!nakedNeck && (
        <g stroke={shade(hex.hackle, -0.32)} strokeWidth={1.4} fill="none" opacity={0.6}>
          <path d={`M ${headCx - 14} ${headCy + 18} q -6 14 -16 22`} />
          <path d={`M ${headCx - 6} ${headCy + 22} q -4 14 -12 24`} />
        </g>
      )}

      {/* HEAD + face — authored around (158,70), translated to the anchored head */}
      <g transform={`translate(${faceDx} ${faceDy})`}>
        {/* CREST add-on — feather tuft behind the head */}
        {hasCrest && (
          <g fill={`url(#${g("hackle")})`} {...line(hex.hackle, 1.3)}>
            <ellipse cx={150} cy={44} rx={9} ry={13} transform="rotate(-18 150 44)" />
            <ellipse cx={162} cy={42} rx={8} ry={12} transform="rotate(6 162 42)" />
            <ellipse cx={172} cy={48} rx={7} ry={10} transform="rotate(22 172 48)" />
          </g>
        )}

        <ellipse
          cx={158}
          cy={70}
          rx={headRx}
          ry={headRy}
          fill={`url(#${g("body")})`}
          {...line(hex.body, 1.5)}
        />
        <ellipse cx={152} cy={64} rx={7} ry={5} fill="#ffffff" opacity={0.16} />

        {/* COMB — serrated crown */}
        <path
          d={`M 143 60 q 2 -15 12 -13 q 2 -12 12 -8 q 4 -12 13 -4 q 8 2 6 13
              q -6 7 -15 7 q -15 4 -26 6 q -3 -4 -2 -8 Z`}
          fill={`url(#${g("comb")})`}
          {...line(hex.comb, 1.4)}
        />

        {/* WATTLE — under the beak (hidden when a beard/muff covers it) */}
        {!hasBeard && (
          <path
            d={`M 170 82 q 9 4 7 17 q -2 8 -9 8 q -7 -2 -6 -13 q 2 -8 8 -12 Z`}
            fill={`url(#${g("comb")})`}
            {...line(hex.comb, 1.3)}
          />
        )}

        {/* BEARD/muff add-on — feather puff under the chin */}
        {hasBeard && (
          <path
            d={`M 150 84 q -7 14 3 23 q 12 7 21 -2 q 6 -11 -2 -19 Z`}
            fill={`url(#${g("hackle")})`}
            {...line(hex.hackle, 1.3)}
          />
        )}

        {/* BEAK — points right */}
        <path d={`M 176 69 L 201 73 L 176 79 Z`} fill={BEAK_HEX} {...line(BEAK_HEX, 1.3)} />
        <path d={`M 176 74 L 198 74`} stroke={shade(BEAK_HEX, -0.4)} strokeWidth={1.3} />

        {/* EYE */}
        <circle cx={163} cy={64} r={5.5} fill="#fbf6ea" {...line(hex.body, 1.4)} />
        <circle cx={164} cy={64} r={3.2} fill={hex.eye} />
        <circle cx={164} cy={64} r={1.3} fill="#11131a" />
        <circle cx={162.5} cy={62.5} r={0.9} fill="#ffffff" opacity={0.85} />
      </g>
    </svg>
  );
}

// --- tail sickle outline. longtail extends the sweep far back-up (§3.1). ---
function tailPath(bx: number, by: number, long: boolean): string {
  const reach = long ? 92 : 54;
  const rise = long ? 116 : 82;
  return `M ${bx + 6} ${by}
          q -${reach * 0.45} 2 -${reach} -${rise * 0.42}
          q -8 -${rise * 0.5} 16 -${rise * 0.6}
          q 26 16 ${reach * 0.58} ${rise * 0.18}
          q 12 26 0 46 Z`;
}

// Feather separation veins inside the tail.
function tailVeins(bx: number, by: number, long: boolean): React.ReactNode {
  const reach = long ? 92 : 54;
  const rise = long ? 116 : 82;
  return (
    <>
      <path
        d={`M ${bx} ${by - 4} q -${reach * 0.4} -${rise * 0.15} -${reach * 0.7} -${rise * 0.55}`}
      />
      <path
        d={`M ${bx + 4} ${by + 6} q -${reach * 0.45} -${rise * 0.1} -${reach * 0.78} -${rise * 0.5}`}
      />
    </>
  );
}

// Pattern overlay JSX clipped to the body. Only a handful are drawn; the rest
// fall through to Solid (no overlay). Returns null for Solid/unknown.
function buildPatternOverlay(
  pattern: string,
  bodyHex: string,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  seed: number,
): React.ReactNode {
  const dark = shade(bodyHex, -0.28);
  const light = shade(bodyHex, 0.45);
  const left = cx - rx;
  const top = cy - ry;
  const w = rx * 2;
  const h = ry * 2;

  switch (pattern) {
    case "Barred":
    case "Cuckoo": {
      const lines = [];
      for (let y = top + 6; y < cy + ry; y += 9) {
        lines.push(
          <rect key={y} x={left} y={y} width={w} height={4} fill={dark} opacity={0.5} />,
        );
      }
      return lines;
    }
    case "Speckled":
    case "Mottled":
    case "Spangled": {
      const r = rng(seed);
      const n = pattern === "Speckled" ? 26 : 16;
      const dotR = pattern === "Mottled" ? 4.5 : 2.6;
      const fill = pattern === "Spangled" ? dark : light;
      const dots = [];
      for (let i = 0; i < n; i++) {
        dots.push(
          <circle
            key={i}
            cx={left + r() * w}
            cy={top + r() * h}
            r={dotR * (0.6 + r() * 0.8)}
            fill={fill}
            opacity={0.55}
          />,
        );
      }
      return dots;
    }
    case "Laced":
    case "Penciled":
    case "Columbian":
    case "Birchen": {
      return (
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx - 3}
          ry={ry - 3}
          fill="none"
          stroke={dark}
          strokeWidth={6}
          opacity={0.45}
        />
      );
    }
    case "Iridescent": {
      return (
        <ellipse
          cx={cx - rx * 0.3}
          cy={cy - ry * 0.3}
          rx={rx * 0.7}
          ry={ry * 0.7}
          fill={shade(bodyHex, 0.3)}
          opacity={0.28}
        />
      );
    }
    default:
      return null; // Solid + anything unmapped
  }
}
