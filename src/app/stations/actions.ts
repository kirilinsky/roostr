"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import {
  assignWorker,
  removeWorker,
  claimStation,
  type StationOpResult,
} from "@/db/queries";
import type { StationKind } from "@/lib/stations";

// Shared server actions for any work station (lab / farm / future). Session-scoped
// — a user only mutates their own station.
const PATH: Record<StationKind, string> = { lab: "/lab", farm: "/farm" };

export async function assignWorkerAction(
  kind: StationKind,
  roostrId: string,
): Promise<StationOpResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "owner" };
  const res = await assignWorker(session.id, kind, roostrId);
  if (res.ok) revalidatePath(PATH[kind]);
  return res;
}

export async function removeWorkerAction(
  kind: StationKind,
  roostrId: string,
): Promise<StationOpResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "owner" };
  const res = await removeWorker(session.id, kind, roostrId);
  if (res.ok) revalidatePath(PATH[kind]);
  return res;
}

export async function claimStationAction(
  kind: StationKind,
): Promise<StationOpResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "owner" };
  const res = await claimStation(session.id, kind);
  if (res.ok) revalidatePath(PATH[kind]);
  return res;
}
