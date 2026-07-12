import Image from "next/image";

// One inline icon for every game resource — the SAME art the HUD uses, so amounts
// read identically everywhere (no more 🌽-emoji-vs-coin-png drift). Renders as an
// inline image sized to sit on the text baseline; pick the resource by `kind`.
export type ResourceIconKind =
  | "coin"
  | "sci"
  | "egg"
  | "feather"
  | "defense"
  | "potion"
  | "rarity";

const ART: Record<ResourceIconKind, { src: string; w: number; h: number }> = {
  coin: { src: "/corn-coin.png", w: 18, h: 17 },
  sci: { src: "/sci.png", w: 18, h: 18 },
  egg: { src: "/eggs.png", w: 18, h: 18 },
  feather: { src: "/feather.png", w: 18, h: 18 },
  defense: { src: "/defense.png", w: 18, h: 18 },
  potion: { src: "/potion.png", w: 18, h: 18 },
  rarity: { src: "/rarity.png", w: 18, h: 18 },
};

export default function ResourceIcon({
  kind,
  size = 14,
}: {
  kind: ResourceIconKind;
  size?: number; // rendered height in px (width scales to keep the aspect)
}) {
  const a = ART[kind];
  return (
    <Image
      src={a.src}
      alt=""
      width={a.w}
      height={a.h}
      style={{
        height: size,
        width: "auto",
        display: "inline-block",
        verticalAlign: "-0.125em",
      }}
    />
  );
}
