"use client";

import { useState } from "react";
import Box from "@mui/material/Box";

// Breed art for the Roostrdex: shows /breeds/<id>.png, falling back to a 🐓
// placeholder when the file isn't there yet (art is being added gradually).
export default function BreedArt({
  id,
  smooth = false,
}: {
  id?: string;
  smooth?: boolean;
}) {
  const [errored, setErrored] = useState(false);
  const showImg = Boolean(id) && !errored;

  return (
    <Box
      sx={{
        aspectRatio: "1 / 1",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 72,
        bgcolor: "background.default",
        overflow: "hidden",
      }}
    >
      {showImg ? (
        <Box
          component="img"
          src={`/breeds/${id}.png`}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setErrored(true)}
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            imageRendering: smooth ? "auto" : "pixelated",
          }}
        />
      ) : (
        "🐓"
      )}
    </Box>
  );
}
