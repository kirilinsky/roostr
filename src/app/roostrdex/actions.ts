"use server";

import { getSession } from "@/lib/auth";
import { getDiscoveredBreeds } from "@/db/queries";

// The signed-in user's discovered breed ids (persistent dex source of truth, from
// the breedDiscoveries table). Empty for guests. Server-derived → can't be spoofed.
export async function myDiscoveredBreeds(): Promise<string[]> {
  const session = await getSession();
  if (!session) return [];
  return getDiscoveredBreeds(session.id);
}
