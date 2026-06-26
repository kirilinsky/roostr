// System shop pricing (coin sinks). Kept pure + shared by the server action and
// the UI so the displayed price always matches what the server charges.

// Egg shop: convert piled-up coins into growth (eggs → hatches). The price RISES
// with each egg the player has ever bought, so the first few are an attractive
// sink for quest coins, but it ramps to keep the farm / referrals relevant (eggs
// never become free). Escalation is per-user lifetime, derived from the ledger.
export const EGG_SHOP_BASE = 75; // ≈ one early quest's coin reward = one egg
export const EGG_SHOP_GROWTH = 1.35;

// Price of the player's NEXT egg given how many they've already bought.
export function eggShopPrice(bought: number): number {
  return Math.round(EGG_SHOP_BASE * EGG_SHOP_GROWTH ** Math.max(0, bought));
}
