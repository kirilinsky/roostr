// Breed catalog. Single source of identity = src/data/BREEDS.json (the Roostrdex
// reads it directly; the hatch roll in lib/roostr.ts maps from it too).

import data from "@/data/BREEDS.json";
import type { Locale } from "@/i18n/config";

// One fixed innate buff/debuff per breed — grounded in look/habitat/character.
// It does NOT level up; it's a permanent distinguishing modifier (battle sim
// applies `effects`; UI shows the label). See .notes/GENE-MODIFIERS.md.
export interface BreedTrait {
  id: string;
  name: { en: string; ru: string };
  effects: { stat: string; mod: number }[]; // mod = signed multiplier delta, e.g. +0.10 / -0.08
  description: { en: string; ru: string };
}

export interface BreedEntry {
  id: string;
  name: { en: string; ru: string };
  group: string;
  origin: string;
  rarity: string;
  dropWeight: number;
  baseHealth: number;
  geneAffinities?: {
    families?: Partial<Record<string, number>>;
    genes?: Partial<Record<string, number>>;
  };
  tendencies: string[];
  trait: BreedTrait;
  description: { en: string; ru: string };
  tags: string[];
}

export const BREEDS_CATALOG = data.breeds as BreedEntry[];

// Groups in first-seen order — drive the Roostrdex filter.
export const BREED_GROUPS: string[] = Array.from(
  new Set(BREEDS_CATALOG.map((b) => b.group)),
);

export function localize(
  field: { en: string; ru: string },
  locale: Locale,
): string {
  return field[locale] ?? field.en;
}

// Base profile derived from a breed's tendencies. The breed sets the base
// silhouette/profile (.notes/GENE-MODIFIERS.md §2.1) — this is a dex-flavor
// readout, not battle truth (real power comes from прокачка).
const ATK_SKILLS = new Set(["Damage", "Crit", "Accuracy", "Speed"]);
const DEF_SKILLS = new Set(["Guard", "Endurance", "Recovery"]);

export function breedProfile(tendencies: string[]): { atk: number; def: number } {
  let atk = 35;
  let def = 35;
  for (const t of tendencies) {
    if (ATK_SKILLS.has(t)) atk += 30;
    else if (DEF_SKILLS.has(t)) def += 30;
    else {
      atk += 12;
      def += 12;
    }
  }
  return { atk: Math.min(100, atk), def: Math.min(100, def) };
}
