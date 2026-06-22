// Achievements engine. Definitions live in ACHIEVEMENTS.json (the source of
// truth). Each unlocks when a computed metric reaches its threshold. Data-driven:
// add achievements in JSON, no code change. Two scopes — profile (global) and
// rooster (per bird). Surfacing (DB unlock tracking + UI) is layered on top; the
// metrics it needs are documented below and wired as those systems land.

import data from "@/data/ACHIEVEMENTS.json";
import { TIERS } from "@/lib/roostr";
import type { Locale } from "@/i18n/config";

export type AchievementScope = "profile" | "rooster";

// Rarity/prestige band. Drives badge styling (and later the art per tier).
export type AchievementTier = "common" | "rare" | "collectible";
export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  "common",
  "rare",
  "collectible",
];

export interface Achievement {
  id: string; // short stable key; also the art filename (/achievements/<id>.png)
  icon: string;
  tier: AchievementTier;
  name: { en: string; ru: string };
  desc: { en: string; ru: string };
  metric: string; // key into the metrics map (see *Metrics types below)
  value: number; // unlock threshold (metric >= value)
}

export const PROFILE_ACHIEVEMENTS = data.profile as Achievement[];
export const ROOSTER_ACHIEVEMENTS = data.rooster as Achievement[];

// Computed inputs the achievements read. Build these where the data lives
// (profile page / rooster page); pass to `evaluate`. Missing metric → treated 0
// (so achievements for not-yet-built systems, e.g. battles/invites, stay locked).
export interface ProfileMetrics {
  eggsHatched: number;
  coinsEarned: number;
  coinsSpent: number;
  sciEarned: number; // lifetime science points earned (Σ positive sci ledger rows)
  highestTier: number; // tier rank 0..6 of the user's best rooster
  roostrsOwned: number;
  roostrsSold: number; // lifetime roosters sold on the market (not tracked yet)
  saleEarnings: number; // lifetime coins earned from sales (not tracked yet)
  friends: number;
  invites: number; // not tracked yet
  battles: number; // not tracked yet
}

export interface RoosterMetrics {
  geneCount: number;
  maxGeneLevel: number;
  tierRank: number; // 0..6
  wins: number; // not tracked yet
  losses: number; // not tracked yet
}

export interface AchievementStatus {
  def: Achievement;
  unlocked: boolean;
  current: number; // current metric value
  progress: number; // 0..1 toward unlock
}

// Tier id ("D".."X") → rank 0..6 (TIERS is ascending). Used for tier metrics.
export function tierRank(tierId: string): number {
  const i = TIERS.findIndex((t) => t.id === tierId);
  return i < 0 ? 0 : i;
}

// Evaluate a set of definitions against a metrics map.
export function evaluate(
  defs: Achievement[],
  metrics: Record<string, number>,
): AchievementStatus[] {
  return defs.map((def) => {
    const current = metrics[def.metric] ?? 0;
    return {
      def,
      unlocked: current >= def.value,
      current,
      progress: def.value > 0 ? Math.min(1, current / def.value) : 1,
    };
  });
}

export function achievementName(a: Achievement, locale: Locale): string {
  return a.name[locale] ?? a.name.en;
}
export function achievementDesc(a: Achievement, locale: Locale): string {
  return a.desc[locale] ?? a.desc.en;
}
