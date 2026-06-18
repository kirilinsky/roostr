import { redirect } from "next/navigation";
import Container from "@mui/material/Container";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Stack from "@mui/material/Stack";
import Avatar from "@mui/material/Avatar";
import Typography from "@mui/material/Typography";
import Divider from "@mui/material/Divider";
import { getSession } from "@/lib/auth";
import { getTranslations } from "@/i18n/server";
import LogoutButton from "@/components/LogoutButton";

export default async function ProfilePage() {
  const user = await getSession();
  if (!user) redirect("/");

  const { t } = await getTranslations();
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(" ");

  return (
    <Container maxWidth="sm" sx={{ py: 8 }}>
      <Card variant="outlined">
        <CardContent>
          <Stack spacing={3} alignItems="center">
            <Avatar
              src={user.photoUrl}
              alt={fullName}
              sx={{ width: 96, height: 96 }}
            >
              {fullName.charAt(0) || "?"}
            </Avatar>

            <Stack spacing={0.5} alignItems="center">
              <Typography variant="h5" component="h1">
                {fullName || t("profile.fallbackName")}
              </Typography>
              {user.username && (
                <Typography variant="body1" color="text.secondary">
                  @{user.username}
                </Typography>
              )}
            </Stack>

            <Divider flexItem />

            <Stack spacing={1} sx={{ width: "100%" }}>
              <Row label={t("profile.id")} value={String(user.id)} />
              <Row label={t("profile.name")} value={fullName || "—"} />
              <Row
                label={t("profile.username")}
                value={user.username ? `@${user.username}` : "—"}
              />
            </Stack>

            <LogoutButton />
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontFamily: "monospace" }}>
        {value}
      </Typography>
    </Stack>
  );
}
