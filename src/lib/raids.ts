// Raids — "Coop & Dagger" heist mode. Stealth/Luck roosters raid a coop for coins
// (SPEC §V14/§V16, design in .notes/RAIDS.md). PHASE 1 = the window + party staging
// only (assemble a party, buy party slots, see a target). Launch/timer/resolve and
// the real `raids` table land in phase 2 — numbers here are tunable placeholders.

import raidBotsData from "@/data/RAID_BOTS.json";
import type { HydratedRoostr } from "@/lib/roostr";

// Party-size slots: 2 free + coin-bought expansions (same slot model as a station /
// the hospital). Stored in work_stations kind="raid" (only slotsOwned) — no accrual.
export const RAID_BASE_SLOTS = 2;
export const RAID_SLOT_PRICES = [400, 1200]; // coins for the 3rd, 4th slot → max 4

export function maxRaidSlots(): number {
  return RAID_BASE_SLOTS + RAID_SLOT_PRICES.length;
}

// Coin cost of the NEXT raider slot given how many are owned, or null if maxed.
export function nextRaidSlotPrice(current: number): number | null {
  const i = current - RAID_BASE_SLOTS;
  return i >= 0 && i < RAID_SLOT_PRICES.length ? RAID_SLOT_PRICES[i] : null;
}

// Stealth drives raid power (sneak past the Watch); Luck feeds rarity odds (phase 2);
// Speed drives DURATION (how fast the party travels there + back).
export function partyPower(party: HydratedRoostr[]): number {
  return party.reduce((s, r) => s + (r.stats.Stealth ?? 0), 0);
}
export function partyLuck(party: HydratedRoostr[]): number {
  return party.reduce((s, r) => s + (r.stats.Luck ?? 0), 0);
}
export function partySpeed(party: HydratedRoostr[]): number {
  return party.reduce((s, r) => s + (r.stats.Speed ?? 0), 0);
}

// Raids are LONG "fire-and-forget" missions — think hours, up to ~a day. Duration
// scales with the target's Watch (harder coop = longer infiltration) ÷ the party's
// Speed (faster birds travel there + back quicker). Floored at 1h so nothing is
// trivially fast; capped at 24h. All placeholders — tune BASE/MIN/MAX freely.
const HOUR_MS = 3_600_000;
export const RAID_MIN_MS = 1 * HOUR_MS;
export const RAID_MAX_MS = 24 * HOUR_MS;
export const RAID_BASE_HOURS = 6; // scaling constant for watch/speed

export function raidDurationMs(watch: number, speed: number): number {
  // No speed at all → the slowest possible run.
  if (speed <= 0) return RAID_MAX_MS;
  const raw = (RAID_BASE_HOURS * HOUR_MS * Math.max(1, watch)) / speed;
  return Math.min(RAID_MAX_MS, Math.max(RAID_MIN_MS, Math.round(raw)));
}

// Three separate jobs so the model reads intuitively:
//   Luck  → HOW MUCH you grab (loot size)   — this fn
//   Stealth → the WIN CHANCE (raidSuccess)
//   Speed   → the DURATION (raidDurationMs)  — time, does NOT shrink the loot
// The haul is capped by the TARGET's wealth (its coin pool / real balance) — you
// can't grab more than the coop holds. This is the amount ON SUCCESS; success is a
// separate roll (E[loot] = loot · success). Deliberately small (a slow trickle).
// Coins per party Luck point. Was a flat 6; trimmed 6% (product, 2026-07-12) to
// slow the faucet a touch — kept as an explicit ×0.94 so the cut is auditable.
export const RAID_LOOT_PER_LUCK = 6 * 0.94; // = 5.64

export function raidLoot(partyLuckSum: number, targetPool: number): number {
  const grabbed = Math.round(RAID_LOOT_PER_LUCK * Math.max(0, partyLuckSum));
  return Math.max(0, Math.min(targetPool, grabbed));
}

// Success = raidPower / (raidPower + defense), never 0 / never guaranteed. Used for
// the pre-launch odds preview now; the actual resolve roll reuses it in phase 2.
export function raidSuccess(power: number, defense: number): number {
  if (power <= 0) return 0;
  return Math.min(0.95, Math.max(0.05, power / (power + defense)));
}

// --- Phase 2: launch/resolve tunables (all deliberately FLAT + visible in the UI
// so the raid contract reads at a glance: "1 feather, −3/−7 HP, 15% egg") ---

// Launch cost — one feather (battle energy, regen 1/hour, cap 10).
export const RAID_FEATHER_COST = 1;

// HP the raid takes from EVERY party bird on return — flat so the risk is legible
// pre-launch. Deliberately NOTICEABLE (~16% / ~32% of a typical 31-HP bird): the
// hospital loop is part of the raid price, not an afterthought. Fail hurts 2×;
// HP floors at 1 (a raid never kills).
export const RAID_HP_COST_WIN = 5;
export const RAID_HP_COST_LOSS = 10;

// Faucet egg drop on a SUCCESSFUL raid — the "sometimes eggs" spice. Always a
// GAME FAUCET (bots have no owner; PvP later will also drop from the game, never
// steal from the victim — eggs are the growth gate, .notes/RAIDS.md §Loot rules).
export const RAID_EGG_CHANCE = 0.15;
export const RAID_EGG_AMOUNT = 1;

// Broke target → consolation faucet so a raid is never fully empty (spec: 2–16).
export const RAID_CONSOLATION_MIN = 2;
export const RAID_CONSOLATION_MAX = 16;

// One raid in flight per player — keeps the mode simple and the party lock honest.
// (Multiple concurrent raids = a later phase decision, not a bug.)

// Bot targets — synthetic opponents mixed into matchmaking while the player base is
// tiny (.notes/RAIDS.md §Matchmaking). Data-only; NEVER written to `users`, so the
// bot layer is a single knob to turn off later.
export interface RaidBot {
  id: string;
  name: { en: string; ru: string };
  watch: number; // synthetic Defense Watch (Σ Crow equivalent)
  coinPool: number; // coin pool for loot math (phase 2)
}
export const RAID_BOTS = raidBotsData.bots as RaidBot[];
export function raidBotById(id: string): RaidBot | null {
  return RAID_BOTS.find((b) => b.id === id) ?? null;
}
