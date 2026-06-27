import Box from "@mui/material/Box";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import BreedArt from "@/components/BreedArt";
import { contrastText } from "@/lib/contrast";
import { MONO_FONT } from "@/lib/tokens";

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
        sx={{ flexGrow: 1, height: 8, borderRadius: 0 }}
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
  breedId?: string; // for the art image: /breeds/<breedId>.png
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
        sx={(theme) => ({
          height: "100%",
          border: 1,
          borderColor: "divider",
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: alpha(theme.palette.background.paper, 0.84),
          display: "flex",
          flexDirection: "column",
          boxShadow: "none",
        })}
      >
        <Box
          sx={(theme) => ({
            px: 1.25,
            py: 0.75,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: 1,
            borderColor: "divider",
            bgcolor: alpha(theme.palette.action.hover, 0.72),
          })}
        >
          <Typography
            variant="caption"
            sx={{ fontFamily: MONO_FONT, color: "text.disabled", fontWeight: 800 }}
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
            position: "relative",
            fontSize: 56,
            fontWeight: 900,
            color: alpha(theme.palette.text.primary, 0.18),
            background: [
              `radial-gradient(circle at 50% 42%, ${alpha(theme.palette.text.primary, 0.08)}, transparent 42%)`,
              `linear-gradient(180deg, ${alpha(theme.palette.action.hover, 0.38)}, ${alpha(theme.palette.background.default, 0.82)})`,
            ].join(", "),
            "&::before": {
              content: '""',
              position: "absolute",
              width: "46%",
              height: "58%",
              borderRadius: "48% 48% 42% 42%",
              bgcolor: alpha(theme.palette.text.primary, 0.08),
              transform: "translateY(6%)",
            },
            "&::after": {
              content: '""',
              position: "absolute",
              width: 54,
              height: 54,
              borderRadius: "50%",
              border: "1px solid",
              borderColor: alpha(theme.palette.text.primary, 0.12),
              bgcolor: alpha(theme.palette.background.paper, 0.56),
            },
          })}
        >
          <Box component="span" sx={{ position: "relative", zIndex: 1 }}>
            ?
          </Box>
        </Box>
        <Box sx={{ p: 1.5, flexGrow: 1 }}>
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
      sx={(theme) => ({
        height: "100%",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        overflow: "hidden",
        bgcolor: "background.paper",
        display: "flex",
        flexDirection: "column",
        boxShadow: `0 4px 14px ${alpha(theme.palette.common.black, 0.05)}`,
      })}
    >
      {/* Group band, tinted by the breed group's token */}
      <Box
        sx={(theme) => {
          const c = theme.palette[ref.key][ref.variant];
          return {
            px: 1.25,
            py: 0.75,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 1,
            bgcolor: alpha(c, 0.95),
            color: contrastText(c),
          };
        }}
      >
        <Typography variant="caption" sx={{ fontFamily: MONO_FONT, fontWeight: 700 }}>
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

      {/* Breed art — /breeds/<id>.png, 🐓 fallback while assets fill in */}
      <BreedArt id={props.breedId} />

      <Box sx={{ p: 1.5, flexGrow: 1 }}>
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
