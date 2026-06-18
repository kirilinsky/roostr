// Roostr hatch model (MVP, client-side, no art/DB yet).
//
// Core rule (see .notes/GENE-MODIFIERS.md): every roostr hatches COMMON. It is
// never born Rare/Legendary. What is unique is the *combination*: breed + weight
// + cosmetic colors + pattern + 2-4 key genes. Genes don't make it strong at
// birth — they define cheaper/stronger upgrade branches (its role). Power comes
// later from прокачка, not from the egg.

import type { Locale } from "@/i18n/config";
import { BREEDS_CATALOG, type BreedTrait } from "@/lib/breeds";
import skillsData from "@/data/SKILLS.json";
import genesData from "@/data/GENES.json";
import relationsData from "@/data/RELATIONS.json";
import cosmeticsData from "@/data/COSMETICS.json";

// --- Skills (upgrade axes) ---
// The string-union stays the canonical vocabulary (compile-time safety); the
// metadata table lives in SKILLS.json. Keep ids in sync.
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
  | "Luck"
  | "Stealth"
  | "Fertility";

export interface SkillMeta {
  id: Skill;
  name: { en: string; ru: string };
  kind: "offense" | "defense" | "utility";
  description: { en: string; ru: string };
}

export const SKILLS = skillsData.skills as SkillMeta[];

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
  | "Voice"
  | "Stealth";

export interface FamilyMeta {
  id: GeneFamily;
  name: { en: string; ru: string };
  color: string;
  boosts: Skill[];
  weakens: Skill[];
  role: string;
}

export interface ArchetypeMeta {
  id: string;
  name: { en: string; ru: string };
  families: GeneFamily[];
  strengths: Skill[];
  weaknesses: Skill[];
  note?: string;
}

// The interrelation table (families <-> skills <-> roles, archetypes).
export const FAMILIES = relationsData.families as FamilyMeta[];
export const ARCHETYPES = relationsData.archetypes as ArchetypeMeta[];

// Overall-level tiers (D < C < B < A < S < R < X). Tier = band of total rating.
export interface TierMeta {
  id: string;
  min: number; // inclusive rating threshold
  color: string;
}
export const TIERS = relationsData.tiers as TierMeta[];

// Highest tier whose threshold the rating reaches (TIERS sorted ascending).
export function tierFor(rating: number): TierMeta {
  let best = TIERS[0];
  for (const tr of TIERS) if (rating >= tr.min) best = tr;
  return best;
}

export const FAMILY_COLOR = Object.fromEntries(
  FAMILIES.map((f) => [f.id, f.color]),
) as Record<GeneFamily, string>;

export interface Gene {
  id: string;
  no: number; // sequential gene number — used as the DNA passport code
  name: { en: string; ru: string };
  family: GeneFamily;
  boosts: Skill[]; // native (cheaper, higher ceiling) upgrade branch
  weakness: string; // human-readable trade-off
  role: string; // role this gene leans toward
  statMods?: StatMods; // small starting buff/debuff
  passive?: string; // human-readable special behavior for future battle sim
}

// MVP gene set — data in GENES.json.
export const GENES = genesData.genes as Gene[];

// --- Breed (identity modifier, real chicken breeds) ---
export interface Breed {
  id: string;
  name: { en: string; ru: string };
  group: string; // breed group (English category id)
  affinity: string[]; // light lean, not a guarantee
  baseHealth: number;
  trait: BreedTrait; // fixed innate buff/debuff (not upgradeable)
  geneAffinities?: {
    families?: Partial<Record<string, number>>;
    genes?: Partial<Record<string, number>>;
  };
  tags: string[]; // visual/identity tags — drive avatar silhouette & add-on layers
  region: { en: string; ru: string; iso: string }; // country of origin (iso = championships key)
  weight: number; // roll weight (some breeds are simply more common)
}

export const BREEDS: Breed[] = BREEDS_CATALOG.map((b) => ({
  id: b.id,
  name: b.name,
  group: b.group,
  affinity: b.tendencies,
  baseHealth: b.baseHealth,
  trait: b.trait,
  geneAffinities: b.geneAffinities,
  tags: b.tags,
  region: b.region,
  weight: b.dropWeight,
}));

// --- Weight class (body modifier) ---
export interface WeightClass {
  id: string;
  name: { en: string; ru: string };
  bonus: string;
  penalty: string;
  type: string;
  kg: number; // numeric body weight (display)
  healthMod: number;
  statMods?: StatMods; // body shaping (e.g. Huge minuses Stealth)
  weight: number; // roll weight; extremes are rarer
}

// Weight classes (body modifiers) — data in RELATIONS.json.
export const WEIGHT_CLASSES = relationsData.weightClasses as WeightClass[];

// --- Cosmetic colors + pattern (no battle effect) — data in COSMETICS.json ---
export type CosmeticLayer =
  | "body"
  | "wing"
  | "tail"
  | "hackle"
  | "comb"
  | "leg"
  | "eye"
  | "beak";

interface ColorSwatch {
  name: { en: string; ru: string };
  hex: string;
  weight: number; // drop frequency; exotics are low
}

const COSMETIC_LAYERS = cosmeticsData.layers as Record<
  CosmeticLayer,
  ColorSwatch[]
>;

// layer -> available color ids (the canonical key = name.en; what the roll picks).
export const COLORS = Object.fromEntries(
  (Object.keys(COSMETIC_LAYERS) as CosmeticLayer[]).map((layer) => [
    layer,
    COSMETIC_LAYERS[layer].map((c) => c.name.en),
  ]),
) as Record<CosmeticLayer, string[]>;

const PATTERN_SWATCHES = cosmeticsData.patterns as { en: string; ru: string }[];
export const PATTERNS = PATTERN_SWATCHES.map((p) => p.en); // ids (en) — what the roll picks
const PATTERN_RU = Object.fromEntries(PATTERN_SWATCHES.map((p) => [p.en, p.ru]));

export function patternLabel(id: string, locale: Locale): string {
  return locale === "ru" ? (PATTERN_RU[id] ?? id) : id;
}

export function colorLabel(
  layer: CosmeticLayer,
  id: string,
  locale: Locale,
): string {
  return locale === "ru" ? (COLOR_LABEL_RU[layer]?.[id] ?? id) : id;
}

// layer -> { colorId: hex } (fixed swatches). Renderer/cards paint from this.
export const COLOR_HEX = Object.fromEntries(
  (Object.keys(COSMETIC_LAYERS) as CosmeticLayer[]).map((layer) => [
    layer,
    Object.fromEntries(COSMETIC_LAYERS[layer].map((c) => [c.name.en, c.hex])),
  ]),
) as Record<CosmeticLayer, Record<string, string>>;

// layer -> { colorId: ruLabel } for localized display.
export const COLOR_LABEL_RU = Object.fromEntries(
  (Object.keys(COSMETIC_LAYERS) as CosmeticLayer[]).map((layer) => [
    layer,
    Object.fromEntries(COSMETIC_LAYERS[layer].map((c) => [c.name.en, c.name.ru])),
  ]),
) as Record<CosmeticLayer, Record<string, string>>;

// Back-compat: the card paints its backdrop from the rolled body color.
export const BODY_COLOR_HEX = COLOR_HEX.body;

const SKILL_NAME = Object.fromEntries(SKILLS.map((s) => [s.id, s.name])) as Record<
  string,
  { en: string; ru: string }
>;
const ROLE_NAME = Object.fromEntries(ARCHETYPES.map((a) => [a.id, a.name])) as Record<
  string,
  { en: string; ru: string }
>;

// Localized label for a skill or the special "Health" stat.
export function skillLabel(stat: string, locale: Locale): string {
  if (stat === "Health") return locale === "ru" ? "ХП" : "HP";
  return SKILL_NAME[stat]?.[locale] ?? stat;
}

// Localized label for an archetype/role id.
export function roleLabel(role: string, locale: Locale): string {
  return ROLE_NAME[role]?.[locale] ?? role;
}

// "+2 Guard · -1 Speed" — gene starting mods (integers), localized.
export function formatStatMods(mods: StatMods | undefined, locale: Locale): string {
  if (!mods) return "";
  return Object.entries(mods)
    .filter(
      (entry): entry is [StatModKey, number] =>
        typeof entry[1] === "number" && entry[1] !== 0,
    )
    .map(([stat, value]) => `${value > 0 ? "+" : ""}${value} ${skillLabel(stat, locale)}`)
    .join(" · ");
}

// "+10% Crit · -8% Recovery" — breed trait effects (percent), localized.
export function formatTraitEffects(
  effects: { stat: string; mod: number }[],
  locale: Locale,
): string {
  return effects
    .map((e) => {
      const pct = Math.round(e.mod * 100);
      return `${pct > 0 ? "+" : ""}${pct}% ${skillLabel(e.stat, locale)}`;
    })
    .join(" · ");
}

export type ColorSet = Record<CosmeticLayer, string>;

export interface RolledRoostr {
  breed: Breed;
  weightClass: WeightClass;
  genes: Gene[]; // 2-4 distinct key genes
  maxHealth: number; // starting max HP from breed + weight + genes
  stats: Record<Skill, number>; // starting skill values (base + gene mods)
  colors: ColorSet;
  pattern: string;
  role: string; // recommended archetype (derived from genes)
  seed: number; // unique-combination id (cosmetic, for display)
}

export const SKILL_IDS = SKILLS.map((s) => s.id) as Skill[];
export const STAT_BAR_MAX = 8; // visual cap for stat bars (most start near base)

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

// Gene count: 2 almost always. 3 is uncommon (~0.3%). 1 and 4 are both super-rare
// (~1/50000 each) — a lone gene or a rich four-combo. Weights sum to 100000 so
// they read as direct odds. (Decision: GAME-DESIGN §11.)
const GENE_COUNT_WEIGHTS = [
  { count: 1, weight: 19 },
  { count: 2, weight: 99696 },
  { count: 3, weight: 399 },
  { count: 4, weight: 3 },
];

function geneRollWeight(gene: Gene, breed: Breed): number {
  const familyBias = breed.geneAffinities?.families?.[gene.family] ?? 1;
  const geneBias = breed.geneAffinities?.genes?.[gene.name.en] ?? 1;
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

const FAMILY_ROLE = Object.fromEntries(
  FAMILIES.map((f) => [f.id, f.role]),
) as Record<GeneFamily, string>;

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

// --- Gene leveling & stat derivation ---
// A roostr starts with each key gene at level 1. The player spends coins to
// raise a gene's level; at level L a gene applies its statMods × L — so BOTH the
// gene's buffs and its debuffs grow, which is the stat balance.

const BASE_STAT = 4;
export const GENE_MAX_LEVEL = 10;
const UPGRADE_BASE = 10;
const UPGRADE_GROWTH = 1.6;

// geneId -> current level (missing = level 1).
export type GeneLevels = Record<string, number>;

// Coins to upgrade a gene FROM `level` to level+1 (cost rises each level).
export function geneUpgradeCost(level: number): number {
  return Math.round(UPGRADE_BASE * UPGRADE_GROWTH ** (level - 1));
}

// Skill block = base + weight body-mods + Σ over genes of (level × statMods).
// Health is tracked separately (computeMaxHealth), not one of the skills.
export function computeStats(
  genes: Gene[],
  levels: GeneLevels = {},
  weightClass?: WeightClass,
): Record<Skill, number> {
  const stats = Object.fromEntries(
    SKILL_IDS.map((s) => [s, BASE_STAT]),
  ) as Record<Skill, number>;
  // Body shaping from weight class (fixed, not leveled) — e.g. Huge → -Stealth.
  for (const [stat, value] of Object.entries(weightClass?.statMods ?? {})) {
    if (stat !== "Health" && stat in stats) stats[stat as Skill] += value;
  }
  for (const gene of genes) {
    const lvl = levels[gene.id] ?? 1;
    for (const [stat, value] of Object.entries(gene.statMods ?? {})) {
      if (stat !== "Health" && stat in stats) {
        stats[stat as Skill] += value * lvl;
      }
    }
  }
  for (const s of SKILL_IDS) stats[s] = Math.max(1, stats[s]);
  return stats;
}

export function computeMaxHealth(
  breed: Breed,
  weightClass: WeightClass,
  genes: Gene[],
  levels: GeneLevels = {},
): number {
  const geneHealth = genes.reduce(
    (sum, gene) => sum + (gene.statMods?.Health ?? 0) * (levels[gene.id] ?? 1),
    0,
  );
  return Math.max(1, breed.baseHealth + weightClass.healthMod + geneHealth);
}

// Overall power/level = sum of all 10 stats + maxHealth. Monotonic with upgrades:
// debuffed stats floor at 1, so leveling keeps adding net points → tier climbs.
export function computeRating(
  stats: Record<Skill, number>,
  maxHealth: number,
): number {
  return Object.values(stats).reduce((sum, v) => sum + v, 0) + maxHealth;
}

export function rollRoostr(): RolledRoostr {
  const breed = pickWeighted(BREEDS);
  const weightClass = pickWeighted(WEIGHT_CLASSES);
  const genes = pickGenes(breed);
  const colors = {} as ColorSet;
  for (const layer of Object.keys(COSMETIC_LAYERS) as CosmeticLayer[]) {
    colors[layer] = pickWeighted(COSMETIC_LAYERS[layer]).name.en;
  }
  return {
    breed,
    weightClass,
    genes,
    maxHealth: computeMaxHealth(breed, weightClass, genes),
    stats: computeStats(genes, {}, weightClass),
    colors,
    pattern: pick(PATTERNS),
    role: deriveRole(genes),
    seed: Math.floor(Math.random() * 0xffffff),
  };
}

// --- Hydration: DB row -> usable model ---
// A persisted roostr stores only ids (breedId/weightClassId/geneIds) + colors +
// pattern + seed + geneLevels. Cards/pages rehydrate the full objects from the
// catalogs and recompute the derived stats (never stored) on read.

const BREED_BY_ID = Object.fromEntries(BREEDS.map((b) => [b.id, b]));
const WEIGHT_BY_ID = Object.fromEntries(WEIGHT_CLASSES.map((w) => [w.id, w]));
const GENE_BY_ID = Object.fromEntries(GENES.map((g) => [g.id, g]));

// Minimal shape we need off a roostrs row (extra columns are ignored).
export interface RoostrRow {
  id?: string;
  breedId: string;
  weightClassId: string;
  geneIds: string[];
  geneLevels?: Record<string, number> | null;
  colors: Record<string, string>;
  pattern: string;
  seed: number;
  nickname?: string | null;
}

export interface HydratedRoostr {
  id?: string;
  breed: Breed;
  weightClass: WeightClass;
  genes: Gene[];
  geneLevels: GeneLevels;
  colors: ColorSet;
  pattern: string;
  seed: number;
  nickname: string | null;
  maxHealth: number;
  stats: Record<Skill, number>;
  rating: number;
  tier: TierMeta; // overall level/grade band (D < C < B < A < S < R < X)
}

export function hydrateRoostr(row: RoostrRow): HydratedRoostr {
  const breed = BREED_BY_ID[row.breedId] ?? BREEDS[0];
  const weightClass = WEIGHT_BY_ID[row.weightClassId] ?? WEIGHT_CLASSES[2];
  const genes = row.geneIds
    .map((id) => GENE_BY_ID[id])
    .filter((g): g is Gene => Boolean(g));
  const geneLevels = row.geneLevels ?? {};
  const stats = computeStats(genes, geneLevels, weightClass);
  const maxHealth = computeMaxHealth(breed, weightClass, genes, geneLevels);
  const rating = computeRating(stats, maxHealth);
  return {
    id: row.id,
    breed,
    weightClass,
    genes,
    geneLevels,
    colors: row.colors as ColorSet,
    pattern: row.pattern,
    seed: row.seed,
    nickname: row.nickname ?? null,
    maxHealth,
    stats,
    rating,
    tier: tierFor(rating),
  };
}
