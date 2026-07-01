"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { admitToHospital, dischargeFromHospital, buyHospitalSlot } from "@/db/queries";

export type HospitalResult = {
  ok: boolean;
  error?: "auth" | "owner" | "locked" | "healthy" | "full" | "db";
};

// Admit a hurt bird to the hospital (owner-guarded, active + hurt + free bed).
export async function admitToHospitalAction(
  roostrId: string,
): Promise<HospitalResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await admitToHospital(roostrId, session.id);
  if (res.ok) {
    revalidatePath("/hospital");
    revalidatePath(`/collection/${roostrId}`);
    revalidatePath("/collection");
  }
  return res;
}

// Discharge a bird from the hospital (settles healed HP, unlocks to active).
export async function dischargeFromHospitalAction(
  roostrId: string,
): Promise<{ ok: boolean }> {
  const session = await getSession();
  if (!session) return { ok: false };
  const ok = await dischargeFromHospital(roostrId, session.id);
  if (ok) {
    revalidatePath("/hospital");
    revalidatePath(`/collection/${roostrId}`);
    revalidatePath("/collection");
  }
  return { ok };
}

// Buy the next hospital bed with coins (server-priced).
export async function buyHospitalSlotAction(): Promise<{
  ok: boolean;
  error?: "auth" | "max" | "coins" | "db";
}> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };
  const res = await buyHospitalSlot(session.id);
  if (res.ok) revalidatePath("/hospital");
  return res;
}
