"use client";

import Image from "next/image";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Typography from "@mui/material/Typography";
import { REWARD_IMG } from "@/components/QuestBoard";
import { claimQuestAction } from "@/app/quests/actions";
import type { QuestState } from "@/lib/quests";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { EmptyNotice } from "./shared";
import { useNotifActions } from "@/hooks/useNotifActions";

// Quests ready to claim → claim button grants the reward.
export default function QuestsList({ quests }: { quests: QuestState[] }) {
  const t = useT();
  const locale = useLocale();
  const { busy, act } = useNotifActions();
  if (quests.length === 0) return <EmptyNotice />;

  return (
    <List disablePadding>
      {quests.map((q) => (
        <ListItem key={q.def.id} divider sx={{ px: 0, gap: 1.5, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 22, lineHeight: 1 }}>{q.def.icon}</Typography>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {q.def.name[locale]}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("quests.readyNote")}
            </Typography>
          </Box>
          <Button
            size="small"
            variant="contained"
            color="secondary"
            disabled={busy}
            onClick={() => act(() => claimQuestAction(q.def.id))}
            sx={{ display: "inline-flex", alignItems: "center", gap: 0.4 }}
          >
            {t("quests.claim")} +{q.def.reward.amount}
            <Image
              src={REWARD_IMG[q.def.reward.resource]}
              alt=""
              width={16}
              height={16}
              style={{ height: 14, width: "auto" }}
            />
          </Button>
        </ListItem>
      ))}
    </List>
  );
}
