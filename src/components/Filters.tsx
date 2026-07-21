"use client";

import { useState, type ReactNode } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Collapse from "@mui/material/Collapse";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
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

const headlineFamily = "var(--font-headline), system-ui, sans-serif";

export default function Filters({
  groups,
  value,
  onChange,
  onReset,
  allLabel,
  trailing,
}: {
  groups: FilterGroup[];
  value: Record<string, string>; // group key -> selected value ("" = all)
  onChange: (key: string, value: string) => void;
  onReset?: () => void; // clears all groups; enables the Reset control
  allLabel: string;
  trailing?: ReactNode; // extra control (e.g. sort) laid out in the same grid
}) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const activeCount = Object.values(value).filter(Boolean).length;

  // An active select is accented (thick primary outline + bold primary label) so
  // it reads at a glance which facets are narrowing the grid. Tokens only (§V24:
  // plain palette-path strings, no theme fns nested in the sx sub-objects).
  const fieldSx = (active: boolean) => ({
    width: "100%",
    minWidth: 0,
    ...(active && {
      "& .MuiOutlinedInput-notchedOutline": {
        borderColor: "primary.main",
        borderWidth: 2,
      },
      "& .MuiInputLabel-root": { color: "primary.main", fontWeight: 700 },
    }),
  });

  const grid = (
    <Box
      sx={{
        display: "grid",
        gap: 1,
        // Mobile: 2 compact columns. Desktop: the row stretches edge-to-edge —
        // every select shares the full width equally (1fr, not max-content).
        gridTemplateColumns: {
          xs: "repeat(2, minmax(0, 1fr))",
          sm: "repeat(auto-fit, minmax(128px, 1fr))",
        },
      }}
    >
      {groups.map((g) => (
        <TextField
          key={g.key}
          select
          size="small"
          color="primary"
          label={g.label}
          value={value[g.key] ?? ""}
          onChange={(e) => onChange(g.key, e.target.value)}
          data-testid={`filter-${g.key}`}
          sx={fieldSx(Boolean(value[g.key]))}
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

  // Arcade header strip: square accent block + pixel-font title, active-count
  // pill, and a Reset chip (only when something is on + a reset handler exists).
  const header = (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1}
      sx={{ mb: 1.25, display: { xs: "none", md: "flex" } }}
    >
      <Box sx={{ width: 10, height: 10, bgcolor: "secondary.main" }} />
      <Typography
        sx={{
          fontFamily: headlineFamily,
          fontWeight: 900,
          fontSize: "0.85rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {t("filter.title")}
      </Typography>
      {activeCount > 0 && (
        <Chip
          label={activeCount}
          size="small"
          color="primary"
          sx={{ height: 20, fontWeight: 800, borderRadius: 0 }}
        />
      )}
      <Box sx={{ flexGrow: 1 }} />
      {onReset && activeCount > 0 && (
        <Button
          onClick={onReset}
          variant="text"
          color="neutral"
          size="small"
          sx={{ minWidth: 0 }}
        >
          {t("filter.reset")}
        </Button>
      )}
    </Stack>
  );

  return (
    <Box sx={{ width: "100%" }}>
      {/* Mobile toggle — opens the dropdown block; shows how many filters are on. */}
      <Button
        onClick={() => setOpen((o) => !o)}
        variant="outlined"
        color={activeCount > 0 ? "primary" : "neutral"}
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

      {/* Desktop: framed arcade panel — header strip over the always-inline grid. */}
      <Box
        sx={{
          display: { xs: "none", md: "block" },
          border: 1,
          borderColor: "divider",
          bgcolor: "background.paper",
          p: 1.5,
        }}
      >
        {header}
        {grid}
      </Box>

      {/* Mobile: collapsible. */}
      <Collapse in={open} sx={{ display: { xs: "block", md: "none" } }}>
        <Box sx={{ pt: 1 }}>
          {grid}
          {onReset && activeCount > 0 && (
            <Button
              onClick={onReset}
              variant="text"
              color="neutral"
              size="small"
              fullWidth
              sx={{ mt: 1 }}
            >
              {t("filter.reset")}
            </Button>
          )}
        </Box>
      </Collapse>
    </Box>
  );
}
