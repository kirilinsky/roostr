// Work-station engine — the SHARED, cheat-proof accrual model behind the lab and
// the farm (and any future "assign roosters → earn a resource over time" mode).
//
// Anti-cheat: a resource accrues by TIME-IN-SERVICE, never by a snapshot at a
// payout tick. The station's `pending` buffer is settled (pending += elapsed ×
// rate) on EVERY change of the worker set (assign/remove) and on claim — so each
// interval has a constant worker set and exact time integration. Placing a worker
// one minute before a payout credits one minute, not a whole day. All on server
// timestamps. Assigned roosters are status-locked (can't be upgraded), so their
// stat is constant while in service → the integral stays exact.
//
// Add a new station = one entry in STATIONS. No engine changes.

import type { Skill } from "@/lib/roostr";
import type { ResourceKind } from "@/db/queries";

export type StationKind = "lab" | "farm" | "defense";

export interface StationDef {
  kind: StationKind;
  resource: ResourceKind; // what it produces (ledger kind = the station kind)
  stat: Skill; // the rooster stat that drives output
  baseSlots: number; // free slots before any expansion
  bufferCap: number; // max pending before production pauses (until claimed)
  // resource produced per DAY for a given total stat + worker count.
  ratePerDay: (totalStat: number, workers: number) => number;
  // Purchasable +1 worker-slot unlocks. `prices[i]` = cost of the (i+1)-th extra
  // slot, so the ladder length is how many slots can be bought (baseSlots → +len).
  slotCost: { resource: ResourceKind; prices: number[] };
  // Defense (and any future "live, no buffer" mode) doesn't accrue — assigned
  // roosters provide their effect instantly (Σ stat), nothing to claim.
  accrual?: boolean; // default true; false = stateful/no buffer
}

export const STATIONS: Record<StationKind, StationDef> = {
  // Farm → eggs from Fertility. Exponential + slow (SPEC §V13).
  farm: {
    kind: "farm",
    resource: "egg",
    stat: "Fertility",
    baseSlots: 2,
    bufferCap: 5,
    ratePerDay: (f, n) => (n === 0 ? 0 : 2 ** ((f - 30) / 10)),
    slotCost: { resource: "coin", prices: [100, 500] },
  },
  // Lab → science from Intellect. Linear: ΣIntellect science/day.
  lab: {
    kind: "lab",
    resource: "sci",
    stat: "Intellect",
    baseSlots: 2,
    bufferCap: 50,
    ratePerDay: (i, n) => (n === 0 ? 0 : i),
    slotCost: { resource: "sci", prices: [100, 500] },
  },
  // Defense → base guard from Crow (Крик). LIVE, no accrual: guards on watch sum
  // their Crow into the base's defense; remove them and it's gone. 1 base slot,
  // expansions bought with Corn Coins.
  defense: {
    kind: "defense",
    resource: "coin", // unused — defense never produces/claims
    stat: "Crow",
    baseSlots: 1,
    bufferCap: 0,
    ratePerDay: () => 0,
    slotCost: { resource: "coin", prices: [200, 500, 1200] },
    accrual: false,
  },
};

// Max worker slots for a station = base + number of purchasable unlocks.
export function maxSlots(kind: StationKind): number {
  return STATIONS[kind].baseSlots + STATIONS[kind].slotCost.prices.length;
}

// Cost of the NEXT slot for a station that currently owns `current` slots, or null
// if already maxed.
export function nextSlotPrice(
  kind: StationKind,
  current: number,
): number | null {
  const i = current - STATIONS[kind].baseSlots;
  const { prices } = STATIONS[kind].slotCost;
  return i >= 0 && i < prices.length ? prices[i] : null;
}

const DAY_MS = 86_400_000;

// Pure: pending buffer after `nowMs`, given the (constant-over-the-interval)
// worker set's total stat. Capped at bufferCap (production pauses when full).
export function settlePending(
  def: StationDef,
  pending: number,
  totalStat: number,
  workers: number,
  lastMs: number,
  nowMs: number,
): number {
  if (nowMs <= lastMs) return pending;
  const days = (nowMs - lastMs) / DAY_MS;
  const next = pending + days * def.ratePerDay(totalStat, workers);
  return Math.min(def.bufferCap, next);
}
