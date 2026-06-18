// Roostr hatch model (MVP, client-side, no art/DB yet).
//
// Core rule (see .notes/GENE-MODIFIERS.md): every roostr hatches COMMON. It is
// never born Rare/Legendary. What is unique is the *combination*: breed + weight
// + cosmetic colors + pattern + 2-4 key genes. Genes don't make it strong at
// birth — they define cheaper/stronger upgrade branches (its role). Power comes
// later from прокачка, not from the egg.

import { BREEDS_CATALOG, type BreedTrait } from "@/lib/breeds";

// --- Skills (upgrade axes) ---
export type Skill =
  | "Damage"
  | "Crit"
  | "Endurance"
  | "Guard"
  | "Speed"
  | "Accuracy"
  | "Crow"
  | "Recovery"
  | "Yield"
  | "Luck";

export type StatModKey = Skill | "Health";
export type StatMods = Partial<Record<StatModKey, number>>;

// --- Gene families ---
export type GeneFamily =
  | "Armor"
  | "Weapons"
  | "Mobility"
  | "Stamina"
  | "Mind"
  | "Work"
  | "Voice";

export const FAMILY_COLOR: Record<GeneFamily, string> = {
  Armor: "#607d8b",
  Weapons: "#c62828",
  Mobility: "#1565c0",
  Stamina: "#6d4c41",
  Mind: "#6a1b9a",
  Work: "#2e7d32",
  Voice: "#ef6c00",
};

export interface Gene {
  id: string;
  name: string;
  family: GeneFamily;
  boosts: Skill[]; // native (cheaper, higher ceiling) upgrade branch
  weakness: string; // human-readable trade-off
  role: string; // role this gene leans toward
  statMods?: StatMods; // small starting buff/debuff
  passive?: string; // human-readable special behavior for future battle sim
}

// MVP gene set (§7): stress-proof adds a third Stamina option.
export const GENES: Gene[] = [
  // Armor / Feathers
  { id: "iron-feathers", name: "Iron Feathers", family: "Armor", boosts: ["Guard", "Endurance"], weakness: "Speed, Crit", role: "Tank", statMods: { Health: 2, Guard: 1, Speed: -1 } },
  { id: "dense-plumage", name: "Dense Plumage", family: "Armor", boosts: ["Guard", "Recovery"], weakness: "Damage", role: "Tank", statMods: { Health: 1, Guard: 1, Damage: -1 } },
  // Weapons / Spurs
  { id: "razor-spurs", name: "Razor Spurs", family: "Weapons", boosts: ["Damage", "Crit"], weakness: "Guard", role: "Striker", statMods: { Damage: 1, Crit: 1, Guard: -1 } },
  { id: "heavy-beak", name: "Heavy Beak", family: "Weapons", boosts: ["Damage"], weakness: "Speed", role: "Striker", statMods: { Damage: 2, Speed: -1 } },
  // Mobility / Legs
  { id: "quick-step", name: "Quick Step", family: "Mobility", boosts: ["Speed"], weakness: "Endurance", role: "Duelist", statMods: { Speed: 1, Endurance: -1 } },
  { id: "light-bones", name: "Light Bones", family: "Mobility", boosts: ["Speed"], weakness: "Guard", role: "Duelist", statMods: { Speed: 2, Guard: -1, Health: -1 } },
  // Stamina / Body
  { id: "broad-chest", name: "Broad Chest", family: "Stamina", boosts: ["Endurance"], weakness: "Speed", role: "Grinder", statMods: { Health: 3, Endurance: 1, Speed: -1 } },
  { id: "old-blood", name: "Old Blood", family: "Stamina", boosts: ["Endurance", "Recovery"], weakness: "Damage", role: "Grinder", statMods: { Health: 2, Recovery: 1, Damage: -1 } },
  { id: "stressproof", name: "Stressproof", family: "Stamina", boosts: ["Endurance", "Guard", "Recovery"], weakness: "Burst Damage", role: "Grinder", statMods: { Health: 2, Guard: 1, Recovery: 1, Damage: -1 }, passive: "Resists pressure and recovers faster after heavy hits." },
  // Mind / Temper
  { id: "wild-rage", name: "Wild Rage", family: "Mind", boosts: ["Crit", "Damage"], weakness: "Guard", role: "Striker", statMods: { Crit: 2, Guard: -1 } },
  { id: "patient-eye", name: "Patient Eye", family: "Mind", boosts: ["Crit", "Accuracy"], weakness: "Speed", role: "Duelist", statMods: { Accuracy: 1, Crit: 1, Speed: -1 } },
  // Work / Forage
  { id: "corn-sense", name: "Corn Sense", family: "Work", boosts: ["Yield"], weakness: "Damage", role: "Farmer", statMods: { Yield: 2, Damage: -1 } },
  { id: "tireless-worker", name: "Tireless Worker", family: "Work", boosts: ["Yield", "Recovery"], weakness: "Crit", role: "Farmer", statMods: { Yield: 1, Recovery: 1, Crit: -1 } },
  // Voice / Presence
  { id: "thunder-crow", name: "Thunder Crow", family: "Voice", boosts: ["Crow"], weakness: "Recovery", role: "Showman", statMods: { Crow: 2, Recovery: -1 } },
  { id: "silver-throat", name: "Silver Throat", family: "Voice", boosts: ["Crow"], weakness: "Guard", role: "Showman", statMods: { Crow: 1, Luck: 1, Guard: -1 } },
];

// --- Breed (identity modifier, real chicken breeds) ---
export interface Breed {
  id: string;
  name: string;
  affinity: string[]; // light lean, not a guarantee
  vibe: string;
  baseHealth: number;
  trait: BreedTrait; // fixed innate buff/debuff (not upgradeable)
  geneAffinities?: {
    families?: Partial<Record<string, number>>;
    genes?: Partial<Record<string, number>>;
  };
  weight: number; // roll weight (some breeds are simply more common)
}

export const BREEDS: Breed[] = BREEDS_CATALOG.map((b) => ({
  id: b.id,
  name: b.name.en,
  affinity: b.tendencies,
  vibe: b.group,
  baseHealth: b.baseHealth,
  trait: b.trait,
  geneAffinities: b.geneAffinities,
  weight: b.dropWeight,
}));

// --- Weight class (body modifier) ---
export interface WeightClass {
  id: string;
  name: string;
  bonus: string;
  penalty: string;
  type: string;
  healthMod: number;
  weight: number; // roll weight; extremes are rarer
}

export const WEIGHT_CLASSES: WeightClass[] = [
  { id: "tiny", name: "Tiny", bonus: "Speed++, Recovery", penalty: "Guard--, Endurance-", type: "mini-duelist", healthMod: -3, weight: 12 },
  { id: "light", name: "Light", bonus: "Speed, Recovery", penalty: "Guard, Endurance", type: "fast/fragile", healthMod: -1, weight: 26 },
  { id: "middle", name: "Middle", bonus: "balanced", penalty: "no peak", type: "hybrid", healthMod: 0, weight: 34 },
  { id: "heavy", name: "Heavy", bonus: "Guard, Endurance", penalty: "Speed, Recovery", type: "tank/grinder", healthMod: 2, weight: 20 },
  { id: "huge", name: "Huge", bonus: "Guard++, Endurance++", penalty: "Speed--, Accuracy-", type: "slow monster", healthMod: 4, weight: 8 },
];

// --- Cosmetic colors + pattern (no battle effect; collection/show value only) ---
export const COLORS = {
  body: ["Black", "White", "Red", "Brown", "Buff", "Cream", "Blue Gray", "Slate"],
  wing: ["Black", "White", "Copper", "Gold", "Silver", "Speckled", "Barred"],
  tail: ["Black", "Emerald", "Blue Black", "White", "Gold", "Iridescent"],
  hackle: ["Gold", "Silver", "Copper", "Cream", "Red", "Black"],
  comb: ["Red", "Dark Red", "Purple", "Black", "Pink"],
  leg: ["Yellow", "Slate", "Black", "White", "Greenish"],
  eye: ["Amber", "Black", "Red", "Pale", "Emerald"],
} as const;

export const PATTERNS = [
  "Solid",
  "Speckled",
  "Barred",
  "Laced",
  "Mottled",
  "Splash",
  "Iridescent",
  "Albino",
  "Melanistic",
] as const;

// Hex lookup so the card can paint a backdrop from the rolled body color.
export const BODY_COLOR_HEX: Record<string, string> = {
  Black: "#2b2b2b",
  White: "#e9e9ec",
  Red: "#b23a2e",
  Brown: "#6b4423",
  Buff: "#e3c992",
  Cream: "#f1e6c8",
  "Blue Gray": "#6e7f8d",
  Slate: "#4a5568",
};

const STAT_LABEL: Record<StatModKey, string> = {
  Health: "HP",
  Damage: "Damage",
  Crit: "Crit",
  Endurance: "Endurance",
  Guard: "Guard",
  Speed: "Speed",
  Accuracy: "Accuracy",
  Crow: "Crow",
  Recovery: "Recovery",
  Yield: "Yield",
  Luck: "Luck",
};

export function formatStatMods(mods?: StatMods): string {
  if (!mods) return "";

  return Object.entries(mods)
    .filter((entry): entry is [StatModKey, number] => typeof entry[1] === "number" && entry[1] !== 0)
    .map(([stat, value]) => `${value > 0 ? "+" : ""}${value} ${STAT_LABEL[stat]}`)
    .join(" · ");
}

export type ColorSet = { -readonly [K in keyof typeof COLORS]: string };

export interface RolledRoostr {
  breed: Breed;
  weightClass: WeightClass;
  genes: Gene[]; // 2-4 distinct key genes
  maxHealth: number; // starting max HP from breed + weight + genes
  colors: ColorSet;
  pattern: string;
  role: string; // recommended archetype (derived from genes)
  seed: number; // unique-combination id (cosmetic, for display)
}

function pickWeighted<T extends { weight: number }>(entries: readonly T[]): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = Math.random() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Gene count: 2 almost always. Three is very rare (~1/1000), four is a jackpot
// (~1/100000). Weights sum to 100000 so they read as direct odds.
// (Decision: GAME-DESIGN §11.)
const GENE_COUNT_WEIGHTS = [
  { count: 2, weight: 99899 },
  { count: 3, weight: 100 },
  { count: 4, weight: 1 },
];

function geneRollWeight(gene: Gene, breed: Breed): number {
  const familyBias = breed.geneAffinities?.families?.[gene.family] ?? 1;
  const geneBias = breed.geneAffinities?.genes?.[gene.name] ?? 1;
  return familyBias * geneBias;
}

function pickBiasedGene(pool: Gene[], breed: Breed): Gene {
  const total = pool.reduce((sum, gene) => sum + geneRollWeight(gene, breed), 0);
  let r = Math.random() * total;
  for (const gene of pool) {
    r -= geneRollWeight(gene, breed);
    if (r <= 0) return gene;
  }
  return pool[pool.length - 1];
}

function pickGenes(breed: Breed): Gene[] {
  const k = pickWeighted(GENE_COUNT_WEIGHTS).count;
  const pool = [...GENES];
  const out: Gene[] = [];
  for (let i = 0; i < k && pool.length > 0; i++) {
    const picked = pickBiasedGene(pool, breed);
    const idx = pool.indexOf(picked);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

const FAMILY_ROLE: Record<GeneFamily, string> = {
  Armor: "Tank",
  Weapons: "Striker",
  Mobility: "Duelist",
  Stamina: "Grinder",
  Mind: "Duelist",
  Work: "Farmer",
  Voice: "Showman",
};

// Recommended role (§4/§6 — the UI should surface this). A combat/util gene mixed
// with a Work gene reads as a Hybrid; otherwise the most-represented family wins.
function deriveRole(genes: Gene[]): string {
  const families = genes.map((g) => g.family);
  const hasWork = families.includes("Work");
  const hasOther = families.some((f) => f !== "Work");
  if (hasWork && hasOther) return "Hybrid";

  const counts = new Map<GeneFamily, number>();
  for (const f of families) counts.set(f, (counts.get(f) ?? 0) + 1);
  let best: GeneFamily = families[0];
  let bestN = 0;
  for (const [f, n] of counts) {
    if (n > bestN) {
      best = f;
      bestN = n;
    }
  }
  return FAMILY_ROLE[best];
}

function deriveMaxHealth(breed: Breed, weightClass: WeightClass, genes: Gene[]): number {
  const geneHealth = genes.reduce((sum, gene) => sum + (gene.statMods?.Health ?? 0), 0);
  return Math.max(1, breed.baseHealth + weightClass.healthMod + geneHealth);
}

export function rollRoostr(): RolledRoostr {
  const breed = pickWeighted(BREEDS);
  const weightClass = pickWeighted(WEIGHT_CLASSES);
  const genes = pickGenes(breed);
  const colors = {} as ColorSet;
  for (const key of Object.keys(COLORS) as (keyof typeof COLORS)[]) {
    colors[key] = pick(COLORS[key]);
  }
  return {
    breed,
    weightClass,
    genes,
    maxHealth: deriveMaxHealth(breed, weightClass, genes),
    colors,
    pattern: pick(PATTERNS),
    role: deriveRole(genes),
    seed: Math.floor(Math.random() * 0xffffff),
  };
}
