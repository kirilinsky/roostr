"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { useToast } from "@/components/ToastProvider";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { claimQuestAction } from "@/app/quests/actions";
import type { QuestState, QuestResource } from "@/lib/quests";

export const REWARD_IMG: Record<QuestResource, string> = {
  coin: "/corn-coin.png",
  sci: "/sci.png",
  egg: "/eggs.png",
  feather: "/feather.png",
};

function RewardChip({ resource, amount }: { resource: QuestResource; amount: number }) {
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.4, fontWeight: 800 }}
    >
      +{amount}
      <Image
        src={REWARD_IMG[resource]}
        alt=""
        width={16}
        height={16}
        style={{ height: 14, width: "auto" }}
      />
    </Box>
  );
}

// Onboarding quest chain for the profile. Linear: claimed → ready → active → locked.
// Claim is server-validated; on success the HUD animates the reward (V20 refresh).
export default function QuestBoard({ states }: { states: QuestState[] }) {
  const t = useT();
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [busy, start] = useTransition();

  const done = states.filter((s) => s.status === "claimed").length;
  const allDone = done === states.length;

  function claim(id: string) {
    start(async () => {
      const res = await claimQuestAction(id);
      if (res.ok) {
        toast.show({ variant: "success", message: t("quests.claimedToast") });
        router.refresh();
      } else {
        toast.show({ variant: "error", message: t("quests.claimError") });
      }
    });
  }

  return (
    <Stack spacing={1.25}>
      <Typography variant="caption" color="text.secondary">
        {t("quests.progress", { done: String(done), total: String(states.length) })}
      </Typography>

      {allDone && (
        <Typography variant="body2" color="text.secondary">
          🎉 {t("quests.allDone")}
        </Typography>
      )}

      {states.map((s) => {
        const { def, status, current, target, progress } = s;
        const claimed = status === "claimed";
        const locked = status === "locked";
        const ready = status === "ready";
        return (
          <Box
            key={def.id}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.25,
              p: 1,
              borderRadius: 0,
              border: 1,
              borderColor: ready ? "secondary.main" : "divider",
              opacity: claimed || locked ? 0.55 : 1,
            }}
          >
            <Typography sx={{ fontSize: 22, lineHeight: 1 }}>
              {claimed ? "✅" : locked ? "🔒" : def.icon}
            </Typography>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="body2"
                sx={{ fontWeight: 700, textDecoration: claimed ? "line-through" : "none" }}
                noWrap
              >
                {def.name[locale]}
              </Typography>
              {ready || status === "active" ? (
                <>
                  <Typography variant="caption" color="text.secondary" component="div">
                    {def.desc[locale]}
                  </Typography>
                  {status === "active" && (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                      <LinearProgress
                        variant="determinate"
                        value={progress * 100}
                        sx={{ flex: 1, height: 6, borderRadius: 0 }}
                      />
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {current}/{target}
                      </Typography>
                    </Stack>
                  )}
                </>
              ) : null}
            </Box>

            {/* Action / reward */}
            <Box sx={{ flexShrink: 0 }}>
              {claimed ? (
                <RewardChip resource={def.reward.resource} amount={def.reward.amount} />
              ) : ready ? (
                <Button
                  size="small"
                  variant="contained"
                  color="secondary"
                  disabled={busy}
                  onClick={() => claim(def.id)}
                >
                  {t("quests.claim")}&nbsp;
                  <RewardChip resource={def.reward.resource} amount={def.reward.amount} />
                </Button>
              ) : status === "active" && def.href ? (
                <Button
                  component={Link}
                  href={def.href}
                  size="small"
                  variant="outlined"
                >
                  {t("quests.go")}
                </Button>
              ) : (
                <RewardChip resource={def.reward.resource} amount={def.reward.amount} />
              )}
            </Box>
          </Box>
        );
      })}
    </Stack>
  );
}
