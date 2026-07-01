"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { useT } from "@/i18n/I18nProvider";

// Universal filter bar. Each group is a single-select dropdown with an "all"
// option. Generic + reusable: pass any groups, hold the value map in the parent.
// Mobile: the dropdowns are tucked behind a toggle (a 4-select block is too tall
// on a phone); desktop shows them inline. Active-filter count shown on the toggle.
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
  trailing,
}: {
  groups: FilterGroup[];
  value: Record<string, string>; // group key -> selected value ("" = all)
  onChange: (key: string, value: string) => void;
  allLabel: string;
  trailing?: ReactNode; // extra control (e.g. sort) laid out in the same grid
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(value).filter(Boolean).length;

  const grid = (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        // Mobile: 2 compact columns. Desktop: tighter natural-width pills in a row.
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(auto-fit, minmax(128px, max-content))",
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
          data-testid={`filter-${g.key}`}
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
      {trailing}
    </Box>
  );

  return (
    <Box sx={{ width: "100%" }}>
      {/* Mobile toggle — opens the dropdown block; shows how many filters are on. */}
      <Button
        onClick={() => setOpen((o) => !o)}
        variant="outlined"
        color="neutral"
        size="small"
        fullWidth
        sx={{
          display: { xs: "flex", md: "none" },
          justifyContent: "space-between",
        }}
      >
        <span>
          {t("filter.title")}
          {activeCount > 0 ? ` · ${activeCount}` : ""}
        </span>
        <span>{open ? "▲" : "▼"}</span>
      </Button>

      {/* Desktop: always inline. */}
      <Box sx={{ display: { xs: "none", md: "block" } }}>{grid}</Box>

      {/* Mobile: collapsible. */}
      <Collapse in={open} sx={{ display: { xs: "block", md: "none" } }}>
        <Box sx={{ pt: 1 }}>{grid}</Box>
      </Collapse>
    </Box>
  );
}
