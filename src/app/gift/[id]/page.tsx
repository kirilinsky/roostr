import { notFound, redirect } from "next/navigation";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import RoostrDetail from "@/components/RoostrDetail";
import GiftActions from "@/components/GiftActions";
import { getSession } from "@/lib/auth";
import {
  getRoostr,
  getPendingGiftForRoostr,
  getUserById,
  GIFT_TAX,
} from "@/db/queries";
import { hydrateRoostr } from "@/lib/roostr";
import { getTranslations } from "@/i18n/server";

// Gift acceptance page, routed by the bird's id. Shows the SAME read-only rooster
// detail (no manage controls — RoostrDetail renders none when isOwner=false) plus
// accept / decline. Only the pending gift's recipient may view it.
export default async function GiftPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getSession();
  if (!session) redirect("/");

  const gift = await getPendingGiftForRoostr(id);
  // No pending gift, or it isn't addressed to me → nothing to decide here.
  if (!gift || gift.toUserId !== session.id) notFound();

  const row = await getRoostr(id);
  if (!row) notFound();

  const { t } = await getTranslations();
  const sender = await getUserById(gift.fromUserId);
  const senderName =
    [sender?.firstName, sender?.lastName].filter(Boolean).join(" ") ||
    (sender?.username ? `@${sender.username}` : String(gift.fromUserId));
  const coins = (await getUserById(session.id))?.coins ?? 0;
  const roostr = hydrateRoostr(row);

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "secondary.main" }}>
          <Typography variant="body1" sx={{ fontWeight: 700 }}>
            🎁 {t("gift.sentYou", { name: senderName })}
          </Typography>
        </Card>

        <GiftActions roostrId={id} tax={GIFT_TAX} coins={coins} />

        <RoostrDetail
          roostr={roostr}
          roostrId={id}
          coins={0}
          isOwner={false}
          locked
        />
      </Stack>
    </Container>
  );
}
