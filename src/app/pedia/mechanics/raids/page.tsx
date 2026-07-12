import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import {
  RAID_FEATHER_COST,
  RAID_HP_COST_WIN,
  RAID_HP_COST_LOSS,
  RAID_EGG_CHANCE,
  RAID_LOOT_PER_LUCK,
  RAID_CONSOLATION_MIN,
  RAID_CONSOLATION_MAX,
  RAID_BASE_SLOTS,
  maxRaidSlots,
} from "@/lib/raids";
import { getTranslations } from "@/i18n/server";

function Section({ title, body }: { title: string; body: string }) {
  return (
    <Card sx={{ p: { xs: 1.5, md: 2 } }}>
      <Typography variant="h6" sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {body}
      </Typography>
    </Card>
  );
}

// Mechanics article: raids ("Coop & Dagger") — the Stealth/Luck heist mode. All
// numbers are pulled from the live constants in lib/raids.ts, so this article
// can't drift from the actual game rules.
export default async function PediaRaidsPage() {
  const { t } = await getTranslations();

  return (
    <Container maxWidth="lg" sx={{ pt: { xs: 2.5, md: 3 }, pb: { xs: 4, md: 6 } }}>
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
            {t("pedia.mech.raids.title")}
          </Typography>
          <Typography color="text.secondary">{t("pedia.mech.raids.desc")}</Typography>
        </Box>

        <Section
          title={t("pedia.mech.raids.whatTitle")}
          body={t("pedia.mech.raids.what", {
            base: RAID_BASE_SLOTS,
            max: maxRaidSlots(),
          })}
        />
        <Section
          title={t("pedia.mech.raids.howTitle")}
          body={t("pedia.mech.raids.how", { feather: RAID_FEATHER_COST })}
        />
        <Section
          title={t("pedia.mech.raids.lootTitle")}
          body={t("pedia.mech.raids.loot", {
            perLuck: RAID_LOOT_PER_LUCK.toFixed(2),
            eggPct: Math.round(RAID_EGG_CHANCE * 100),
            cMin: RAID_CONSOLATION_MIN,
            cMax: RAID_CONSOLATION_MAX,
          })}
        />
        <Section
          title={t("pedia.mech.raids.priceTitle")}
          body={t("pedia.mech.raids.price", {
            win: RAID_HP_COST_WIN,
            loss: RAID_HP_COST_LOSS,
          })}
        />
        <Section
          title={t("pedia.mech.raids.defenseTitle")}
          body={t("pedia.mech.raids.defense")}
        />

        <Button
          component={Link}
          href="/raids"
          variant="contained"
          sx={{ alignSelf: "flex-start" }}
        >
          🗡 {t("pedia.mech.raids.cta")}
        </Button>
      </Stack>
    </Container>
  );
}
