import Link from "next/link";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { getSession } from "@/lib/auth";
import { getTranslations } from "@/i18n/server";

export default async function HomePage() {
  const user = await getSession();
  const { t } = await getTranslations();
  const fullName = user
    ? [user.firstName, user.lastName].filter(Boolean).join(" ")
    : "";

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Stack spacing={2} alignItems="center" textAlign="center">
        <Typography variant="h4" component="h1">
          Roostr
        </Typography>
        {user ? (
          <>
            <Typography color="text.secondary">
              {t("home.signedInAs", {
                name: fullName || `@${user.username ?? user.id}`,
              })}
            </Typography>
            <Button component={Link} href={`/${user.id}`} variant="contained">
              {t("home.profile")}
            </Button>
          </>
        ) : (
          <Typography color="text.secondary">{t("home.guest")}</Typography>
        )}
      </Stack>
    </Container>
  );
}
