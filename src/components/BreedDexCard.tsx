import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

// Each breed group maps to a design-system palette token (no ad-hoc colors).
type PaletteRef = {
  key: "primary" | "secondary" | "tertiary" | "neutral";
  variant: "main" | "dark";
};

const GROUP_PALETTE: Record<string, PaletteRef> = {
  "Show Birds": { key: "primary", variant: "main" },
  "Farm Workers": { key: "tertiary", variant: "main" },
  Fighters: { key: "secondary", variant: "main" },
  "Heavy Giants": { key: "neutral", variant: "main" },
  "Longtail Legends": { key: "secondary", variant: "dark" },
  Oddities: { key: "primary", variant: "dark" },
};

const DEFAULT_REF: PaletteRef = { key: "neutral", variant: "main" };

function StatBar({
  label,
  value,
  color,
  valueLabel,
}: {
  label: string;
  value: number;
  color: "primary" | "secondary" | "success";
  valueLabel?: string;
}) {
  return (
    <Stack direction="row" spacing={1} alignItems="center">
      <Typography variant="caption" color="text.secondary" sx={{ width: 28 }}>
        {label}
      </Typography>
      <LinearProgress
        variant="determinate"
        value={value}
        color={color}
        sx={{ flexGrow: 1, height: 8, borderRadius: 1 }}
      />
      {valueLabel !== undefined && (
        <Typography
          variant="caption"
          sx={{ width: 24, textAlign: "right", fontVariantNumeric: "tabular-nums" }}
        >
          {valueLabel}
        </Typography>
      )}
    </Stack>
  );
}

export interface BreedDexCardProps {
  dexNo: number;
  discovered: boolean;
  // Present only when discovered:
  name?: string;
  group?: string; // canonical id (palette lookup)
  groupLabel?: string; // localized display name
  atk?: number;
  def?: number;
  health?: number; // breed base HP (raw)
  healthMax?: number; // catalog max, for bar normalization
  traitName?: string; // innate buff/debuff
  traitEffects?: string; // "+10% Crit · -8% Recovery"
  // Locked-state labels:
  lockedLabel: string;
  unknownLabel: string;
}

export default function BreedDexCard(props: BreedDexCardProps) {
  const { dexNo, discovered, lockedLabel, unknownLabel } = props;
  const dexId = `#${String(dexNo).padStart(3, "0")}`;

  if (!discovered) {
    return (
      <Box
        sx={{
          border: 2,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
          bgcolor: "background.paper",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            px: 1,
            py: 0.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: "action.hover",
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontFamily: "monospace", color: "text.disabled" }}
          >
            #???
          </Typography>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, letterSpacing: 1, color: "text.disabled" }}
          >
            {lockedLabel}
          </Typography>
        </Box>
        <Box
          sx={(theme) => ({
            aspectRatio: "1 / 1",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 64,
            fontWeight: 900,
            color: "text.disabled",
            backgroundImage: `repeating-linear-gradient(45deg, ${theme.palette.divider} 0 10px, transparent 10px 20px)`,
          })}
        >
          ?
        </Box>
        <Box sx={{ p: 1.5 }}>
          <Typography sx={{ fontWeight: 800, color: "text.disabled" }} noWrap>
            {unknownLabel}
          </Typography>
        </Box>
      </Box>
    );
  }

  const ref = GROUP_PALETTE[props.group ?? ""] ?? DEFAULT_REF;

  return (
    <Box
      sx={{
        border: 2,
        borderColor: "neutral.main",
        borderRadius: 2,
        overflow: "hidden",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Group band, tinted by the breed group's token */}
      <Box
        sx={(theme) => {
          const c = theme.palette[ref.key][ref.variant];
          return {
            px: 1,
            py: 0.5,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            bgcolor: c,
            color: theme.palette.getContrastText(c),
          };
        }}
      >
        <Typography variant="caption" sx={{ fontFamily: "monospace", fontWeight: 700 }}>
          {dexId}
        </Typography>
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}
          noWrap
        >
          {props.groupLabel ?? props.group}
        </Typography>
      </Box>

      {/* Art placeholder (no assets yet) */}
      <Box
        sx={{
          aspectRatio: "1 / 1",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 72,
          bgcolor: "background.default",
        }}
      >
        🐓
      </Box>

      <Box sx={{ p: 1.5 }}>
        <Typography sx={{ fontWeight: 800, mb: 0.75 }} noWrap>
          {props.name}
        </Typography>
        <Stack spacing={0.5}>
          <StatBar
            label="HP"
            value={
              props.healthMax
                ? ((props.health ?? 0) / props.healthMax) * 100
                : 0
            }
            color="success"
            valueLabel={String(props.health ?? 0)}
          />
          <StatBar label="ATK" value={props.atk ?? 0} color="secondary" />
          <StatBar label="DEF" value={props.def ?? 0} color="primary" />
        </Stack>

        {props.traitName && (
          <Box sx={{ mt: 1, pt: 1, borderTop: 1, borderColor: "divider" }}>
            <Typography variant="caption" sx={{ fontWeight: 700, display: "block" }}>
              {props.traitName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {props.traitEffects}
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
}
