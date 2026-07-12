import { describe, it, expect } from "vitest";
import {
  raidSuccess,
  raidDurationMs,
  raidLoot,
  raidRiskMult,
  raidBotById,
  RAID_BOTS,
  RAID_MIN_MS,
  RAID_MAX_MS,
  RAID_FEATHER_COST,
  RAID_HP_COST_WIN,
  RAID_HP_COST_LOSS,
  RAID_EGG_CHANCE,
  RAID_CONSOLATION_MIN,
  RAID_CONSOLATION_MAX,
  RAID_LOOT_PER_LUCK,
  maxRaidSlots,
  nextRaidSlotPrice,
  RAID_BASE_SLOTS,
} from "@/lib/raids";

describe("raidSuccess", () => {
  it("is clamped to [0.05, 0.95] — never impossible, never guaranteed", () => {
    expect(raidSuccess(1, 1000)).toBe(0.05);
    expect(raidSuccess(1000, 1)).toBe(0.95);
  });

  it("zero power → 0 (no party, no raid)", () => {
    expect(raidSuccess(0, 10)).toBe(0);
  });

  it("even odds at power == defense", () => {
    expect(raidSuccess(20, 20)).toBeCloseTo(0.5);
  });

  it("more Stealth strictly helps", () => {
    expect(raidSuccess(30, 20)).toBeGreaterThan(raidSuccess(20, 20));
  });
});

describe("raidDurationMs", () => {
  it("clamps between 1h and 24h", () => {
    expect(raidDurationMs(1, 1000)).toBe(RAID_MIN_MS);
    expect(raidDurationMs(1000, 1)).toBe(RAID_MAX_MS);
    expect(raidDurationMs(10, 0)).toBe(RAID_MAX_MS); // no Speed → slowest run
  });

  it("more Speed → shorter raid (never longer)", () => {
    const slow = raidDurationMs(20, 10);
    const fast = raidDurationMs(20, 20);
    expect(fast).toBeLessThanOrEqual(slow);
  });
});

describe("raidLoot", () => {
  it("scales with Luck at the fixed per-point rate (rounded to whole coins)", () => {
    expect(raidLoot(10, 10_000)).toBe(Math.round(10 * RAID_LOOT_PER_LUCK));
  });

  it("is capped by the target pool (can't grab more than the coop holds)", () => {
    expect(raidLoot(100, 50)).toBe(50);
  });

  it("never negative", () => {
    expect(raidLoot(-5, 100)).toBe(0);
    expect(raidLoot(5, 0)).toBe(0);
  });

  it("risk pays: a harder coop multiplies the haul (+2%/Watch)", () => {
    expect(raidRiskMult(0)).toBe(1);
    expect(raidRiskMult(30)).toBeCloseTo(1.6);
    // Same party, richer/harder coop → strictly bigger grab (pools permitting).
    expect(raidLoot(12, 10_000, 30)).toBeGreaterThan(raidLoot(12, 10_000, 3));
  });
});

describe("raid economy contract (the numbers shown in the UI)", () => {
  it("flat, legible costs: 1 feather; −5 HP win / −10 HP fail; 15% egg", () => {
    expect(RAID_FEATHER_COST).toBe(1);
    expect(RAID_HP_COST_WIN).toBe(5);
    expect(RAID_HP_COST_LOSS).toBe(10);
    expect(RAID_HP_COST_LOSS).toBeGreaterThan(RAID_HP_COST_WIN); // fail hurts more
    expect(RAID_EGG_CHANCE).toBeGreaterThan(0);
    expect(RAID_EGG_CHANCE).toBeLessThanOrEqual(0.25); // eggs stay a spice, not a faucet
  });

  it("loot rate carries the 6% trim (6 × 0.94)", () => {
    expect(RAID_LOOT_PER_LUCK).toBeCloseTo(5.64);
  });

  it("consolation band matches the spec (2–16)", () => {
    expect(RAID_CONSOLATION_MIN).toBe(2);
    expect(RAID_CONSOLATION_MAX).toBe(16);
    expect(RAID_CONSOLATION_MIN).toBeLessThanOrEqual(RAID_CONSOLATION_MAX);
  });

  it("expected coin rate stays modest vs the egg-shop anchor (75 coins/egg)", () => {
    // Worst-case generous run: a maxed 4-bird party of high-Luck birds (~6 Luck
    // each ≈ 24 Luck) vs the weakest bot. E[loot/hour] must stay well under the
    // egg-shop base price per hour — raids are a trickle, not a money printer.
    const bot = RAID_BOTS[0]; // weakest watch
    const luck = 24;
    const stealth = 30;
    const speed = 20;
    const loot = raidLoot(luck, bot.coinPool, bot.watch);
    const p = raidSuccess(stealth, bot.watch);
    const hours = raidDurationMs(bot.watch, speed) / 3_600_000;
    const ratePerHour = (loot * p) / hours;
    expect(ratePerHour).toBeLessThan(75); // < one shop egg per hour of raiding
  });
});

describe("raid slots", () => {
  it("2 free + priced expansions to the cap", () => {
    expect(maxRaidSlots()).toBe(RAID_BASE_SLOTS + 2);
    expect(nextRaidSlotPrice(RAID_BASE_SLOTS)).toBe(400);
    expect(nextRaidSlotPrice(RAID_BASE_SLOTS + 1)).toBe(1200);
    expect(nextRaidSlotPrice(maxRaidSlots())).toBeNull();
  });
});

describe("bots", () => {
  it("lookup by id round-trips; unknown → null", () => {
    for (const b of RAID_BOTS) expect(raidBotById(b.id)).toBe(b);
    expect(raidBotById("bot-nope")).toBeNull();
  });

  it("every bot has a positive watch and pool", () => {
    for (const b of RAID_BOTS) {
      expect(b.watch).toBeGreaterThan(0);
      expect(b.coinPool).toBeGreaterThan(0);
    }
  });
});
