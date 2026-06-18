"use client";

import { useEffect, useRef } from "react";
import { COLOR_HEX, type ColorSet } from "@/lib/roostr";

// Raster realism — PROOF OF MECHANISM, not a full rooster.
//
// The spec's end-state (§1) is raster layer masks: detailed art per layer, tinted
// per the roostr's cosmetic colors, composited deterministically. That needs real
// grayscale/painted masks (AI-generated or curated) per silhouette — we don't have
// a full set yet.
//
// What this demos with a REAL asset: take a detailed pixel-painted layer (the
// `genes/3.png` talon = a leg layer) and recolor it to the chosen leg color via
// canvas `globalCompositeOperation = "color"` — which keeps the art's light/shadow
// (luminance) and swaps only hue/saturation. That is exactly how realistic raster
// layers would recolor. Swap in body/wing/tail/… masks and stack to get a rooster.

const ASSET = "/genes/3.png"; // detailed talon used as the "leg" layer

export interface RoostrAvatarRasterProps {
  colors: ColorSet;
  size?: number;
}

export default function RoostrAvatarRaster({ colors, size = 180 }: RoostrAvatarRasterProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const legHex = COLOR_HEX.leg[colors.leg] ?? "#e3b94e";

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.src = ASSET;
    img.onload = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      ctx.imageSmoothingEnabled = false; // keep the pixel crispness

      // 1) draw the detailed layer art
      ctx.globalCompositeOperation = "source-over";
      ctx.drawImage(img, 0, 0, w, h);

      // 2) recolor: keep luminance (shading), replace hue/sat with the leg color
      ctx.globalCompositeOperation = "color";
      ctx.fillStyle = legHex;
      ctx.fillRect(0, 0, w, h);

      // 3) clip the tint back to the art's silhouette (restore alpha)
      ctx.globalCompositeOperation = "destination-in";
      ctx.drawImage(img, 0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
    };
  }, [legHex, size]);

  // render at 2× for crispness on hi-dpi
  return (
    <canvas
      ref={ref}
      width={size * 2}
      height={size * 2}
      style={{ width: size, height: size, display: "block", imageRendering: "pixelated" }}
    />
  );
}
