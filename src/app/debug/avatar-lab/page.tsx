"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Slider from "@mui/material/Slider";
import Stack from "@mui/material/Stack";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import AvatarV2 from "@/components/AvatarV2";
import {
  ACCESSORIES,
  BREED_COSMETICS,
  COMBS,
  DEFAULT_TRAITS,
  LEGS,
  NECKS,
  PALETTE_PRESETS,
  PATTERNS,
  SILHOUETTES,
  TAILS,
  WEIGHTS,
  cosmeticForRoostr,
  type AvatarTraits,
} from "@/lib/avatarV2";
import { rollRoostr } from "@/lib/roostr";

// DEBUG side-project: Avatar V2 lab. Prototype the layered/animated pixel rooster
// without touching prod. Drop AI/artist parts into /public/avatar-parts/<silhouette>/
// <part>.png (grayscale for tintable parts) and they replace the placeholders here.

const COLOR_FIELDS: { key: keyof AvatarTraits; label: string }[] = [
  { key: "base", label: "Base (body/wing)" },
  { key: "accent1", label: "Accent 1 (tail/saddle)" },
  { key: "accent2", label: "Accent 2 (comb/wattle)" },
  { key: "skin", label: "Skin (beak/legs)" },
  { key: "patternColor", label: "Pattern color" },
];

function ColorInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Typography variant="body2">{label}</Typography>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{ width: 44, height: 28, border: "none", background: "none", cursor: "pointer" }}
      />
    </Stack>
  );
}

function Feat({
  label,
  value,
  opts,
  onChange,
}: {
  label: string;
  value: string;
  opts: readonly string[];
  onChange: (v: string) => void;
}) {
  return (
    <TextField
      select
      size="small"
      fullWidth
      label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {opts.map((o) => (
        <MenuItem key={o} value={o}>
          {o}
        </MenuItem>
      ))}
    </TextField>
  );
}

export default function AvatarLabPage() {
  const [t, setT] = useState<AvatarTraits>(DEFAULT_TRAITS);
  const [animate, setAnimate] = useState(true);
  const [size, setSize] = useState(280);
  const [breed, setBreed] = useState("");
  const [cw, setCw] = useState(0);
  const set = (patch: Partial<AvatarTraits>) => setT((s) => ({ ...s, ...patch }));

  // Apply a breed's cosmetic profile (features + a colorway from its palettes).
  const applyBreed = (id: string, idx = 0) => {
    const b = BREED_COSMETICS[id];
    if (!b) return;
    const p = b.palettes[((idx % b.palettes.length) + b.palettes.length) % b.palettes.length];
    setT((s) => ({
      ...s,
      silhouette: b.silhouette,
      tailType: b.tail,
      combType: b.comb,
      legType: b.legs,
      neckType: b.neck,
      pattern: b.patterns[0],
      patternColor: p.accent1,
      base: p.base,
      accent1: p.accent1,
      accent2: p.accent2,
      skin: p.skin,
    }));
  };
  const breedDef = breed ? BREED_COSMETICS[breed] : null;

  // Roll a REAL roostr (same path as hatching) → derive its V2 look from breed+seed.
  // Proves new generation AND existing DB rows (which already have breed+seed) map
  // to V2 deterministically — no migration.
  const [rolled, setRolled] = useState<{ breed: string; seed: number } | null>(null);
  const roll = () => {
    const r = rollRoostr();
    setRolled({ breed: r.breed.id, seed: r.seed });
    setBreed(r.breed.id);
    setCw(0);
    setT(cosmeticForRoostr(r.breed.id, r.seed));
  };

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button component={Link} href="/debug" color="neutral" sx={{ alignSelf: "flex-start" }}>
          ← Debug
        </Button>
        <Box>
          <Typography variant="h4" component="h1">
            🐔 Avatar V2 Lab
          </Typography>
          <Typography color="text.secondary">
            Layered + animated pixel rooster (side-project, not in prod). Placeholders
            until parts land in <code>/public/avatar-parts/&lt;silhouette&gt;/</code>.
          </Typography>
        </Box>

        <Box
          sx={{
            display: "grid",
            gap: 3,
            gridTemplateColumns: { xs: "1fr", md: "auto 1fr" },
            alignItems: "start",
          }}
        >
          {/* Stage */}
          <Card sx={{ p: 2 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                background: "repeating-conic-gradient(#e6e6e6 0% 25%, #f5f5f5 0% 50%) 0 / 24px 24px",
                p: 2,
              }}
            >
              <AvatarV2 traits={t} size={size} animate={animate} />
            </Box>
            <Stack spacing={1} sx={{ mt: 2 }}>
              <FormControlLabel
                control={<Switch checked={animate} onChange={(e) => setAnimate(e.target.checked)} />}
                label="Idle animation (bob / blink / tail)"
              />
              <Typography variant="caption" color="text.secondary">
                Size
              </Typography>
              <Slider
                value={size}
                min={120}
                max={360}
                onChange={(_, v) => setSize(v as number)}
                size="small"
              />
            </Stack>
          </Card>

          {/* Controls */}
          <Stack spacing={2}>
            <Card sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Breed (from COSMETICS.json)
              </Typography>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 0.5 }}>
                <TextField
                  select
                  size="small"
                  fullWidth
                  label="Breed"
                  value={breed}
                  onChange={(e) => {
                    setBreed(e.target.value);
                    setCw(0);
                    applyBreed(e.target.value, 0);
                  }}
                >
                  {Object.keys(BREED_COSMETICS).map((id) => (
                    <MenuItem key={id} value={id}>
                      {id}
                    </MenuItem>
                  ))}
                </TextField>
                <Button
                  size="small"
                  variant="outlined"
                  disabled={!breedDef || breedDef.palettes.length < 2}
                  onClick={() => {
                    const n = cw + 1;
                    setCw(n);
                    applyBreed(breed, n);
                  }}
                >
                  Colorway →
                </Button>
              </Stack>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mt: 1 }}>
                <Button size="small" variant="contained" onClick={roll}>
                  🎲 Roll roostr
                </Button>
                {rolled && (
                  <Typography variant="caption" color="text.secondary">
                    {rolled.breed} · seed {rolled.seed.toString(16)}
                  </Typography>
                )}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Presets
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                {PALETTE_PRESETS.map((p) => (
                  <Button key={p.name} size="small" variant="outlined" onClick={() => set(p.t)}>
                    {p.name}
                  </Button>
                ))}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Stack spacing={1.5}>
                <TextField
                  select
                  size="small"
                  label="Silhouette"
                  value={t.silhouette}
                  onChange={(e) => set({ silhouette: e.target.value })}
                >
                  {SILHOUETTES.map((s) => (
                    <MenuItem key={s} value={s}>
                      {s}
                    </MenuItem>
                  ))}
                </TextField>
                <Stack direction="row" spacing={1.5}>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Pattern"
                    value={t.pattern}
                    onChange={(e) => set({ pattern: e.target.value })}
                  >
                    {PATTERNS.map((p) => (
                      <MenuItem key={p} value={p}>
                        {p}
                      </MenuItem>
                    ))}
                  </TextField>
                  <TextField
                    select
                    size="small"
                    fullWidth
                    label="Accessory"
                    value={t.accessory}
                    onChange={(e) => set({ accessory: e.target.value })}
                  >
                    {ACCESSORIES.map((a) => (
                      <MenuItem key={a} value={a}>
                        {a}
                      </MenuItem>
                    ))}
                  </TextField>
                </Stack>
                <Divider />
                {COLOR_FIELDS.map((f) => (
                  <ColorInput
                    key={f.key}
                    label={f.label}
                    value={t[f.key] ?? ""}
                    onChange={(v) => set({ [f.key]: v } as Partial<AvatarTraits>)}
                  />
                ))}
              </Stack>
            </Card>

            <Card sx={{ p: 2 }}>
              <Typography variant="overline" color="text.secondary">
                Breed features (per-breed part variants)
              </Typography>
              <Stack spacing={1.5} sx={{ mt: 0.5 }}>
                <Stack direction="row" spacing={1.5}>
                  <Feat label="Tail" value={t.tailType} opts={TAILS} onChange={(v) => set({ tailType: v })} />
                  <Feat label="Comb" value={t.combType} opts={COMBS} onChange={(v) => set({ combType: v })} />
                </Stack>
                <Stack direction="row" spacing={1.5}>
                  <Feat label="Legs" value={t.legType} opts={LEGS} onChange={(v) => set({ legType: v })} />
                  <Feat label="Neck" value={t.neckType} opts={NECKS} onChange={(v) => set({ neckType: v })} />
                </Stack>
                <Feat
                  label="Weight (belly)"
                  value={t.weight ?? "middle"}
                  opts={WEIGHTS}
                  onChange={(v) => set({ weight: v })}
                />
              </Stack>
            </Card>
          </Stack>
        </Box>

        {/* Silhouette sheet — STATIC (this is the collection-grid mode: no anim). */}
        <Card sx={{ p: 2 }}>
          <Typography variant="overline" color="text.secondary">
            Silhouettes — collection grid (static, no animation)
          </Typography>
          <Box
            sx={{
              display: "grid",
              gap: 1,
              mt: 1,
              gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
            }}
          >
            {SILHOUETTES.map((s) => (
              <Stack key={s} alignItems="center" spacing={0.5}>
                <AvatarV2 traits={{ ...t, silhouette: s }} size={104} animate={false} />
                <Typography variant="caption" color="text.secondary">
                  {s}
                </Typography>
              </Stack>
            ))}
          </Box>
        </Card>
      </Stack>
    </Container>
  );
}
