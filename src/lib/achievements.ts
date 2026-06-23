// Achievements engine. Definitions live in ACHIEVEMENTS.json (the source of
// truth). Each unlocks when a computed metric reaches its threshold. Data-driven:
// add achievements in JSON, no code change. Two scopes — profile (global) and
// rooster (per bird). Surfacing (DB unlock tracking + UI) is layered on top; the
// metrics it needs are documented below and wired as those systems land.

import data from "@/data/ACHIEVEMENTS.json";
import { TIERS } from "@/lib/roostr";
import type { Locale } from "@/i18n/config";

export type AchievementScope = "profile" | "rooster";

// Rarity/prestige band, ascending. Drives badge styling (and later the art per
// tier).
export type AchievementTier = "common" | "medium" | "rare" | "collectible";
export const ACHIEVEMENT_TIERS: AchievementTier[] = [
  "common",
  "medium",
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

// The achievements read a flat `Record<string, number>` metrics map (missing key →
// 0 → locked). The maps are built where the data lives:
//   - profile: `getProfileMetrics(userId)` in src/db/queries.ts
//   - rooster: `roosterMetricsFrom(bird)` below (per-bird, no DB)
// Which metric keys are wired vs blocked is tracked in .notes/ACHIEVEMENTS-ROADMAP.md.

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

// Build the rooster (per-bird) metrics map from a hydrated roostr. Everything here
// is derivable from the bird itself — no DB round-trip. `synthSlotsFilled` stays
// absent (→ 0, locked) until synthetic genes are actually stored on the bird.
// Structural param so this stays decoupled from the full HydratedRoostr type.
export function roosterMetricsFrom(r: {
  genes: { id: string }[];
  geneLevels: Record<string, number>;
  tier: { id: string };
  wins: number;
  losses: number;
  stats: Record<string, number>;
}): Record<string, number> {
  const levels = Object.values(r.geneLevels);
  const statVals = Object.values(r.stats);
  return {
    geneCount: r.genes.length,
    maxGeneLevel: levels.length ? Math.max(...levels) : r.genes.length ? 1 : 0,
    tierRank: tierRank(r.tier.id),
    wins: r.wins,
    losses: r.losses,
    soloGene: r.genes.length === 1 ? 1 : 0,
    minStat: statVals.length ? Math.min(...statVals) : 0,
  };
}

export function achievementName(a: Achievement, locale: Locale): string {
  return a.name[locale] ?? a.name.en;
}
export function achievementDesc(a: Achievement, locale: Locale): string {
  return a.desc[locale] ?? a.desc.en;
}
