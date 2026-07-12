import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Link from "@mui/material/Link";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { getTranslations } from "@/i18n/server";

// Support: for now, one contact card — feature ideas and bug reports go straight
// to the maintainer (Telegram or email).
export default async function SupportPage() {
  const { t } = await getTranslations();
  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={3} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          {t("nav.support")}
        </Typography>

        <Card sx={{ p: { xs: 2, md: 3 }, width: "100%" }}>
          <Stack spacing={1.5} alignItems="center">
            <Typography sx={{ fontSize: 40, lineHeight: 1 }}>💬</Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {t("support.contactTitle")}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t("support.contactText")}
            </Typography>
            <Stack spacing={0.5} alignItems="center">
              <Link
                href="https://t.me/cyrilinsky"
                target="_blank"
                rel="noopener noreferrer"
                sx={{ fontWeight: 700 }}
              >
                ✈️ @cyrilinsky
              </Link>
              <Link href="mailto:kirill.ilinsky@gmail.com" sx={{ fontWeight: 700 }}>
                ✉️ kirill.ilinsky@gmail.com
              </Link>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
