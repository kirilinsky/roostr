// Shared bits of the hospital UI (HospitalView + its extracted sections).

// ms → compact "Nh Nm" / "Nm" ETA label ("" once done).
export function fmtEta(ms: number): string {
  if (ms <= 0) return "";
  const m = Math.ceil(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

// Dashed "admit / buy bed" tile styling shared by the bed-grid action cells.
export const DASHED_TILE = {
  minHeight: 190,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 1,
  cursor: "pointer",
  border: "2px dashed",
  borderColor: "divider",
  bgcolor: "transparent",
  boxShadow: "none",
  color: "text.secondary",
  transition: "border-color 0.15s, color 0.15s",
} as const;
