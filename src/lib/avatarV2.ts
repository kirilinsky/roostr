// Avatar V2 (DEBUG side-project, NOT wired to prod). A layered pixel composer:
// hand-authored / AI-generated part sprites are stacked in z-order, recolored by
// a SMALL palette (base + 2 accents + skin), pattern is an overlay mask, and the
// whole thing idle-animates (bob / blink / tail sway) so the rooster feels alive.
//
// Recolor pipeline: tintable parts are authored as GRAYSCALE luminance (light→dark
// shading); the composer multiplies them by the channel color, so the shading
// survives the recolor (real palette-swap, not a flat fill). Full-color parts
// (eye, accessory) skip tinting. Missing assets fall back to a flat placeholder
// shape so the debug page runs before any art exists.

import cosmetics from "@/data/COSMETICS.json";

// Which palette color tints a part.
export type ColorChannel = "base" | "accent1" | "accent2" | "skin" | "none";

// Idle animation a part participates in.
export type PartAnim = "none" | "bob" | "tailSway" | "blink";

export interface PartDef {
  id: string;
  z: number; // draw order (low = back)
  channel: ColorChannel;
  anim: PartAnim;
  // Placeholder shape + anchor in the 64-unit design grid (cx, cy, rx, ry).
  ph: { cx: number; cy: number; rx: number; ry: number; shape: "ellipse" | "tri" };
}

// Back-to-front. This is also the art manifest: one PNG per (silhouette, part).
export const AVATAR_PARTS: PartDef[] = [
  { id: "tail", z: 0, channel: "accent1", anim: "tailSway", ph: { cx: 16, cy: 30, rx: 12, ry: 16, shape: "tri" } },
  { id: "body", z: 1, channel: "base", anim: "bob", ph: { cx: 36, cy: 38, rx: 17, ry: 15, shape: "ellipse" } },
  { id: "pattern", z: 2, channel: "none", anim: "bob", ph: { cx: 36, cy: 38, rx: 17, ry: 15, shape: "ellipse" } },
  { id: "wing", z: 3, channel: "base", anim: "bob", ph: { cx: 38, cy: 40, rx: 10, ry: 9, shape: "ellipse" } },
  { id: "saddle", z: 4, channel: "accent1", anim: "bob", ph: { cx: 46, cy: 30, rx: 8, ry: 8, shape: "ellipse" } },
  { id: "leg", z: 5, channel: "skin", anim: "none", ph: { cx: 36, cy: 54, rx: 6, ry: 7, shape: "ellipse" } },
  { id: "head", z: 6, channel: "base", anim: "bob", ph: { cx: 48, cy: 24, rx: 9, ry: 9, shape: "ellipse" } },
  { id: "wattle", z: 7, channel: "accent2", anim: "bob", ph: { cx: 50, cy: 31, rx: 3, ry: 4, shape: "ellipse" } },
  { id: "comb", z: 8, channel: "accent2", anim: "bob", ph: { cx: 48, cy: 15, rx: 6, ry: 4, shape: "ellipse" } },
  { id: "beak", z: 9, channel: "skin", anim: "bob", ph: { cx: 57, cy: 24, rx: 4, ry: 2, shape: "tri" } },
  { id: "eye", z: 10, channel: "none", anim: "blink", ph: { cx: 51, cy: 22, rx: 2, ry: 2, shape: "ellipse" } },
  { id: "accessory", z: 11, channel: "none", anim: "bob", ph: { cx: 36, cy: 38, rx: 17, ry: 15, shape: "ellipse" } },
];

export interface AvatarTraits {
  silhouette: string; // breed/weight body type → asset subfolder
  base: string; // body + wing
  accent1: string; // tail + saddle
  accent2: string; // comb + wattle
  skin: string; // beak + legs
  pattern: string; // "none" | overlay id
  patternColor: string;
  accessory: string; // "none" | id
  // Breed FEATURE variants — each is a swappable part sprite (this is exactly why
  // the layered approach fits: breeds differ by tail / comb / legs / neck).
  tailType: string;
  combType: string;
  legType: string;
  neckType: string;
  // Weight class id (tiny…huge) — scales the belly so heavy birds look chunkier.
  // Not breed/colorway data; injected from the bird's rolled weightClass.
  weight?: string;
  // Super-rare premium colorway id (gold/silver/…) when the bird rolled one.
  premium?: string;
}

// Belly (body) size multiplier per weight class.
export const WEIGHT_BELLY: Record<string, number> = {
  tiny: 0.84,
  light: 0.92,
  middle: 1,
  heavy: 1.12,
  huge: 1.26,
};
export const WEIGHTS = ["tiny", "light", "middle", "heavy", "huge"] as const;

// Silhouettes = the big visual differentiator (breed × weight). Art subfolder per.
export const SILHOUETTES = ["standard", "plump", "tall", "bantam", "fluffy"] as const;
export const PATTERNS = ["none", "stripes", "spots", "speckle"] as const;
export const ACCESSORIES = ["none", "spurs", "crown", "scarf"] as const;
// Per-breed part variants (map from breed `tags` when wired to prod).
export const TAILS = ["short", "standard", "fan", "sickle", "long"] as const;
export const COMBS = ["single", "rose", "pea"] as const;
export const LEGS = ["plain", "feathered"] as const;
export const NECKS = ["normal", "naked", "crested"] as const;

// A few cute starter palettes for the debug picker.
export const PALETTE_PRESETS: { name: string; t: Partial<AvatarTraits> }[] = [
  { name: "Classic Red", t: { base: "#C9742E", accent1: "#7A3E16", accent2: "#D6342B", skin: "#E9A23B" } },
  { name: "Snow", t: { base: "#EDE7DA", accent1: "#C9BFA8", accent2: "#D6342B", skin: "#E9A23B" } },
  { name: "Inky", t: { base: "#2E2E38", accent1: "#11121A", accent2: "#0099CC", skin: "#C29C00" } },
  { name: "Mint Mimi", t: { base: "#9FE3C8", accent1: "#56B894", accent2: "#FF7AB6", skin: "#FFC857" } },
];

export const DEFAULT_TRAITS: AvatarTraits = {
  silhouette: "standard",
  base: "#C9742E",
  accent1: "#7A3E16",
  accent2: "#D6342B",
  skin: "#E9A23B",
  pattern: "none",
  patternColor: "#3A2A12",
  accessory: "none",
  tailType: "standard",
  combType: "single",
  legType: "plain",
  neckType: "normal",
  weight: "middle",
};

// Asset path convention for the AI/artist drop-in. Empty folders = placeholders.
export function partAssetPath(silhouette: string, partId: string): string {
  return `/avatar-parts/${silhouette}/${partId}.png`;
}

export const AVATAR_GRID = 64; // design units; placeholder coords are in this space

// --- Per-breed cosmetic profiles (src/data/COSMETICS.json `breeds`) ---

export interface BreedCosmetic {
  silhouette: string;
  tail: string;
  comb: string;
  legs: string;
  neck: string;
  patterns: string[];
  // `weight` biases the roll (default: signature/first palette is ~3× the rest).
  palettes: {
    base: string;
    accent1: string;
    accent2: string;
    skin: string;
    weight?: number;
  }[];
}

export const BREED_COSMETICS = (cosmetics as { breeds?: Record<string, BreedCosmetic> })
  .breeds ?? {};

// Small deterministic hash (xorshift-ish) → stable picks from a seed.
function mix(seed: number, salt: number): number {
  let x = (Math.trunc(seed) ^ Math.imul(salt, 0x9e3779b1)) >>> 0;
  x = Math.imul(x ^ (x >>> 15), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

// The PER-BIRD variation — the only part worth storing (features come from the
// breed, so they're never persisted; colors are this bird's individual roll).
export interface Colorway {
  base: string;
  accent1: string;
  accent2: string;
  skin: string;
  pattern: string;
  patternColor: string;
  accessory: string;
  premium?: string; // set when a super-rare premium colorway rolled (gold/silver/…)
}

// Super-rare PREMIUM colorways — can override ANY breed's colors (features stay,
// so a "Golden Australorp" keeps its silhouette). Rolled at PREMIUM_RATE.
export const PREMIUM_RATE = 0.012; // ~1.2% of hatches
export const PREMIUM_COLORWAYS: {
  id: string;
  base: string;
  accent1: string;
  accent2: string;
  skin: string;
}[] = [
  { id: "gold", base: "#E8C24A", accent1: "#A87A12", accent2: "#D6342B", skin: "#E9A23B" },
  { id: "silver", base: "#D9DBE2", accent1: "#9298A6", accent2: "#D6342B", skin: "#B9BEC9" },
  { id: "platinum", base: "#EDEFF5", accent1: "#AEB6C6", accent2: "#7FA8C9", skin: "#CCD2DD" },
  { id: "obsidian", base: "#1b1c24", accent1: "#0c0d14", accent2: "#7A33FF", skin: "#2b2b34" },
];

// Seeded weighted pick (deterministic from seed+salt).
function pickWeighted<T>(
  items: T[],
  weightOf: (t: T, i: number) => number,
  seed: number,
  salt: number,
): T {
  const total = items.reduce((s, t, i) => s + Math.max(0, weightOf(t, i)), 0);
  if (total <= 0) return items[0];
  let r = mix(seed, salt) % total;
  for (let i = 0; i < items.length; i++) {
    r -= Math.max(0, weightOf(items[i], i));
    if (r < 0) return items[i];
  }
  return items[items.length - 1];
}

// Breed-DICTATED features (silhouette + tail/comb/legs/neck). Always recomputed
// from the breed — change a breed's look and every bird of it updates. NOT stored.
export function breedFeatures(
  breedId: string,
): Pick<AvatarTraits, "silhouette" | "tailType" | "combType" | "legType" | "neckType"> {
  const b = BREED_COSMETICS[breedId];
  if (!b) {
    const d = DEFAULT_TRAITS;
    return {
      silhouette: d.silhouette,
      tailType: d.tailType,
      combType: d.combType,
      legType: d.legType,
      neckType: d.neckType,
    };
  }
  return {
    silhouette: b.silhouette,
    tailType: b.tail,
    combType: b.comb,
    legType: b.legs,
    neckType: b.neck,
  };
}

// Per-bird colorway rolled from the seed (picks a palette + pattern from the
// breed's options). THIS is what gets baked/stored so it stays frozen per bird.
export function rollColorway(breedId: string, seed: number): Colorway {
  const b = BREED_COSMETICS[breedId];
  if (!b) {
    const d = DEFAULT_TRAITS;
    return {
      base: d.base,
      accent1: d.accent1,
      accent2: d.accent2,
      skin: d.skin,
      pattern: "none",
      patternColor: d.patternColor,
      accessory: "none",
    };
  }
  // Super-rare premium roll first — overrides colors (breed features stay).
  if (mix(seed, 9) / 0xffffffff < PREMIUM_RATE) {
    const pr = PREMIUM_COLORWAYS[mix(seed, 10) % PREMIUM_COLORWAYS.length];
    return {
      base: pr.base,
      accent1: pr.accent1,
      accent2: pr.accent2,
      skin: pr.skin,
      pattern: "none", // premium metallics read best solid
      patternColor: pr.accent1,
      accessory: "none",
      premium: pr.id,
    };
  }
  // Weighted palette pick — signature (first) palette is ~3× the rest by default.
  const pal = pickWeighted(
    b.palettes,
    (p, i) => p.weight ?? (i === 0 ? 3 : 1),
    seed,
    1,
  );
  const pattern = b.patterns[mix(seed, 2) % b.patterns.length] ?? "none";
  return {
    base: pal.base,
    accent1: pal.accent1,
    accent2: pal.accent2,
    skin: pal.skin,
    pattern,
    patternColor: pal.accent1,
    accessory: "none",
  };
}

// Full look = breed features (fresh) + a colorway (stored, else rolled from seed).
export function cosmeticFrom(breedId: string, colorway: Colorway): AvatarTraits {
  return { ...breedFeatures(breedId), ...colorway };
}
export function cosmeticForRoostr(breedId: string, seed: number): AvatarTraits {
  return cosmeticFrom(breedId, rollColorway(breedId, seed));
}
