import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import PveDebug from "@/components/PveDebug";
import { getTranslations } from "@/i18n/server";

// Arena › PvE (debug) — roll a random enemy bird. No combat resolution yet.
export default async function ArenaPvePage() {
  const { t } = await getTranslations();
  return (
    <Container maxWidth="sm" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
      <Stack spacing={3}>
        <Button
          component={Link}
          href="/arena"
          color="neutral"
          sx={{ alignSelf: "flex-start" }}
        >
          ← {t("nav.arena")}
        </Button>

        <Box>
          <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="h4" component="h1">
              ⚔️ {t("arena.pve")}
            </Typography>
            <Chip label={t("nav.debug")} size="small" color="secondary" variant="outlined" />
          </Stack>
          <Typography color="text.secondary">{t("arena.pveDesc")}</Typography>
        </Box>

        <PveDebug />
      </Stack>
    </Container>
  );
}
