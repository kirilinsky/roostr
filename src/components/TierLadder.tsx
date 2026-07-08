import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { contrastText } from "@/lib/contrast";
import { TIERS, tierFor } from "@/lib/roostr";

// Shared tier-ladder readout: a horizontal rating scale segmented by tier color,
// plus the ladder rows (top tier first) with each tier's point range. With a
// `rating`, a marker sits on the scale and the bird's row is highlighted (the
// detail-page modal); without one it's the neutral reference (Roostrpedia).
// Pure presentational — usable from server and client components alike.

// Scale headroom past the top tier's threshold so the X segment has width and a
// maxed bird's marker doesn't sit on the edge.
const SCALE_MAX = Math.round(TIERS[TIERS.length - 1].min * 1.2);

export default function TierLadder({
  rating,
  caption,
}: {
  rating?: number;
  caption?: string;
}) {
  const tier = rating != null ? tierFor(rating) : null;
  const markerPct = rating != null ? Math.min(100, (rating / SCALE_MAX) * 100) : null;

  return (
    <Stack spacing={2.5}>
      {/* the scale — one colored segment per tier, marker at the bird's rating */}
      <Box sx={{ px: 0.5 }}>
        <Box sx={{ position: "relative", pt: rating != null ? 2.5 : 0, pb: 0.5 }}>
          {markerPct != null && (
            <Box
              sx={{
                position: "absolute",
                top: 0,
                left: `${markerPct}%`,
                transform: "translateX(-50%)",
                textAlign: "center",
                zIndex: 1,
              }}
            >
              <Typography
                variant="caption"
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums", lineHeight: 1 }}
              >
                {rating}
              </Typography>
              <Typography sx={{ lineHeight: 0.6, fontSize: 12 }}>▼</Typography>
            </Box>
          )}
          <Stack direction="row" sx={{ height: 14, border: 2, borderColor: "neutral.main" }}>
            {TIERS.map((tr, i) => {
              const next = TIERS[i + 1];
              const span = (next ? next.min : SCALE_MAX) - tr.min;
              return (
                <Box
                  key={tr.id}
                  title={`${tr.id} · ${tr.min}+`}
                  sx={{ width: `${(span / SCALE_MAX) * 100}%`, bgcolor: tr.color }}
                />
              );
            })}
          </Stack>
        </Box>
        {caption && (
          <Typography variant="caption" color="text.secondary">
            {caption}
          </Typography>
        )}
      </Box>

      {/* ladder rows, top tier first; the bird's row (when rating given) is highlighted */}
      <Stack spacing={0.5}>
        {[...TIERS].reverse().map((tr, i) => {
          const next = [...TIERS].reverse()[i - 1]; // tier above in the ladder
          const range = next ? `${tr.min}–${next.min - 1}` : `${tr.min}+`;
          const current = tr.id === tier?.id;
          return (
            <Stack
              key={tr.id}
              direction="row"
              alignItems="center"
              spacing={1.5}
              sx={{
                p: 0.75,
                pl: 1,
                borderLeft: 4,
                borderColor: current ? tr.color : "transparent",
                bgcolor: current ? "action.hover" : "transparent",
              }}
            >
              <Chip
                label={`★ ${tr.id}`}
                size="small"
                sx={{
                  fontWeight: 800,
                  bgcolor: tr.color,
                  color: contrastText(tr.color),
                  minWidth: 52,
                }}
              />
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums", flexGrow: 1 }}
              >
                {range}
              </Typography>
              {current && (
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
                >
                  ◀ {rating}
                </Typography>
              )}
            </Stack>
          );
        })}
      </Stack>
    </Stack>
  );
}
