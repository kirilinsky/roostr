"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import BreedInfoModal from "@/components/BreedInfoModal";
import ArchetypeInfoModal from "@/components/ArchetypeInfoModal";
import Popup from "@/components/Popup";
import { countryFlag } from "@/lib/flag";
import { groupName } from "@/lib/breeds";
import { MONO_FONT } from "@/lib/tokens";
import { NICKNAME_MAX, roleLabel, type HydratedRoostr } from "@/lib/roostr";
import {
  validateText,
  NICKNAME_RULE,
  type TextErrorCode,
} from "@/lib/validation";
import {
  renameRoostrAction,
  clearNicknameAction,
} from "@/app/collection/[id]/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Title row + identity chips (role / seed / country / group / nickname), plus the
// breed-info, archetype, and nickname modals these chips open.
export default function RoostrHeader({
  roostr,
  roostrId,
  canRename,
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  canRename: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;
  const seedId = `#${roostr.seed.toString(16).padStart(6, "0").toUpperCase()}-RSTR`;

  const [infoOpen, setInfoOpen] = useState(false);
  const [archOpen, setArchOpen] = useState(false);
  const [nickOpen, setNickOpen] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [nickErr, setNickErr] = useState<TextErrorCode | "server" | null>(null);
  const [savingNick, startNick] = useTransition();

  function openNickname() {
    setNickInput(roostr.nickname ?? "");
    setNickErr(null);
    setNickOpen(true);
  }
  function saveNickname() {
    const v = validateText(nickInput, NICKNAME_RULE);
    if (!v.ok) {
      setNickErr(v.code);
      return;
    }
    startNick(async () => {
      const res = await renameRoostrAction(roostrId, nickInput);
      if (res.ok) setNickOpen(false);
      else setNickErr("server");
    });
  }
  function clearNickname() {
    setNickErr(null);
    startNick(async () => {
      const res = await clearNicknameAction(roostrId);
      if (res.ok) setNickOpen(false);
      else setNickErr("server");
    });
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ minWidth: 0 }}>
        <Typography
          variant="h3"
          sx={{ fontWeight: 800, textTransform: "uppercase", minWidth: 0 }}
          noWrap
        >
          {name}
        </Typography>
        {/* breed info — real + game facts about the breed */}
        <IconButton
          aria-label={t("breedInfo.info")}
          onClick={() => setInfoOpen(true)}
          sx={{ color: "primary.main", flexShrink: 0 }}
        >
          ⓘ
        </IconButton>
      </Stack>
      <Stack direction="row" spacing={0.5} sx={{ mt: 0.5 }} flexWrap="wrap" useFlexGap>
        {/* recommended archetype/role — click to learn what it means */}
        <Chip
          label={`${roleLabel(roostr.role, locale).toUpperCase()} ⓘ`}
          size="small"
          color="primary"
          clickable
          onClick={() => setArchOpen(true)}
          sx={{ fontWeight: 800, letterSpacing: 0.5 }}
        />
        <Chip
          label={seedId}
          size="small"
          variant="outlined"
          sx={{ fontFamily: MONO_FONT }}
        />
        {/* breed country of origin (future country championships) */}
        <Chip
          label={`${countryFlag(roostr.breed.region.iso)} ${roostr.breed.region[locale]}`}
          size="small"
          variant="outlined"
        />
        {/* breed group */}
        <Chip
          label={groupName(roostr.breed.group, locale)}
          size="small"
          variant="outlined"
        />
        {/* custom nickname — add or edit (owner only, any status) */}
        {canRename && (
          <Chip
            label={`✏️ ${roostr.nickname ? t("detail.editNickname") : t("detail.addNickname")}`}
            size="small"
            color="secondary"
            variant="outlined"
            clickable
            onClick={openNickname}
          />
        )}
      </Stack>

      <BreedInfoModal
        breedId={roostr.breed.id}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
      <ArchetypeInfoModal
        roleId={roostr.role}
        genes={roostr.genes}
        open={archOpen}
        onClose={() => setArchOpen(false)}
      />

      {/* Nickname modal — set / clear the custom display name */}
      <Popup
        open={nickOpen}
        onClose={() => setNickOpen(false)}
        title={t("detail.nicknameTitle")}
        maxWidth="xs"
      >
        <Stack spacing={2}>
          <TextField
            autoFocus
            fullWidth
            label={t("detail.nicknameLabel")}
            value={nickInput}
            onChange={(e) => {
              setNickInput(e.target.value);
              if (nickErr) setNickErr(null);
            }}
            slotProps={{ htmlInput: { maxLength: NICKNAME_MAX } }}
            error={nickErr !== null}
            helperText={
              nickErr
                ? nickErr === "server"
                  ? t("detail.saveError")
                  : t(`validation.${nickErr}`)
                : `${nickInput.trim().length}/${NICKNAME_MAX}`
            }
          />
          <Stack direction="row" spacing={1} justifyContent="space-between">
            {roostr.nickname ? (
              <Button color="error" onClick={clearNickname} disabled={savingNick}>
                {t("detail.deleteNickname")}
              </Button>
            ) : (
              <span />
            )}
            <Stack direction="row" spacing={1}>
              <Button color="neutral" onClick={() => setNickOpen(false)}>
                {t("detail.cancel")}
              </Button>
              <Button
                variant="contained"
                onClick={saveNickname}
                disabled={savingNick || nickInput.trim().length === 0}
              >
                {t("detail.save")}
              </Button>
            </Stack>
          </Stack>
        </Stack>
      </Popup>
    </Box>
  );
}
