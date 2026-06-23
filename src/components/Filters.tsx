"use client";

import Box from "@mui/material/Box";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";

// Universal filter bar. Each group is a single-select dropdown with an "all"
// option. Generic + reusable: pass any groups, hold the value map in the parent.
export interface FilterOption {
  value: string;
  label: string;
}
export interface FilterGroup {
  key: string;
  label: string;
  options: FilterOption[];
}

export default function Filters({
  groups,
  value,
  onChange,
  allLabel,
}: {
  groups: FilterGroup[];
  value: Record<string, string>; // group key -> selected value ("" = all)
  onChange: (key: string, value: string) => void;
  allLabel: string;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gap: 1.5,
        // Mobile: 2 compact columns. Desktop: natural-width pills in a row.
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(auto-fit, minmax(150px, max-content))",
        },
      }}
    >
      {groups.map((g) => (
        <TextField
          key={g.key}
          select
          size="small"
          label={g.label}
          value={value[g.key] ?? ""}
          onChange={(e) => onChange(g.key, e.target.value)}
          sx={{ width: "100%", minWidth: 0 }}
        >
          <MenuItem value="">{allLabel}</MenuItem>
          {g.options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
    </Box>
  );
}
