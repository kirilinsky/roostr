import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  BODY_COLOR_HEX,
  FAMILY_COLOR,
  formatStatMods,
  type RolledRoostr,
} from "@/lib/roostr";
import { traitEffectLabel } from "@/lib/breeds";

// A "passport line" of cosmetic colors, in the order the design doc reads them.
const COLOR_ROWS: { key: keyof RolledRoostr["colors"]; label: string }[] = [
  { key: "body", label: "Body" },
  { key: "tail", label: "Tail" },
  { key: "hackle", label: "Hackle" },
  { key: "wing", label: "Wing" },
  { key: "comb", label: "Comb" },
  { key: "leg", label: "Legs" },
  { key: "eye", label: "Eyes" },
];

export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const { breed, weightClass, genes, maxHealth, colors, pattern, role, seed } = roostr;
  const bodyHex = BODY_COLOR_HEX[colors.body] ?? "#888";

  return (
    <Box
      sx={{
        width: 320,
        border: 1,
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: 3,
        bgcolor: "background.paper",
      }}
    >
      {/* Visual: backdrop tinted by body color + the rooster (always a rooster) */}
      <Box
        sx={{
          position: "relative",
          height: 200,
          background: `linear-gradient(160deg, ${bodyHex}, ${bodyHex}cc)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Box component="span" sx={{ fontSize: 120, lineHeight: 1 }}>
          🐓
        </Box>
        <Chip
          label="Common"
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontWeight: 700,
          }}
        />
        <Chip
          label={weightClass.name}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            right: 10,
            bgcolor: "rgba(0,0,0,0.55)",
            color: "#fff",
            fontWeight: 700,
          }}
        />
        <Chip
          label={`#${seed.toString(16).padStart(6, "0").toUpperCase()}`}
          size="small"
          sx={{
            position: "absolute",
            bottom: 10,
            right: 10,
            bgcolor: "rgba(0,0,0,0.45)",
            color: "#fff",
            fontFamily: "monospace",
          }}
        />
      </Box>

      <Box sx={{ p: 2 }}>
        {/* Identity: breed + recommended role */}
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
          sx={{ mb: 0.25 }}
        >
          <Typography variant="h6" noWrap>
            {breed.name}
          </Typography>
          <Chip label={role} size="small" color="primary" />
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {breed.vibe} · {weightClass.type}
        </Typography>
        <Stack direction="row" spacing={0.75} sx={{ mt: 1 }}>
          <Chip label={`HP ${maxHealth}`} size="small" variant="outlined" />
          <Chip
            label={breed.trait.name.en}
            size="small"
            color="secondary"
            variant="outlined"
            title={breed.trait.description.en}
          />
        </Stack>
        {/* Breed's innate buff/debuff — fixed, not upgradeable */}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mt: 0.5 }}
        >
          {traitEffectLabel(breed.trait.effects)}
        </Typography>

        <Divider sx={{ my: 1.5 }} />

        {/* Key genes (2-4): family color + native upgrade branch + starting trade-off */}
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.6 }}
        >
          Key genes ({genes.length})
        </Typography>
        <Stack spacing={0.75} sx={{ mb: 1.5 }}>
          {genes.map((g) => {
            const statMods = formatStatMods(g.statMods);

            return (
              <Stack
                key={g.id}
                direction="row"
                alignItems="center"
                spacing={1}
              >
                <Box
                  sx={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    bgcolor: FAMILY_COLOR[g.family],
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                    {g.name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {g.boosts.join(" · ")}
                  </Typography>
                </Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ fontWeight: 700, flexShrink: 0 }}
                  noWrap
                >
                  {statMods}
                </Typography>
              </Stack>
            );
          })}
        </Stack>

        {/* Cosmetic passport (no battle effect) */}
        <Typography
          variant="overline"
          color="text.secondary"
          sx={{ display: "block", lineHeight: 1.6 }}
        >
          {pattern}
        </Typography>
        <Stack
          direction="row"
          flexWrap="wrap"
          sx={{ gap: 0.5 }}
        >
          {COLOR_ROWS.map(({ key, label }) => (
            <Chip
              key={key}
              size="small"
              variant="outlined"
              label={`${label}: ${colors[key]}`}
            />
          ))}
        </Stack>
      </Box>
    </Box>
  );
}
