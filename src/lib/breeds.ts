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
    genes?: Partial<Record<string, number>>; // gene id -> roll weight multiplier
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

// Breed rarity = the breed's drop-chance band ONLY (cosmetic/flavor). It does NOT
// affect stats — any rarity can be raised into a champion. Localized labels:
const RARITY_NAME: Record<string, { en: string; ru: string }> = {
  common: { en: "Common", ru: "Обычная" },
  uncommon: { en: "Uncommon", ru: "Необычная" },
  rare: { en: "Rare", ru: "Редкая" },
  epic: { en: "Epic", ru: "Эпическая" },
  legendary: { en: "Legendary", ru: "Легендарная" },
};

export function rarityLabel(rarity: string, locale: Locale): string {
  return RARITY_NAME[rarity]?.[locale] ?? rarity;
}

// Localized breed tag labels (the small descriptive chips). Falls back to the raw
// id so a new tag still renders (just untranslated) until added here.
const TAG_NAME: Record<string, { en: string; ru: string }> = {
  ancient: { en: "Ancient", ru: "Древняя" },
  australian: { en: "Australian", ru: "Австралийская" },
  balanced: { en: "Balanced", ru: "Сбалансированная" },
  barred: { en: "Barred", ru: "Полосатая" },
  beard: { en: "Beard", ru: "Бородка" },
  bearded: { en: "Bearded", ru: "Бородатая" },
  black: { en: "Black", ru: "Чёрная" },
  calm: { en: "Calm", ru: "Спокойная" },
  classic: { en: "Classic", ru: "Классическая" },
  collectible: { en: "Collectible", ru: "Коллекционная" },
  crest: { en: "Crest", ru: "Хохолок" },
  curled: { en: "Curled", ru: "Кудрявая" },
  "dark-eggs": { en: "Dark eggs", ru: "Тёмные яйца" },
  "double-laced": { en: "Double-laced", ru: "Двойная окантовка" },
  duelist: { en: "Duelist", ru: "Дуэлянт" },
  durable: { en: "Durable", ru: "Прочная" },
  dutch: { en: "Dutch", ru: "Голландская" },
  eggs: { en: "Eggs", ru: "Яйценоская" },
  elegant: { en: "Elegant", ru: "Элегантная" },
  farm: { en: "Farm", ru: "Фермерская" },
  fast: { en: "Fast", ru: "Быстрая" },
  "feathered-feet": { en: "Feathered feet", ru: "Оперённые ноги" },
  fighter: { en: "Fighter", ru: "Боец" },
  "five-toed": { en: "Five-toed", ru: "Пятипалая" },
  fluffy: { en: "Fluffy", ru: "Пушистая" },
  funny: { en: "Funny", ru: "Забавная" },
  game: { en: "Gamefowl", ru: "Бойцовая" },
  german: { en: "German", ru: "Немецкая" },
  giant: { en: "Giant", ru: "Гигантская" },
  "hard-feather": { en: "Hard-feather", ru: "Жёсткое перо" },
  hardy: { en: "Hardy", ru: "Выносливая" },
  heavy: { en: "Heavy", ru: "Тяжёлая" },
  iconic: { en: "Iconic", ru: "Культовая" },
  indonesian: { en: "Indonesian", ru: "Индонезийская" },
  japanese: { en: "Japanese", ru: "Японская" },
  laced: { en: "Laced", ru: "Окантованная" },
  largest: { en: "Largest", ru: "Самая крупная" },
  laughing: { en: "Laughing", ru: "Смеющаяся" },
  layer: { en: "Layer", ru: "Несушка" },
  legend: { en: "Legend", ru: "Легенда" },
  "long-crower": { en: "Long-crower", ru: "Долгопоющая" },
  longtail: { en: "Longtail", ru: "Длиннохвостая" },
  meat: { en: "Meat", ru: "Мясная" },
  "multi-spur": { en: "Multi-spur", ru: "Многошпорая" },
  mystic: { en: "Mystic", ru: "Мистическая" },
  "naked-neck": { en: "Naked-neck", ru: "Голошеяя" },
  oddity: { en: "Oddity", ru: "Диковинка" },
  ornamental: { en: "Ornamental", ru: "Декоративная" },
  patterned: { en: "Patterned", ru: "Узорчатая" },
  premium: { en: "Premium", ru: "Премиум" },
  productive: { en: "Productive", ru: "Продуктивная" },
  proud: { en: "Proud", ru: "Гордая" },
  punk: { en: "Punk", ru: "Панковая" },
  quirky: { en: "Quirky", ru: "Чудаковатая" },
  rare: { en: "Rare", ru: "Редкая" },
  reach: { en: "Reach", ru: "Размах" },
  "record-layer": { en: "Record layer", ru: "Рекордная несушка" },
  red: { en: "Red", ru: "Красная" },
  reliable: { en: "Reliable", ru: "Надёжная" },
  round: { en: "Round", ru: "Округлая" },
  scrappy: { en: "Scrappy", ru: "Задиристая" },
  show: { en: "Show", ru: "Выставочная" },
  small: { en: "Small", ru: "Маленькая" },
  soft: { en: "Soft-feather", ru: "Мягкое перо" },
  spangled: { en: "Spangled", ru: "Крапчатая" },
  sprightly: { en: "Sprightly", ru: "Бойкая" },
  stamina: { en: "Stamina", ru: "Выносливость" },
  status: { en: "Status", ru: "Статусная" },
  strong: { en: "Strong", ru: "Сильная" },
  swift: { en: "Swift", ru: "Стремительная" },
  tall: { en: "Tall", ru: "Высокая" },
  tank: { en: "Tank", ru: "Танк" },
  tiny: { en: "Tiny", ru: "Крошечная" },
  turken: { en: "Turken", ru: "Туркен" },
  turkish: { en: "Turkish", ru: "Турецкая" },
  voice: { en: "Voice", ru: "Голосистая" },
  white: { en: "White", ru: "Белая" },
};

export function tagLabel(tag: string, locale: Locale): string {
  return TAG_NAME[tag]?.[locale] ?? tag;
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
