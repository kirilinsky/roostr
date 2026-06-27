"use client";

import { useState } from "react";
import Box from "@mui/material/Box";

// Per-achievement art = public/achievements/<id>.png (filename matches the stable
// achievement id). Falls back to the emoji while the art doesn't exist yet.
// Locked achievements render greyscale.
export default function AchievementIcon({
  id,
  icon,
  size = 32,
  unlocked = true,
}: {
  id: string;
  icon: string; // emoji fallback
  size?: number;
  unlocked?: boolean;
}) {
  const [ok, setOk] = useState(true);
  const filter = unlocked ? "none" : "grayscale(1)";

  if (ok) {
    return (
      <Box
        component="img"
        src={`/achievements/${id}.png`}
        alt=""
        loading="lazy"
        decoding="async"
        onError={() => setOk(false)}
        sx={{ width: size, height: size, objectFit: "contain", flexShrink: 0, filter }}
      />
    );
  }
  return (
    <Box
      component="span"
      sx={{ fontSize: size, lineHeight: 1, flexShrink: 0, filter }}
    >
      {icon}
    </Box>
  );
}
