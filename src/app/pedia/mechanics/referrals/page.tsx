import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import ShareProfileButton from "@/components/ShareProfileButton";
import { getTranslations } from "@/i18n/server";
import { getSession } from "@/lib/auth";

function Section({ title, body }: { title: string; body: string }) {
  return (
    <Card sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Card>
  );
}

// Mechanics article: referrals — how to invite + what both sides earn. Ends with
// the player's own invite link (when logged in) to make sharing one tap away.
export default async function PediaReferralsPage() {
  const { t } = await getTranslations();
  const session = await getSession();

  return (
    <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 } }}>
      <Stack spacing={2.5}>
        <Button
          component={Link}
          href="/pedia/mechanics"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("pedia.mechanics.title")}
        </Button>

        <Box>
          <Typography variant="h4" component="h1">
            🎁 {t("pedia.mech.referrals.title")}
          </Typography>
          <Typography color="text.secondary">
            {t("pedia.mech.referrals.desc")}
          </Typography>
        </Box>

        <Section
          title={t("pedia.mech.referrals.whatTitle")}
          body={t("pedia.mech.referrals.what")}
        />
        <Section
          title={t("pedia.mech.referrals.howTitle")}
          body={t("pedia.mech.referrals.how")}
        />
        <Section
          title={t("pedia.mech.referrals.youTitle")}
          body={t("pedia.mech.referrals.you")}
        />
        <Section
          title={t("pedia.mech.referrals.themTitle")}
          body={t("pedia.mech.referrals.them")}
        />

        {session && (
          <Card
            sx={{
              p: 2,
              borderColor: "secondary.main",
              borderWidth: 1,
              borderStyle: "solid",
            }}
          >
            <CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
              <Stack spacing={1.5}>
                <Typography variant="h6">
                  {t("pedia.mech.referrals.cta")}
                </Typography>
                <ShareProfileButton
                  telegramId={session.id}
                  label={t("friends.share")}
                  copiedLabel={t("friends.copied")}
                />
              </Stack>
            </CardContent>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
