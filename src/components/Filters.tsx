"use client";

import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
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
    <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
      {groups.map((g) => (
        <TextField
          key={g.key}
          select
          size="small"
          label={g.label}
          value={value[g.key] ?? ""}
          onChange={(e) => onChange(g.key, e.target.value)}
          sx={{ minWidth: 160 }}
        >
          <MenuItem value="">{allLabel}</MenuItem>
          {g.options.map((o) => (
            <MenuItem key={o.value} value={o.value}>
              {o.label}
            </MenuItem>
          ))}
        </TextField>
      ))}
    </Stack>
  );
}
