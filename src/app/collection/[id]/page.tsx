import { notFound } from "next/navigation";
import Container from "@mui/material/Container";
import RoostrDetail from "@/components/RoostrDetail";
import { getSession } from "@/lib/auth";
import { getRoostr, getUserById } from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";

// Per-rooster detail, routed by the roostr's DB id (uuid). Server component:
// fetch the row, rehydrate, resolve ownership (only the owner sees working
// upgrade buttons) and the owner's coin balance for affordability display.
export default async function RoostrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const row = await getRoostr(id);
  if (!row) notFound();

  const session = await getSession();
  const isOwner = !!session && session.id === row.ownerId;
  const coins = isOwner ? (await getUserById(session.id))?.coins ?? 0 : 0;

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <RoostrDetail
        roostr={hydrateRoostr(row)}
        roostrId={id}
        coins={coins}
        isOwner={isOwner}
        locked={row.status !== "active"}
      />
    </Container>
  );
}
