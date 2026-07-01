// Hospital — heal a hurt bird over time. Unlike the resource stations (farm/lab),
// healing is PER-BIRD: each patient regenerates its own HP toward its own maxHealth
// at a rate set by its Recovery skill. Settled lazily off `hpAt` (the admit anchor),
// same pattern as feather regen — compute on read, write only on discharge.

export const HOSPITAL_BASE_SLOTS = 1; // free beds before any expansion
// Coin price of each EXTRA bed. Length = how many can be bought → max beds = base + len.
export const HOSPITAL_SLOT_PRICES = [200, 800];

export function maxHospitalSlots(): number {
  return HOSPITAL_BASE_SLOTS + HOSPITAL_SLOT_PRICES.length;
}

// Coin cost of the NEXT bed given how many are currently owned, or null if maxed.
export function nextHospitalSlotPrice(current: number): number | null {
  const i = current - HOSPITAL_BASE_SLOTS;
  return i >= 0 && i < HOSPITAL_SLOT_PRICES.length ? HOSPITAL_SLOT_PRICES[i] : null;
}
// HP restored per hour = Recovery × this. Recovery ~20-40 → a maxHealth of ~60-150
// heals in a couple hours. Tunable knob for the whole hospital pace.
export const HEAL_PER_HOUR_PER_RECOVERY = 1;
const HOUR_MS = 3_600_000;

// A bird counts as hurt (admittable) when its stored HP is below its max.
export function isHurt(currentHp: number | null | undefined, max: number): boolean {
  return currentHp != null && currentHp < max;
}

// Current healed HP given the stored value + the bird's Recovery + the heal anchor.
// Never exceeds max; a null stored value means full (undamaged).
export function healedHp(
  storedHp: number | null | undefined,
  max: number,
  recovery: number,
  hpAtMs: number | null | undefined,
  nowMs: number,
): number {
  if (storedHp == null || storedHp >= max) return max;
  if (hpAtMs == null) return storedHp; // not healing (not in hospital)
  const rate = Math.max(1, recovery) * HEAL_PER_HOUR_PER_RECOVERY;
  const gained = (Math.max(0, nowMs - hpAtMs) / HOUR_MS) * rate;
  return Math.min(max, Math.floor(storedHp + gained));
}

// ms until the bird is fully healed (0 if already full).
export function healEtaMs(
  storedHp: number | null | undefined,
  max: number,
  recovery: number,
  hpAtMs: number | null | undefined,
  nowMs: number,
): number {
  const cur = healedHp(storedHp, max, recovery, hpAtMs, nowMs);
  if (cur >= max) return 0;
  const rate = Math.max(1, recovery) * HEAL_PER_HOUR_PER_RECOVERY;
  return Math.ceil(((max - cur) / rate) * HOUR_MS);
}
