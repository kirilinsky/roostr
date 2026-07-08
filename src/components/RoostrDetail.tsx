"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Stack from "@mui/material/Stack";
import RoostrHeader from "@/components/roostr-detail/RoostrHeader";
import OwnerCard from "@/components/roostr-detail/OwnerCard";
import CancelListingButton from "@/components/roostr-detail/CancelListingButton";
import IdentityCard from "@/components/roostr-detail/IdentityCard";
import CombatCard from "@/components/roostr-detail/CombatCard";
import StatusNotices from "@/components/roostr-detail/StatusNotices";
import OwnerActions from "@/components/roostr-detail/OwnerActions";
import ReturnFromWorkButton from "@/components/roostr-detail/ReturnFromWorkButton";
import DevHurtButton from "@/components/roostr-detail/DevHurtButton";
import GeneUpgradeGrid from "@/components/roostr-detail/GeneUpgradeGrid";
import SynthGeneStrip from "@/components/roostr-detail/SynthGeneStrip";
import type { GiftFriend } from "@/components/GiftRoostrButton";
import type { ProvenanceEvent } from "@/db/queries";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

// Per-rooster detail page. A thin composer over roostr-detail/* — header, the
// avatar/identity + combat/trait cards, lock notices, owner actions, and the
// gene-upgrade grid.
export default function RoostrDetail({
  roostr,
  roostrId,
  coins,
  sci = 0,
  isOwner,
  locked = false,
  friends = [],
  freedAt,
  isAdmin = false,
  owner = null,
  provenance = [],
  listingId = null,
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  coins: number;
  sci?: number;
  isOwner: boolean;
  locked?: boolean;
  friends?: GiftFriend[];
  freedAt?: number;
  isAdmin?: boolean;
  owner?: { id: number; name: string; photoUrl: string | null } | null;
  provenance?: ProvenanceEvent[];
  listingId?: string | null; // the bird's live market listing (when status "listed")
}) {
  const t = useT();
  // Sell / gift only an ACTIVE bird (market actions). Upgrading genes is allowed
  // on any ROSTER bird — active OR working (farm/lab/defense) — only market/transit
  // states lock it. Renaming is allowed at any status.
  const canManage = isOwner && !locked;
  const canUpgrade =
    isOwner && (roostr.status === "active" || roostr.status === "working");
  const canRename = isOwner;

  return (
    <Stack spacing={3}>
      <Button component={Link} href="/collection" color="neutral" sx={{ alignSelf: "flex-start" }}>
        ← {t("detail.back")}
      </Button>

      <RoostrHeader roostr={roostr} roostrId={roostrId} canRename={canRename} />

      <OwnerCard isOwner={isOwner} owner={owner} provenance={provenance} />

      {/* avatar + stats — responsive 2-column grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "minmax(0, 1fr)", md: "300px minmax(0, 1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <IdentityCard roostr={roostr} />
        <CombatCard roostr={roostr} />
      </Box>

      <StatusNotices
        roostr={roostr}
        isOwner={isOwner}
        locked={locked}
        freedAt={freedAt}
        action={
          isOwner && roostr.status === "working" ? (
            <ReturnFromWorkButton roostrId={roostrId} kind={roostr.work?.kind} />
          ) : isOwner && roostr.status === "listed" && listingId ? (
            <CancelListingButton listingId={listingId} roostrId={roostrId} />
          ) : undefined
        }
      />

      {canManage && (
        <OwnerActions roostr={roostr} roostrId={roostrId} friends={friends} />
      )}

      {isAdmin && isOwner && roostr.status === "active" && (
        <DevHurtButton roostrId={roostrId} />
      )}

      <GeneUpgradeGrid
        roostr={roostr}
        roostrId={roostrId}
        coins={coins}
        isOwner={isOwner}
        canManage={canUpgrade}
      />

      <SynthGeneStrip
        roostr={roostr}
        roostrId={roostrId}
        sci={sci}
        canUpgrade={canUpgrade}
      />
    </Stack>
  );
}
