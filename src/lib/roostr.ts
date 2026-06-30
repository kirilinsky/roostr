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
import synthGenesData from "@/data/SYNTH-GENES.json";
import relationsData from "@/data/RELATIONS.json";
import {
  cosmeticForRoostr,
  cosmeticFrom,
  type AvatarTraits,
  type Colorway,
} from "@/lib/avatarV2";

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
  | "Intellect"
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
  note?: { en: string; ru: string };
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
  passive?: { en: string; ru: string }; // localized flavor hook for future battle sim
}

// MVP gene set — data in GENES.json.
export const GENES = genesData.genes as Gene[];

// --- Synthetic genes (lab-built) ---
// Bought with science, max 2 slots per roostr. Unlike rolled genes each pumps
// EXACTLY ONE skill with NO debuff (statMods is a single positive entry = skill).
// Data in SYNTH-GENES.json.
export interface SynthGene {
  id: string;
  no: number; // sequential synth-gene number
  name: { en: string; ru: string };
  skill: Skill; // the single skill it boosts
  statMods: StatMods; // single positive entry, matches `skill`
  lore: { en: string; ru: string }; // cyberpunk biohacking flavor
}

export const SYNTH_GENES = synthGenesData.genes as SynthGene[];

// Max synthetic genes that can be spliced into one bird (DNA slots). Each is a
// distinct gene; you can't stack the same synth gene twice.
export const SYNTH_GENE_MAX_SLOTS = 2;

// synth-gene id -> definition (catalog lookup for hydration / shop / detail).
export const SYNTH_GENE_BY_ID = Object.fromEntries(
  SYNTH_GENES.map((g) => [g.id, g]),
) as Record<string, SynthGene>;

// Free synth-gene slots left on a bird carrying `ids` already.
export function synthSlotsLeft(ids: string[]): number {
  return Math.max(0, SYNTH_GENE_MAX_SLOTS - ids.length);
}

// --- Synth-gene upgrade rules (pure; shared by the server action + the UI) ---
// Synth genes level up like rolled genes, but the cost is in SCIENCE and ramps
// MUCH harder: each level roughly TRIPLES the price, so a maxed synth gene is a
// serious long-term science sink (not a quick buy like the rolled-gene coin path).
export const SYNTH_GENE_MAX_LEVEL = 10;
const SYNTH_UPGRADE_BASE = 150; // = the splice price; level 1→2 costs this
const SYNTH_UPGRADE_GROWTH = 2.6; // steep: ~×2.6 per level

// Science to upgrade a synth gene FROM `level` to level+1 (rises steeply).
export function synthGeneUpgradeCost(level: number): number {
  return Math.round(SYNTH_UPGRADE_BASE * SYNTH_UPGRADE_GROWTH ** (level - 1));
}

// Current level of a synth gene (missing = level 1).
export function synthGeneLevelOf(
  levels: Record<string, number>,
  geneId: string,
): number {
  return levels[geneId] ?? 1;
}

// Can the synth gene be upgraded further?
export function canUpgradeSynthGene(level: number): boolean {
  return level < SYNTH_GENE_MAX_LEVEL;
}

// Can gene `geneId` be spliced into a bird that already has `ids`? Blocked when
// no slots are free OR the bird already carries this exact gene. Pure — shared by
// the shop picker filter AND the server action's guard (so they never disagree).
export function canApplySynthGene(ids: string[], geneId: string): boolean {
  return synthSlotsLeft(ids) > 0 && !ids.includes(geneId);
}

// --- Breed (identity modifier, real chicken breeds) ---
export interface Breed {
  id: string;
  name: { en: string; ru: string };
  group: string; // breed group (English category id)
  affinity: string[]; // light lean, not a guarantee
  baseHealth: number;
  trait: BreedTrait; // selected/default innate buff/debuff (not upgradeable)
  traits: BreedTrait[]; // roll pool for this breed; first entry is the default
  geneAffinities?: {
    families?: Partial<Record<string, number>>;
    genes?: Partial<Record<string, number>>; // gene id -> roll weight multiplier
  };
  tags: string[]; // visual/identity tags — drive avatar silhouette & add-on layers
  region: { en: string; ru: string; iso: string }; // country of origin (iso = championships key)
  weight: number; // roll weight (some breeds are simply more common)
}

function normalizeBreedTraits(b: { trait: BreedTrait; traits?: BreedTrait[] }): BreedTrait[] {
  const out = b.traits?.length ? b.traits : [b.trait];
  return out.some((t) => t.id === b.trait.id) ? out : [b.trait, ...out];
}

export const BREEDS: Breed[] = BREEDS_CATALOG.map((b) => ({
  id: b.id,
  name: b.name,
  group: b.group,
  affinity: b.tendencies,
  baseHealth: b.baseHealth,
  trait: b.trait,
  traits: normalizeBreedTraits(b),
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

const SKILL_NAME = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.name]),
) as Record<string, { en: string; ru: string }>;
const ROLE_NAME = Object.fromEntries(
  ARCHETYPES.map((a) => [a.id, a.name]),
) as Record<string, { en: string; ru: string }>;

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
export function formatStatMods(
  mods: StatMods | undefined,
  locale: Locale,
): string {
  if (!mods) return "";
  return Object.entries(mods)
    .filter(
      (entry): entry is [StatModKey, number] =>
        typeof entry[1] === "number" && entry[1] !== 0,
    )
    .map(
      ([stat, value]) =>
        `${value > 0 ? "+" : ""}${value} ${skillLabel(stat, locale)}`,
    )
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

export interface RolledRoostr {
  breed: Breed;
  weightClass: WeightClass;
  genes: Gene[]; // 2-4 distinct key genes
  maxHealth: number; // starting max HP from breed + weight + genes
  stats: Record<Skill, number>; // starting skill values (base + gene mods)
  role: string; // recommended archetype (derived from genes)
  seed: number; // unique-combination id (cosmetic, for display)
}

export const SKILL_IDS = SKILLS.map((s) => s.id) as Skill[];
export const STAT_BAR_MAX = 8; // visual cap for stat bars (most start near base)
export const NICKNAME_MAX = 24; // max chars for a roostr's custom display name

// RNG is injected (default Math.random) so the roll is deterministic in tests:
// pass a seeded `mulberry32(seed)`. Production keeps Math.random.
export type Rng = () => number;

export function pickWeighted<T extends { weight: number }>(
  entries: readonly T[],
  rng: Rng = Math.random,
): T {
  const total = entries.reduce((s, e) => s + e.weight, 0);
  let r = rng() * total;
  for (const e of entries) {
    r -= e.weight;
    if (r <= 0) return e;
  }
  return entries[entries.length - 1];
}

export function pickBreedTrait(breed: Breed, rng: Rng = Math.random): BreedTrait {
  const traits = breed.traits.length ? breed.traits : [breed.trait];
  return traits[Math.floor(rng() * traits.length)] ?? traits[0];
}

export function breedWithTrait(breed: Breed, traitId?: string | null): Breed {
  const trait =
    breed.traits.find((t) => t.id === traitId) ??
    breed.trait ??
    breed.traits[0];
  return { ...breed, trait };
}

// Gene count: 2 almost always. 3 is uncommon (~0.3%). 1 and 4 are both super-rare
// (~1/50000 each) — a lone gene or a rich four-combo. Weights sum to 100000 so
// they read as direct odds. (Decision: GAME-DESIGN §11.)
const GENE_COUNT_WEIGHTS = [
  { count: 1, weight: 50 },
  { count: 2, weight: 99696 },
  { count: 3, weight: 919 },
  { count: 4, weight: 5 },
];

function geneRollWeight(gene: Gene, breed: Breed): number {
  const familyBias = breed.geneAffinities?.families?.[gene.family] ?? 1;
  const geneBias = breed.geneAffinities?.genes?.[gene.id] ?? 1;
  return familyBias * geneBias;
}

function pickBiasedGene(
  pool: Gene[],
  breed: Breed,
  rng: Rng = Math.random,
): Gene {
  const total = pool.reduce(
    (sum, gene) => sum + geneRollWeight(gene, breed),
    0,
  );
  let r = rng() * total;
  for (const gene of pool) {
    r -= geneRollWeight(gene, breed);
    if (r <= 0) return gene;
  }
  return pool[pool.length - 1];
}

export function pickGenes(breed: Breed, rng: Rng = Math.random): Gene[] {
  const k = pickWeighted(GENE_COUNT_WEIGHTS, rng).count;
  const pool = [...GENES];
  const out: Gene[] = [];
  for (let i = 0; i < k && pool.length > 0; i++) {
    const picked = pickBiasedGene(pool, breed, rng);
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
export function deriveRole(genes: Gene[]): string {
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

// --- Gene upgrade rules (pure; shared by the server action + the lab UI) ---

// Current level of a gene (missing = level 1).
export function geneLevelOf(levels: GeneLevels, geneId: string): number {
  return levels[geneId] ?? 1;
}

// Total gene-levels a roostr has bought (Σ level-1 over all genes). 0 = stock,
// never upgraded. Drives the "upgraded" rank insignia on cards. Derived from the
// stored geneLevels — no extra DB column needed.
export function geneUpgradeCount(levels: GeneLevels): number {
  return Object.values(levels).reduce((n, lvl) => n + Math.max(0, lvl - 1), 0);
}

// Can the gene be upgraded further?
export function canUpgradeGene(level: number): boolean {
  return level < GENE_MAX_LEVEL;
}

// New levels map after upgrading one gene by a level (clamped at max). Returns
// the existing map unchanged when already maxed.
export function upgradeGeneLevel(levels: GeneLevels, geneId: string): GeneLevels {
  const level = geneLevelOf(levels, geneId);
  if (!canUpgradeGene(level)) return levels;
  return { ...levels, [geneId]: level + 1 };
}

// --- Sell price bounds ---
// A listing's price is clamped to [min, max] derived from the bird's intrinsic
// worth: weight class, gene COUNT (more genes → pricier) and the coins SUNK into
// gene upgrades (invested birds can ask more). Keeps the market sane — there's a
// hard floor (can't dump for nothing) and a hard ceiling (no insane prices).
const SELL_MIN = 20; // absolute floor
const SELL_BASE = 45;
const SELL_PER_GENE = 60; // each gene adds value
const SELL_WEIGHT_STEP = 25; // per weight-class index (tiny → huge)
const SELL_UPGRADE_FACTOR = 0.55; // share of sunk upgrade coins that counts
const SELL_MAX_MULT = 5; // max = intrinsic × this
const SELL_HARD_CAP = 500_000; // never crazier than this

export function sellPriceBounds(
  genes: Gene[],
  geneLevels: GeneLevels,
  weightClass: WeightClass,
): { min: number; max: number } {
  const weightIdx = Math.max(
    0,
    WEIGHT_CLASSES.findIndex((w) => w.id === weightClass.id),
  );
  // total coins sunk upgrading genes (Σ geneUpgradeCost over each level gained)
  let invested = 0;
  for (const g of genes) {
    const lvl = geneLevelOf(geneLevels, g.id);
    for (let l = 1; l < lvl; l++) invested += geneUpgradeCost(l);
  }
  const intrinsic =
    SELL_BASE +
    genes.length * SELL_PER_GENE +
    weightIdx * SELL_WEIGHT_STEP +
    Math.round(invested * SELL_UPGRADE_FACTOR);

  const min = Math.max(SELL_MIN, Math.round(intrinsic * 0.4));
  const max = Math.min(SELL_HARD_CAP, Math.round(intrinsic * SELL_MAX_MULT));
  return { min, max };
}

// Skill block = base + weight body-mods + Σ over genes of (level × statMods) +
// Σ over synth genes of (synth level × statMods). Health is tracked separately
// (computeMaxHealth), not one of the skills.
export function computeStats(
  genes: Gene[],
  levels: GeneLevels = {},
  weightClass?: WeightClass,
  synthGenes: SynthGene[] = [],
  synthLevels: Record<string, number> = {},
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
  // Lab-spliced synth genes — single positive skill bump, no debuff, scaled by
  // the synth gene's upgrade level (missing = level 1).
  for (const sg of synthGenes) {
    const lvl = synthLevels[sg.id] ?? 1;
    for (const [stat, value] of Object.entries(sg.statMods ?? {})) {
      if (stat !== "Health" && stat in stats) stats[stat as Skill] += value * lvl;
    }
  }
  // Skills floor at 0: a fully debuffed combat skill CAN hit zero — the rooster
  // just loses fast at it (accepted design). HP is the one thing kept ≥1
  // (computeMaxHealth), so a bird is never dead on arrival. NOTE for the future
  // battle sim: handle 0 gracefully — no divide-by-stat, define 0-Speed/0-Accuracy.
  for (const s of SKILL_IDS) stats[s] = Math.max(0, stats[s]);
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

// HP counts at HALF weight in the rating so tiers track the BUILD (skills), not
// just raw HP — HP pools are large and were drowning out skill investment.
export const HP_RATING_WEIGHT = 0.5;

// Overall power/level = Σ skills + HP×HP_RATING_WEIGHT. Skills floor at 0, HP ≥1.
// Most genes are net-positive (esp. with +Health → HP), so leveling climbs the
// tier. A few genes with no Health and net-negative skill mods (Thunder Crow,
// Wild Rage) dip the rating mid-climb until their debuffs bottom out — intended.
// Monotonic: HP only grows with upgrades, skills floor — so upgrades only add.
export function computeRating(
  stats: Record<Skill, number>,
  maxHealth: number,
): number {
  const skillSum = Object.values(stats).reduce((sum, v) => sum + v, 0);
  return skillSum + Math.round(maxHealth * HP_RATING_WEIGHT);
}

export function rollRoostr(rng: Rng = Math.random): RolledRoostr {
  const baseBreed = pickWeighted(BREEDS, rng);
  const breed = breedWithTrait(baseBreed, pickBreedTrait(baseBreed, rng).id);
  const weightClass = pickWeighted(WEIGHT_CLASSES, rng);
  const genes = pickGenes(breed, rng);
  return {
    breed,
    weightClass,
    genes,
    maxHealth: computeMaxHealth(breed, weightClass, genes),
    stats: computeStats(genes, {}, weightClass),
    role: deriveRole(genes),
    seed: Math.floor(rng() * 0xffffff),
  };
}

// Seeded PRNG (mulberry32) — deterministic RNG for tests / reproducible rolls.
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
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
  synthGeneIds?: string[] | null; // lab-spliced synth genes (max 2)
  synthGeneLevels?: Record<string, number> | null; // synth gene upgrade levels
  seed: number;
  nickname?: string | null;
  role?: string; // recommended archetype (stored at hatch)
  wins?: number;
  losses?: number;
  draws?: number;
  status?: string; // active | working | listed | sold | recycled
  meta?: Record<string, unknown> | null; // forward catch-all (holds work info)
}

export interface HydratedRoostr {
  id?: string;
  breed: Breed;
  weightClass: WeightClass;
  genes: Gene[];
  geneLevels: GeneLevels;
  synthGeneIds: string[]; // raw ids spliced in (for slot/availability checks)
  synthGenes: SynthGene[]; // resolved synth-gene defs (catalog lookup)
  synthGeneLevels: GeneLevels; // synth gene upgrade levels (missing = level 1)
  seed: number;
  nickname: string | null;
  role: string; // recommended archetype id
  maxHealth: number;
  stats: Record<Skill, number>;
  rating: number;
  tier: TierMeta; // overall level/grade band (D < C < B < A < S < R < X)
  wins: number; // denormalized battle record (see schema / recordBattle)
  losses: number;
  draws: number;
  status: string; // active | working | listed | sold | recycled
  work: { kind: string; since: number } | null; // station assignment (lab/farm)
  cosmetic: AvatarTraits; // V2 avatar look — baked at hatch (meta.cosmetic), else derived
}

// Pull the station assignment ({kind, since}) out of the roostr's meta jsonb.
function parseWork(
  meta: Record<string, unknown> | null | undefined,
): { kind: string; since: number } | null {
  const w = meta?.work as { kind?: unknown; since?: unknown } | undefined;
  if (w && typeof w.kind === "string" && typeof w.since === "number") {
    return { kind: w.kind, since: w.since };
  }
  return null;
}

export function hydrateRoostr(row: RoostrRow): HydratedRoostr {
  const baseBreed = BREED_BY_ID[row.breedId] ?? BREEDS[0];
  const traitId =
    typeof row.meta?.traitId === "string" ? row.meta.traitId : null;
  const breed = breedWithTrait(baseBreed, traitId);
  const weightClass = WEIGHT_BY_ID[row.weightClassId] ?? WEIGHT_CLASSES[2];
  const genes = row.geneIds
    .map((id) => GENE_BY_ID[id])
    .filter((g): g is Gene => Boolean(g));
  const geneLevels = row.geneLevels ?? {};
  const synthGeneIds = row.synthGeneIds ?? [];
  const synthGeneLevels = row.synthGeneLevels ?? {};
  const synthGenes = synthGeneIds
    .map((id) => SYNTH_GENE_BY_ID[id])
    .filter((g): g is SynthGene => Boolean(g));
  const stats = computeStats(
    genes,
    geneLevels,
    weightClass,
    synthGenes,
    synthGeneLevels,
  );
  const maxHealth = computeMaxHealth(breed, weightClass, genes, geneLevels);
  const rating = computeRating(stats, maxHealth);
  return {
    id: row.id,
    breed,
    weightClass,
    genes,
    geneLevels,
    synthGeneIds,
    synthGenes,
    synthGeneLevels,
    seed: row.seed,
    nickname: row.nickname ?? null,
    role: row.role ?? deriveRole(genes),
    maxHealth,
    stats,
    rating,
    tier: tierFor(rating),
    wins: row.wins ?? 0,
    losses: row.losses ?? 0,
    draws: row.draws ?? 0,
    status: row.status ?? "active",
    work: parseWork(row.meta),
    // Look = breed features (always fresh) + the bird's colorway. The colorway is
    // baked at hatch (meta.cosmetic); if a row isn't backfilled yet, roll it from
    // the seed (same result) so it still renders.
    cosmetic: (() => {
      const cw = (row.meta as { cosmetic?: Colorway } | null)?.cosmetic;
      const c = cw
        ? cosmeticFrom(row.breedId, cw)
        : cosmeticForRoostr(row.breedId, row.seed);
      return { ...c, weight: weightClass.id }; // belly scales with weight class
    })(),
  };
}
