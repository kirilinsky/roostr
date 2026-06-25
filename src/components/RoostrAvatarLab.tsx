"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import { tierBackground } from "@/lib/tierBg";
import {
  BREEDS,
  COLORS,
  COLOR_HEX,
  PATTERNS_BY_PART,
  WEIGHT_CLASSES,
  colorLabel,
  patternLabel,
  rollRoostr,
  type CosmeticLayer,
} from "@/lib/roostr";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Avatar workshop (dev tool). Pick params on a grid → live deterministic preview.
// Builds/verifies the layer compositor across the whole combination space without
// having to re-roll. The renderer it drives is the same <RoostrAvatar> the card uses.

const LAYER_ROWS: { key: CosmeticLayer; labelKey: string }[] = [
  { key: "body", labelKey: "card.body" },
  { key: "wing", labelKey: "card.wing" },
  { key: "tail", labelKey: "card.tail" },
  { key: "hackle", labelKey: "card.hackle" },
  { key: "saddle", labelKey: "card.saddle" },
  { key: "comb", labelKey: "card.comb" },
  { key: "beak", labelKey: "card.beak" },
  { key: "leg", labelKey: "card.leg" },
  { key: "eye", labelKey: "card.eye" },
];

export default function RoostrAvatarLab() {
  const t = useT();
  const locale = useLocale();

  // Seed the lab from a real roll so it opens on a valid rooster.
  const [state, setState] = useState(() => {
    const r = rollRoostr();
    return {
      colors: r.colors,
      pattern: r.pattern,
      breedId: r.breed.id,
      weightId: r.weightClass.id,
      seed: r.seed,
    };
  });

  const breed = BREEDS.find((b) => b.id === state.breedId) ?? BREEDS[0];
  const weightClass =
    WEIGHT_CLASSES.find((w) => w.id === state.weightId) ?? WEIGHT_CLASSES[2];

  function setColor(layer: CosmeticLayer, id: string) {
    setState((s) => ({
      ...s,
      colors: { ...s.colors, [layer]: { ...s.colors[layer], color: id } },
    }));
  }

  // Pattern is per-part now; the lab's single picker drives body + wing together.
  function setPattern(id: string) {
    setState((s) => ({
      ...s,
      pattern: id,
      colors: {
        ...s.colors,
        body: { ...s.colors.body, pattern: id },
        wing: { ...s.colors.wing, pattern: id },
      },
    }));
  }

  function randomize() {
    const r = rollRoostr();
    setState({
      colors: r.colors,
      pattern: r.pattern,
      breedId: r.breed.id,
      weightId: r.weightClass.id,
      seed: r.seed,
    });
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="overline" color="text.secondary">
        Avatar workshop
      </Typography>

      <Stack
        direction={{ xs: "column", md: "row" }}
        spacing={2}
        alignItems="flex-start"
        sx={{ mt: 1 }}
      >
        {/* live preview */}
        <Stack
          spacing={1}
          alignItems="center"
          sx={{
            p: 1.5,
            borderRadius: 0,
            border: 1,
            borderColor: "divider",
            bgcolor: "background.paper",
            flexShrink: 0,
          }}
        >
          <Box
            sx={{
              width: 240,
              maxWidth: "100%",
              aspectRatio: "1 / 1",
              borderRadius: 0,
              overflow: "hidden",
              // lab has no rating → default to the D (gray) backdrop
              background: tierBackground("#9e9e9e"),
            }}
          >
            <RoostrAvatarPixel
              colors={state.colors}
              pattern={state.pattern}
              breed={breed}
              weightClass={weightClass}
              seed={state.seed}
              size={240}
            />
          </Box>
          <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="center">
            {breed.tags.map((tag) => (
              <Chip key={tag} label={tag} size="small" variant="outlined" />
            ))}
          </Stack>
          <Button variant="contained" onClick={randomize}>
            🎲 Randomize
          </Button>
        </Stack>

        {/* param grid */}
        <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="Breed"
              value={state.breedId}
              onChange={(e) => setState((s) => ({ ...s, breedId: e.target.value }))}
              sx={{ minWidth: 180 }}
            >
              {BREEDS.map((b) => (
                <MenuItem key={b.id} value={b.id}>
                  {b.name[locale]}
                </MenuItem>
              ))}
            </TextField>
          </Stack>

          {/* weight */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              Weight
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {WEIGHT_CLASSES.map((w) => (
                <Chip
                  key={w.id}
                  label={w.name[locale]}
                  color={state.weightId === w.id ? "primary" : "default"}
                  onClick={() => setState((s) => ({ ...s, weightId: w.id }))}
                />
              ))}
            </Stack>
          </Box>

          {/* pattern */}
          <Box>
            <Typography variant="caption" color="text.secondary">
              {t("card.marbleTraits")}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {PATTERNS_BY_PART.body.map((p) => (
                <Chip
                  key={p}
                  label={patternLabel(p, locale)}
                  size="small"
                  color={state.colors.body.pattern === p ? "secondary" : "default"}
                  onClick={() => setPattern(p)}
                />
              ))}
            </Stack>
          </Box>

          {/* color swatch grid per layer */}
          {LAYER_ROWS.map(({ key, labelKey }) => (
            <Box key={key}>
              <Typography variant="caption" color="text.secondary">
                {t(labelKey)}: {colorLabel(key, state.colors[key].color, locale)}
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {COLORS[key].map((id) => {
                  const selected = state.colors[key].color === id;
                  return (
                    <Box
                      key={id}
                      component="button"
                      title={colorLabel(key, id, locale)}
                      onClick={() => setColor(key, id)}
                      sx={{
                        width: 24,
                        height: 24,
                        p: 0,
                        cursor: "pointer",
                        borderRadius: "50%",
                        bgcolor: COLOR_HEX[key][id],
                        border: selected ? 3 : 1,
                        borderColor: selected ? "primary.main" : "rgba(0,0,0,0.3)",
                        outline: selected ? "1px solid" : "none",
                        outlineColor: "primary.main",
                      }}
                    />
                  );
                })}
              </Stack>
            </Box>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}
