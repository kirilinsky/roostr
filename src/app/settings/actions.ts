"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { setCollectionPublic } from "@/db/queries";

// Toggle whether other users can see the signed-in player's collection. Returns
// the persisted value (or null on failure). Session-scoped — a user can only
// change their own flag.
export async function setCollectionPublicAction(
  value: boolean,
): Promise<{ ok: boolean; value?: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const saved = await setCollectionPublic(session.id, value);
  if (saved === null) return { ok: false };
  revalidatePath("/settings");
  return { ok: true, value: saved };
}
