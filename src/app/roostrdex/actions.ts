"use server";

import { getSession } from "@/lib/auth";
import {
  getDiscoveredBreeds,
  grantDexRewards,
  type DexRewardGrant,
} from "@/db/queries";

// The signed-in user's discovered breed ids (persistent dex source of truth, from
// the breedDiscoveries table). Empty for guests. Server-derived → can't be spoofed.
export async function myDiscoveredBreeds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];
  return getDiscoveredBreeds(session.id);
}

// Grant any newly-completed dex rewards (group / full). Returns the new grants so
// the client can toast them. Server-validated + claim-once.
export async function claimDexRewardsAction(): Promise<DexRewardGrant[]> {
  const session = await getSession();
  if (!session) return [];
  return grantDexRewards(session.id);
}
