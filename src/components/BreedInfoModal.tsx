"use client";

import Box from "@mui/material/Box";
import Chip from "@mui/material/Chip";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Popup from "@/components/Popup";
import BreedArt from "@/components/BreedArt";
import { BREEDS_CATALOG, groupName, groupDescription } from "@/lib/breeds";
import { FAMILIES, GENES, formatTraitEffects } from "@/lib/roostr";
import { countryFlag } from "@/lib/flag";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Localized names for gene families (by id) and genes (by canonical en name).
const FAMILY_NAME = Object.fromEntries(FAMILIES.map((f) => [f.id, f.name]));
const GENE_NAME = Object.fromEntries(GENES.map((g) => [g.name.en, g.name]));

function Row({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mt: 0.5 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700 }}>
        {value}
      </Typography>
    </Stack>
  );
}

// Breed info modal: real-world facts first, then the in-game specifics.
export default function BreedInfoModal({
  breedId,
  open,
  onClose,
}: {
  breedId: string;
  open: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const locale = useLocale();
  const breed = BREEDS_CATALOG.find((b) => b.id === breedId);
  if (!breed) return null;

  const fam = breed.geneAffinities?.families ?? {};
  const gen = breed.geneAffinities?.genes ?? {};
  const hasAffinity = Object.keys(fam).length > 0 || Object.keys(gen).length > 0;

  return (
    <Popup open={open} onClose={onClose} title={breed.name[locale]}>
      <Stack spacing={2}>
        {/* breed reference art */}
        <Box
          sx={{
            alignSelf: "center",
            width: "100%",
            maxWidth: 240,
            borderRadius: 0,
            overflow: "hidden",
            border: 1,
            borderColor: "divider",
          }}
        >
          <BreedArt id={breed.id} smooth />
        </Box>

        {/* meta chips */}
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          <Chip size="small" label={groupName(breed.group, locale)} />
          <Chip size="small" color="secondary" label={breed.rarity} />
          {breed.tags.map((tag) => (
            <Chip key={tag} size="small" variant="outlined" label={tag} />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary">
          {groupDescription(breed.group, locale)}
        </Typography>

        {/* Real-world info */}
        <Box>
          <Typography variant="overline" color="text.secondary">
            {t("breedInfo.about")}
          </Typography>
          <Typography variant="body2">{breed.description[locale]}</Typography>
          <Row
            label={t("breedInfo.region")}
            value={`${countryFlag(breed.region.iso)} ${breed.region[locale]}`}
          />
        </Box>

        <Divider />

        {/* In-game */}
        <Box>
          <Typography variant="overline" color="text.secondary">
            {t("breedInfo.inGame")}
          </Typography>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 0.5 }}>
            ☆ {breed.trait.name[locale]}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {breed.trait.description[locale]}
          </Typography>
          <Typography variant="caption" color="primary" component="div" sx={{ fontWeight: 700 }}>
            {formatTraitEffects(breed.trait.effects, locale)}
          </Typography>
          <Row label={t("breedInfo.baseHp")} value={String(breed.baseHealth)} />
        </Box>

        {/* Gene affinity (= elevated chance to roll these) */}
        {hasAffinity && (
          <Box>
            <Typography variant="overline" color="text.secondary">
              {t("breedInfo.geneAffinity")}
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
              {Object.entries(fam).map(([id, mult]) => (
                <Chip
                  key={id}
                  size="small"
                  color="primary"
                  variant="outlined"
                  label={`${FAMILY_NAME[id]?.[locale] ?? id} ×${mult}`}
                />
              ))}
              {Object.entries(gen).map(([name, mult]) => (
                <Chip
                  key={name}
                  size="small"
                  variant="outlined"
                  label={`${GENE_NAME[name]?.[locale] ?? name} ×${mult}`}
                />
              ))}
            </Stack>
          </Box>
        )}
      </Stack>
    </Popup>
  );
}
