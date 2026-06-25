// Roostrdex completion reward formula — pure (no DB), shared by the server granter
// (db/queries.ts) and the dex UI preview so the player SEES what they'll earn.

export type DexRewardResource = "coin" | "egg";

export const DEX_GROUP_COIN_PER_BREED = 30; // group reward = group size × this (coins)
export const DEX_FULL_EGGS = 5; // whole-dex reward (eggs)

// Reward for fully discovering a group of `size` breeds.
export function groupReward(size: number): {
  resource: DexRewardResource;
  amount: number;
} {
  return { resource: "coin", amount: size * DEX_GROUP_COIN_PER_BREED };
}

// Reward for completing the entire Roostrdex.
export const FULL_DEX_REWARD: { resource: DexRewardResource; amount: number } = {
  resource: "egg",
  amount: DEX_FULL_EGGS,
};

// Resource → HUD icon art (V20: images, not emoji).
export const DEX_REWARD_ICON: Record<DexRewardResource, string> = {
  coin: "/corn-coin.png",
  egg: "/eggs.png",
};
