// Roostr trait library + composition roll (MVP, client-side, no art assets yet).
// Each layer entry has a `weight` (higher = more common). A roostr is one entry
// per layer. Overall rarity = probability of the whole combo → human label.

export type LayerKey =
  | "species"
  | "eyes"
  | "beak"
  | "wings"
  | "headwear"
  | "accessory"
  | "background"
  | "aura"
  | "mutation";

export interface Trait {
  id: string;
  name: string;
  weight: number;
  emoji?: string; // for species / headwear / accessory
  gradient?: string; // for background
  glow?: string; // for aura (css color)
  filter?: string; // for mutation (css filter on the species emoji)
}

export const LAYERS: LayerKey[] = [
  "species",
  "eyes",
  "beak",
  "wings",
  "headwear",
  "accessory",
  "background",
  "aura",
  "mutation",
];

export const LIBRARY: Record<LayerKey, Trait[]> = {
  species: [
    { id: "chicken", name: "Chicken", weight: 100, emoji: "🐔" },
    { id: "rooster", name: "Rooster", weight: 70, emoji: "🐓" },
    { id: "silkie", name: "Silkie", weight: 40, emoji: "🐤" },
    { id: "polish", name: "Polish", weight: 30, emoji: "🐣" },
    { id: "robot", name: "Robot Chicken", weight: 12, emoji: "🤖" },
    { id: "zombie", name: "Zombie Chicken", weight: 8, emoji: "🧟" },
    { id: "phoenix", name: "Phoenix", weight: 3, emoji: "🔥" },
  ],
  eyes: [
    { id: "plain", name: "Plain eyes", weight: 100 },
    { id: "sleepy", name: "Sleepy eyes", weight: 60 },
    { id: "star", name: "Star eyes", weight: 25 },
    { id: "laser", name: "Laser eyes", weight: 8 },
  ],
  beak: [
    { id: "short", name: "Short beak", weight: 100 },
    { id: "curved", name: "Curved beak", weight: 50 },
    { id: "golden", name: "Golden beak", weight: 10 },
  ],
  wings: [
    { id: "folded", name: "Folded wings", weight: 100 },
    { id: "spread", name: "Spread wings", weight: 45 },
    { id: "angel", name: "Angel wings", weight: 9 },
  ],
  headwear: [
    { id: "none", name: "—", weight: 120 },
    { id: "glasses", name: "Glasses", weight: 40, emoji: "👓" },
    { id: "cowboy", name: "Cowboy hat", weight: 25, emoji: "🤠" },
    { id: "party", name: "Party hat", weight: 20, emoji: "🎉" },
    { id: "crown", name: "Crown", weight: 6, emoji: "👑" },
  ],
  accessory: [
    { id: "none", name: "—", weight: 140 },
    { id: "scarf", name: "Scarf", weight: 35, emoji: "🧣" },
    { id: "cigar", name: "Cigar", weight: 20, emoji: "🚬" },
    { id: "medal", name: "Medal", weight: 12, emoji: "🏅" },
  ],
  background: [
    {
      id: "dawn",
      name: "Dawn",
      weight: 100,
      gradient: "linear-gradient(160deg,#fceabb,#f8b500)",
    },
    {
      id: "mint",
      name: "Mint",
      weight: 90,
      gradient: "linear-gradient(160deg,#d4fc79,#96e6a1)",
    },
    {
      id: "sky",
      name: "Sky",
      weight: 80,
      gradient: "linear-gradient(160deg,#a1c4fd,#c2e9fb)",
    },
    {
      id: "sunset",
      name: "Sunset",
      weight: 40,
      gradient: "linear-gradient(160deg,#ff9a9e,#fad0c4)",
    },
    {
      id: "void",
      name: "Void",
      weight: 18,
      gradient: "linear-gradient(160deg,#232526,#414345)",
    },
    {
      id: "cosmic",
      name: "Cosmic",
      weight: 6,
      gradient: "linear-gradient(160deg,#5f2c82,#49a09d)",
    },
  ],
  aura: [
    { id: "none", name: "—", weight: 150 },
    { id: "soft", name: "Soft glow", weight: 40, glow: "#ffe08a" },
    { id: "neon", name: "Neon glow", weight: 14, glow: "#39ff14" },
    { id: "rainbow", name: "Rainbow aura", weight: 4, glow: "#ff6ec7" },
  ],
  mutation: [
    { id: "none", name: "—", weight: 980 },
    { id: "golden", name: "Golden", weight: 6, filter: "sepia(1) saturate(4) hue-rotate(-20deg)" },
    { id: "albino", name: "Albino", weight: 4, filter: "grayscale(1) brightness(1.4)" },
    { id: "neon", name: "Neon", weight: 4, filter: "saturate(3) hue-rotate(90deg)" },
    { id: "skeleton", name: "Skeleton", weight: 2, filter: "grayscale(1) contrast(1.6)" },
    { id: "holo", name: "Holographic", weight: 2, filter: "hue-rotate(180deg) saturate(2)" },
    { id: "glitched", name: "Glitched", weight: 1, filter: "invert(1) hue-rotate(90deg)" },
    { id: "void", name: "Void", weight: 1, filter: "invert(1) brightness(0.7)" },
  ],
};

export type RolledTraits = Record<LayerKey, Trait>;

export interface RarityTier {
  label: string;
  color: string;
}

export interface RolledRoostr {
  traits: RolledTraits;
  comboP: number; // probability of this exact combo (0..1)
  rarity: RarityTier;
  seed: number;
}

function pickWeighted(entries: Trait[]): { trait: Trait; p: number } {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return { trait: e, p: e.weight / total };
  }
  const last = entries[entries.length - 1];
  return { trait: last, p: last.weight / total };
}

function rarityFromP(p: number): RarityTier {
  if (p > 0.2) return { label: "Common", color: "#9e9e9e" };
  if (p > 0.05) return { label: "Uncommon", color: "#4caf50" };
  if (p > 0.01) return { label: "Rare", color: "#2196f3" };
  if (p > 0.002) return { label: "Epic", color: "#9c27b0" };
  if (p > 0.0003) return { label: "Legendary", color: "#ff9800" };
  return { label: "Mythic", color: "#f4436e" };
}

export function rollRoostr(): RolledRoostr {
  const traits = {} as RolledTraits;
  let comboP = 1;
  for (const layer of LAYERS) {
    const { trait, p } = pickWeighted(LIBRARY[layer]);
    traits[layer] = trait;
    comboP *= p;
  }
  return {
    traits,
    comboP,
    rarity: rarityFromP(comboP),
    seed: Math.floor(Math.random() * 1e9),
  };
}
