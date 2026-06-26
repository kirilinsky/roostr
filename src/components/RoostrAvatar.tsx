"use client";

import AvatarV2 from "@/components/AvatarV2";
import type { AvatarTraits } from "@/lib/avatarV2";

// Prod rooster avatar = the V2 layered renderer driven by the bird's cosmetic
// (breed features + its baked colorway). Hybrid: STATIC in grids/cards
// (animate=false), ANIMATED on the detail hero (animate). One place to swap the
// whole app's avatar back to RoostrAvatarPixel if needed.
export default function RoostrAvatar({
  traits,
  size,
  animate = false,
  fill = false,
}: {
  traits: AvatarTraits;
  size?: number;
  animate?: boolean;
  fill?: boolean;
}) {
  return <AvatarV2 traits={traits} size={size} animate={animate} fill={fill} />;
}
