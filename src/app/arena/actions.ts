"use server";

import { getSession } from "@/lib/auth";
import { getRandomEnemyRoostr } from "@/db/queries";
import { hydrateRoostr, type HydratedRoostr } from "@/lib/roostr";

export type PveEnemy = { roostr: HydratedRoostr; ownerName: string };

// Debug PvE matchmaking: pick ONE random enemy bird (not the caller's) and return
// it hydrated for display. No battle resolution yet — just the matchup.
export async function findPveEnemyAction(): Promise<PveEnemy | null> {
  const session = await getSession();
  if (!session) return null;
  const enemy = await getRandomEnemyRoostr(session.id);
  if (!enemy) return null;
  return { roostr: hydrateRoostr(enemy.row), ownerName: enemy.ownerName };
}
