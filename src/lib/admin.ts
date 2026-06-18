// Admin allowlist (by Telegram id). Admins see debug-only features: the /debug
// page and the Roostrdex "reveal" peek. No DB yet — ids live here. Extend the
// list or set NEXT_PUBLIC_ADMIN_IDS (comma-separated) to add more.

const DEFAULT_ADMIN_IDS = [339784494];

function envAdminIds(): number[] {
  const raw = process.env.NEXT_PUBLIC_ADMIN_IDS;
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n));
}

export const ADMIN_IDS = new Set<number>([
  ...DEFAULT_ADMIN_IDS,
  ...envAdminIds(),
]);

export function isAdmin(id?: number | null): boolean {
  return typeof id === "number" && ADMIN_IDS.has(id);
}
