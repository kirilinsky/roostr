"use client";

import { useState } from "react";
import Box from "@mui/material/Box";
import { FAMILY_COLOR, type GeneFamily } from "@/lib/roostr";

// Gene icon = public/genes/<no>.png (filename matches the gene's sequential no).
// Falls back to a family-colored dot if the icon is missing.
export default function GeneIcon({
  no,
  family,
  size = 32,
}: {
  no: number;
  family: GeneFamily;
  size?: number;
}) {
  const [ok, setOk] = useState(true);
  const color = FAMILY_COLOR[family];

  if (!ok) {
    return (
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: 1,
          bgcolor: color,
          flexShrink: 0,
        }}
      />
    );
  }

  return (
    <Box
      component="img"
      src={`/genes/${no}.png`}
      alt=""
      onError={() => setOk(false)}
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: 1,
        objectFit: "contain",
        border: 2,
        borderColor: color,
        bgcolor: "background.paper",
      }}
    />
  );
}
