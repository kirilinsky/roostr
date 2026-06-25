// Onboarding quests — a LINEAR chain that teaches mechanics and pays out, to beat
// the post-signup plateau. Definitions live in src/data/QUESTS.json; completion is
// derived from profile metrics (same engine as achievements), the reward is claimed
// MANUALLY (granted once via the ledger). Quest N unlocks only when N-1 is claimed.

import questsData from "@/data/QUESTS.json";

export type QuestResource = "coin" | "sci" | "egg" | "feather";

export interface QuestDef {
  id: string;
  order: number;
  icon: string;
  name: { en: string; ru: string };
  desc: { en: string; ru: string };
  metric: string; // a key from getProfileMetrics
  value: number; // threshold to complete
  reward: { resource: QuestResource; amount: number };
  href?: string; // where to go to make progress (teaches the mechanic)
}

export const QUESTS: QuestDef[] = [...(questsData as QuestDef[])].sort(
  (a, b) => a.order - b.order,
);

export const QUEST_BY_ID: Record<string, QuestDef> = Object.fromEntries(
  QUESTS.map((q) => [q.id, q]),
);

export type QuestStatus = "claimed" | "ready" | "active" | "locked";

export interface QuestState {
  def: QuestDef;
  current: number;
  target: number;
  progress: number; // 0..1
  status: QuestStatus;
}

// Resolve every quest's state from the player's metrics + the set of claimed ids.
// Linear unlock: a quest is reachable only once the previous one is CLAIMED.
export function evaluateQuests(
  metrics: Record<string, number>,
  claimed: Set<string>,
): QuestState[] {
  const out: QuestState[] = [];
  let prevClaimed = true; // the first quest is always unlocked
  for (const def of QUESTS) {
    const current = metrics[def.metric] ?? 0;
    const isClaimed = claimed.has(def.id);
    const met = current >= def.value;
    const unlocked = prevClaimed;
    const status: QuestStatus = isClaimed
      ? "claimed"
      : !unlocked
        ? "locked"
        : met
          ? "ready"
          : "active";
    out.push({
      def,
      current,
      target: def.value,
      progress: def.value > 0 ? Math.min(1, current / def.value) : 1,
      status,
    });
    prevClaimed = isClaimed;
  }
  return out;
}

// Quests whose reward can be claimed right now (unlocked + met + unclaimed).
export function readyQuests(states: QuestState[]): QuestState[] {
  return states.filter((s) => s.status === "ready");
}
