// Roostrdex discovery state. No backend yet — discovered breed ids live in
// localStorage. Hatching a roostr (incubator/debug) records its breed here.

const STORAGE_KEY = "roostr.dex.discovered";

export function getDiscovered(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? (arr as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markDiscovered(id: string): void {
  if (typeof window === "undefined") return;
  const set = getDiscovered();
  if (set.has(id)) return;
  set.add(id);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}
