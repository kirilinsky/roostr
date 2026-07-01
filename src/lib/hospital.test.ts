import { describe, it, expect } from "vitest";
import {
  HOSPITAL_BASE_SLOTS,
  HOSPITAL_SLOT_PRICES,
  HEAL_PER_HOUR_PER_RECOVERY,
  maxHospitalSlots,
  nextHospitalSlotPrice,
  isHurt,
  healedHp,
  healEtaMs,
} from "@/lib/hospital";

const HOUR = 3_600_000;

describe("hospital — bed slots", () => {
  it("max beds = base + number of buyable prices", () => {
    expect(maxHospitalSlots()).toBe(HOSPITAL_BASE_SLOTS + HOSPITAL_SLOT_PRICES.length);
  });

  it("next price steps through the price ladder by owned count", () => {
    expect(nextHospitalSlotPrice(HOSPITAL_BASE_SLOTS)).toBe(HOSPITAL_SLOT_PRICES[0]);
    expect(nextHospitalSlotPrice(HOSPITAL_BASE_SLOTS + 1)).toBe(HOSPITAL_SLOT_PRICES[1]);
  });

  it("returns null when already at max beds", () => {
    expect(nextHospitalSlotPrice(maxHospitalSlots())).toBeNull();
  });

  it("returns null for below-base owned counts (no negative index wrap)", () => {
    expect(nextHospitalSlotPrice(0)).toBeNull();
    expect(nextHospitalSlotPrice(HOSPITAL_BASE_SLOTS - 1)).toBeNull();
  });
});

describe("hospital — isHurt (admittable check)", () => {
  it("null/undefined stored HP is treated as full (not hurt)", () => {
    expect(isHurt(null, 100)).toBe(false);
    expect(isHurt(undefined, 100)).toBe(false);
  });

  it("hurt when stored HP is strictly below max", () => {
    expect(isHurt(99, 100)).toBe(true);
    expect(isHurt(0, 100)).toBe(true);
  });

  it("not hurt at or above max", () => {
    expect(isHurt(100, 100)).toBe(false);
    expect(isHurt(120, 100)).toBe(false);
  });
});

describe("hospital — healedHp settle", () => {
  it("null stored HP means undamaged → returns max", () => {
    expect(healedHp(null, 100, 20, 0, HOUR)).toBe(100);
    expect(healedHp(undefined, 100, 20, 0, HOUR)).toBe(100);
  });

  it("already-full stored HP returns max, never over-heals", () => {
    expect(healedHp(100, 100, 20, 0, HOUR)).toBe(100);
    expect(healedHp(150, 100, 20, 0, HOUR)).toBe(100);
  });

  it("null anchor means not in hospital → HP frozen at stored value", () => {
    expect(healedHp(50, 100, 20, null, HOUR)).toBe(50);
  });

  it("heals Recovery HP per hour off the admit anchor", () => {
    // rate = 20/h; 1h elapsed → +20
    expect(healedHp(50, 100, 20, 0, HOUR)).toBe(70);
    // 2h elapsed → +40
    expect(healedHp(50, 100, 20, 0, 2 * HOUR)).toBe(90);
  });

  it("caps healed HP at max", () => {
    expect(healedHp(50, 60, 20, 0, HOUR)).toBe(60);
  });

  it("floors fractional HP gained", () => {
    // rate 15/h, half hour → +7.5 → floor(57.5) = 57
    expect(healedHp(50, 100, 15, 0, HOUR / 2)).toBe(57);
  });

  it("recovery clamps to a minimum rate of 1/h (0 or negative Recovery)", () => {
    expect(healedHp(50, 100, 0, 0, HOUR)).toBe(51);
    expect(healedHp(50, 100, -5, 0, HOUR)).toBe(51);
  });

  it("never regresses HP when clock is behind the anchor", () => {
    expect(healedHp(50, 100, 20, HOUR, 0)).toBe(50);
  });

  it("HEAL_PER_HOUR_PER_RECOVERY scales the rate", () => {
    // sanity guard: the tuning knob is 1 (change here signals a pace retune)
    expect(HEAL_PER_HOUR_PER_RECOVERY).toBe(1);
  });
});

describe("hospital — healEtaMs", () => {
  it("returns 0 when already full", () => {
    expect(healEtaMs(null, 100, 20, 0, HOUR)).toBe(0);
    expect(healEtaMs(100, 100, 20, 0, HOUR)).toBe(0);
  });

  it("computes remaining time from the settled HP", () => {
    // cur=50, remaining 50 at 20/h → 2.5h
    expect(healEtaMs(50, 100, 20, 0, 0)).toBe(2.5 * HOUR);
  });

  it("shrinks as healing progresses", () => {
    // after 1h: cur=70, remaining 30 at 20/h → 1.5h
    expect(healEtaMs(50, 100, 20, 0, HOUR)).toBe(1.5 * HOUR);
  });

  it("rounds the remaining time up (never reports early-done)", () => {
    // cur=50, remaining 50 at 15/h → 3.333..h → ceil to whole ms
    expect(healEtaMs(50, 100, 15, 0, 0)).toBe(Math.ceil((50 / 15) * HOUR));
  });
});
