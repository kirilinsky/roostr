// Stat "kind" -> MUI palette color, shared so the stat bars and the legend modal
// never drift. Convention: red = attack, blue = defense, green = utility.
export type StatKind = "offense" | "defense" | "utility";

export const STAT_KIND_COLOR: Record<StatKind, "error" | "primary" | "success"> = {
  offense: "error", // red — attack
  defense: "primary", // blue — defense
  utility: "success", // green — utility
};

// Display order in the legend.
export const STAT_KIND_ORDER: StatKind[] = ["offense", "defense", "utility"];

// i18n keys for each kind's label.
export const STAT_KIND_LABEL_KEY: Record<StatKind, string> = {
  offense: "stats.offense",
  defense: "stats.defense",
  utility: "stats.utility",
};
