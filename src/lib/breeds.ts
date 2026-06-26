// Breed catalog. Single source of identity = src/data/BREEDS.json (the Roostrdex
// reads it directly; the hatch roll in lib/roostr.ts maps from it too).

import data from "@/data/BREEDS.json";
import groupsData from "@/data/GROUPS.json";
import type { Locale } from "@/i18n/config";

// Innate breed buff/debuff — grounded in look/habitat/character. It does NOT
// level up; it's a permanent distinguishing modifier. A breed has a pool of
// possible traits, while each hatched rooster stores one selected trait.
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
  traits?: BreedTrait[];
  description: { en: string; ru: string };
  tags: string[];
  // Real-world country of origin. `iso` (ISO 3166-1 alpha-2) is the machine key
  // for future country championships; en/ru are the display names.
  region: { en: string; ru: string; iso: string };
}

export const BREEDS_CATALOG = data.breeds as BreedEntry[];

// Groups in first-seen order — drive the Roostrdex filter.
// Breed groups — data in GROUPS.json. `id` is the canonical English key stored on
// each breed (BreedEntry.group) and used for palette lookups; name/description are
// localized display only.
export interface BreedGroup {
  id: string;
  icon: string;
  name: { en: string; ru: string };
  description: { en: string; ru: string };
}
export const BREED_GROUP_LIST = groupsData.groups as BreedGroup[];
const GROUP_BY_ID = Object.fromEntries(
  BREED_GROUP_LIST.map((g) => [g.id, g]),
) as Record<string, BreedGroup>;

// Group ids in canonical order (drive the Roostrdex / catalog filters).
export const BREED_GROUPS: string[] = BREED_GROUP_LIST.map((g) => g.id);

export function groupName(id: string, locale: Locale): string {
  return GROUP_BY_ID[id]?.name[locale] ?? id;
}
export function groupDescription(id: string, locale: Locale): string {
  return GROUP_BY_ID[id]?.description[locale] ?? "";
}

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
