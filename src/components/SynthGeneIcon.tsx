"use client";

import { useState } from "react";
import Box from "@mui/material/Box";

// Synthetic-gene icon = public/genes/synth/<no>.png (separate folder from rolled
// genes so the `no` ranges don't collide). No art yet → falls back to a neon
// cyber tile (🧬) in the secondary/cyberpunk color.
export default function SynthGeneIcon({
  no,
  size = 32,
}: {
  no: number;
  size?: number;
}) {
  const [ok, setOk] = useState(true);

  if (!ok) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: 0,
          border: 2,
          borderColor: "secondary.main",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.5,
          bgcolor: "background.paper",
          color: "secondary.main",
        }}
      >
        🧬
      </Box>
    );
  }

  return (
    <Box
      component="img"
      src={`/genes/synth/${no}.png`}
      alt=""
      onError={() => setOk(false)}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 0,
        objectFit: "contain",
        border: 2,
        borderColor: "secondary.main",
        bgcolor: "background.paper",
      }}
    />
  );
}
