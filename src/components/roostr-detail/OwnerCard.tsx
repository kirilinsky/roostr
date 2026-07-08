"use client";

import { useState } from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import UserAvatar from "@/components/UserAvatar";
import OwnershipHistoryModal from "@/components/roostr-detail/OwnershipHistoryModal";
import type { ProvenanceEvent } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";

// The OWNER block on the detail page: who holds this bird right now (me / another
// player with a profile link / the wild), how long they've held it, and a button
// into the full ownership-history timeline. A proper card, not a header chip —
// ownership is first-class provenance for a collectible.
export default function OwnerCard({
  isOwner,
  owner,
  provenance,
}: {
  isOwner: boolean;
  // Current owner; null while the bird roams free (status "released").
  owner: { id: number; name: string; photoUrl: string | null } | null;
  provenance: ProvenanceEvent[];
}) {
  const t = useT();
  const locale = useLocale();
  const [historyOpen, setHistoryOpen] = useState(false);

  // "Owned since" = the last time this holder took the bird (the final transfer's
  // date), so the block reads "since <date>" for the current owner.
  const sinceISO = provenance.length ? provenance[provenance.length - 1].at : null;
  const since = sinceISO ? new Date(sinceISO).toLocaleDateString(locale) : null;

  const wild = owner === null;

  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Stack
        direction="row"
        spacing={1.5}
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        useFlexGap
      >
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
          {wild ? (
            <Box
              sx={{
                width: 48,
                height: 48,
                flexShrink: 0,
                border: 2,
                borderColor: "neutral.main",
                borderStyle: "dashed",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
              }}
            >
              🕊️
            </Box>
          ) : (
            <UserAvatar
              component={Link}
              href={`/${owner.id}`}
              photoUrl={owner.photoUrl}
              name={owner.name}
              variant="square"
              sx={{ width: 48, height: 48, flexShrink: 0, border: 2, borderColor: "neutral.main" }}
            />
          )}

          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.2 }}>
              {t("detail.owner")}
            </Typography>
            <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
              {wild ? (
                <Typography variant="subtitle1" sx={{ fontWeight: 800 }} noWrap>
                  🕊️ {t("detail.ownerWild")}
                </Typography>
              ) : (
                <Typography
                  component={Link}
                  href={`/${owner.id}`}
                  variant="subtitle1"
                  noWrap
                  sx={{
                    fontWeight: 800,
                    color: "text.primary",
                    textDecoration: "none",
                    "&:hover": { textDecoration: "underline" },
                  }}
                >
                  {owner.name}
                </Typography>
              )}
              {isOwner && !wild && (
                <Chip label={t("detail.ownerMe")} size="small" color="secondary" sx={{ fontWeight: 800 }} />
              )}
            </Stack>
            {since && !wild && (
              <Typography variant="caption" color="text.secondary">
                {t("detail.ownerSince", { date: since })}
              </Typography>
            )}
          </Box>
        </Stack>

        {provenance.length > 0 && (
          <Button
            variant="outlined"
            color="neutral"
            size="small"
            onClick={() => setHistoryOpen(true)}
            sx={{ flexShrink: 0 }}
          >
            📜 {t("detail.history")}
          </Button>
        )}
      </Stack>

      <OwnershipHistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        events={provenance}
      />
    </Card>
  );
}
