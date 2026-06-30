// Feathers = the battle-energy resource. They regenerate over time up to a
// per-user cap (`featherMax`, default 10, raisable by a future shop upgrade).
// Regen is settled LAZILY off an anchor timestamp (`feathersAt`): current =
// stored + whole hours elapsed, capped at max. Spending battles will later settle
// (write current → stored, reset the anchor); for now this is display-only, so a
// pure compute on read is enough — no write needed.

export const FEATHER_REGEN_MS = 3_600_000; // one feather per hour
export const DEFAULT_FEATHER_MAX = 10;

// Current feather count given the stored value + anchor, regenerated to `now`.
// Never below the stored value (a full/over-full balance from a future grant is
// preserved); regen only fills UP TO max.
export function currentFeathers(
  stored: number,
  max: number,
  atMs: number,
  nowMs: number,
): number {
  if (stored >= max) return stored;
  const gained = Math.floor(Math.max(0, nowMs - atMs) / FEATHER_REGEN_MS);
  return Math.min(max, stored + gained);
}

export interface FeatherState {
  current: number;
  max: number;
  full: boolean;
  nextInMs: number; // ms until the next feather regenerates (0 when full)
}

// Full readout for the HUD / bank: current vs max + time to the next feather.
export function featherState(
  stored: number,
  max: number,
  atMs: number,
  nowMs: number,
): FeatherState {
  const current = currentFeathers(stored, max, atMs, nowMs);
  if (current >= max) return { current, max, full: true, nextInMs: 0 };
  // Time since the anchor not yet credited to a whole feather → countdown to next.
  const sinceAnchor = Math.max(0, nowMs - atMs);
  const nextInMs = FEATHER_REGEN_MS - (sinceAnchor % FEATHER_REGEN_MS);
  return { current, max, full: false, nextInMs };
}
