"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/auth";
import { SYNTH_GENE_BY_ID, canApplySynthGene } from "@/lib/roostr";
import { synthGenePrice } from "@/lib/shop";
import {
  getRoostr,
  applySynthGene,
  recordSynthGeneEvent,
  spendResource,
  grantResource,
} from "@/db/queries";

export type BuySynthGeneResult =
  | { ok: true; sci: number }
  | {
      ok: false;
      error:
        | "auth"
        | "gene" // unknown synth gene id
        | "notfound" // no such bird
        | "owner" // not the caller's bird
        | "locked" // bird not active (working / listed / gifting …)
        | "slots" // no free slot or already has this gene
        | "sci" // not enough science
        | "save"; // splice write failed (science refunded)
    };

// Buy ONE synth gene and splice it into the chosen bird. Price is computed +
// charged server-side; eligibility (owner, active, free slot, not already carried)
// is re-checked here AND atomically in applySynthGene (the CAS), so a stale client
// can't overfill or double-add. Science is refunded if the splice write loses.
export async function buySynthGeneAction(
  geneId: string,
  roostrId: string,
): Promise<BuySynthGeneResult> {
  const session = await getSession();
  if (!session) return { ok: false, error: "auth" };

  if (!SYNTH_GENE_BY_ID[geneId]) return { ok: false, error: "gene" };

  const row = await getRoostr(roostrId);
  if (!row) return { ok: false, error: "notfound" };
  if (row.ownerId !== session.id) return { ok: false, error: "owner" };
  // Roster birds (active or working) can be spliced; gifting/listed/sold are locked.
  if (row.status !== "active" && row.status !== "working") {
    return { ok: false, error: "locked" };
  }
  if (!canApplySynthGene(row.synthGeneIds ?? [], geneId)) {
    return { ok: false, error: "slots" };
  }

  const price = synthGenePrice();
  const sci = await spendResource(session.id, "sci", price, "synth_gene", geneId);
  if (sci === null) return { ok: false, error: "sci" };

  const applied = await applySynthGene(roostrId, session.id, geneId);
  if (!applied) {
    await grantResource(session.id, "sci", price, "refund", "synth_gene");
    return { ok: false, error: "save" };
  }

  // Log the splice → "gene applied" notification (Lab tab). Best-effort.
  await recordSynthGeneEvent(session.id, roostrId, geneId);

  revalidatePath("/shop/synth-genes");
  revalidatePath(`/collection/${roostrId}`);
  revalidatePath("/collection");
  revalidatePath("/notifications");
  return { ok: true, sci };
}
