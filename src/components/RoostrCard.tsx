import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import type { RolledRoostr, LayerKey } from "@/lib/roostr";

const TRAIT_ROWS: LayerKey[] = [
  "species",
  "eyes",
  "beak",
  "wings",
  "headwear",
  "accessory",
  "background",
  "aura",
  "mutation",
];

export default function RoostrCard({ roostr }: { roostr: RolledRoostr }) {
  const { traits, rarity, comboP } = roostr;
  const species = traits.species;
  const headwear = traits.headwear;
  const accessory = traits.accessory;
  const aura = traits.aura;
  const mutation = traits.mutation;

  return (
    <Box
      sx={{
        width: 300,
        border: 3,
        borderColor: rarity.color,
        borderRadius: 3,
        overflow: "hidden",
        boxShadow: 3,
        bgcolor: "background.paper",
      }}
    >
      {/* Visual: backdrop gradient + composed emoji layers */}
      <Box
        sx={{
          position: "relative",
          height: 220,
          background: traits.background.gradient,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: aura.glow
            ? `inset 0 0 60px 10px ${aura.glow}`
            : "none",
        }}
      >
        <Box
          component="span"
          sx={{
            fontSize: 110,
            lineHeight: 1,
            filter: mutation.filter,
          }}
        >
          {species.emoji}
        </Box>

        {headwear.emoji && (
          <Box
            component="span"
            sx={{
              position: "absolute",
              top: 18,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 44,
            }}
          >
            {headwear.emoji}
          </Box>
        )}

        {accessory.emoji && (
          <Box
            component="span"
            sx={{ position: "absolute", bottom: 14, right: 16, fontSize: 40 }}
          >
            {accessory.emoji}
          </Box>
        )}

        <Chip
          label={rarity.label}
          size="small"
          sx={{
            position: "absolute",
            top: 10,
            left: 10,
            bgcolor: rarity.color,
            color: "#fff",
            fontWeight: 700,
          }}
        />
      </Box>

      {/* Trait breakdown */}
      <Box sx={{ p: 2 }}>
        <Stack
          direction="row"
          alignItems="baseline"
          justifyContent="space-between"
          sx={{ mb: 1 }}
        >
          <Typography variant="h6">{species.name}</Typography>
          <Typography variant="caption" color="text.secondary">
            1 / {Math.max(1, Math.round(1 / comboP)).toLocaleString()}
          </Typography>
        </Stack>

        <Stack spacing={0.5}>
          {TRAIT_ROWS.map((layer) => {
            const t = traits[layer];
            if (t.name === "—") return null;
            return (
              <Stack
                key={layer}
                direction="row"
                justifyContent="space-between"
              >
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ textTransform: "capitalize" }}
                >
                  {layer}
                </Typography>
                <Typography variant="caption">{t.name}</Typography>
              </Stack>
            );
          })}
        </Stack>
      </Box>
    </Box>
  );
}
