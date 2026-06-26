"use client";

import { useMemo, useState, useTransition } from "react";
import { keyframes } from "@emotion/react";
import Image from "next/image";
import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import LinearProgress from "@mui/material/LinearProgress";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import GeneIcon from "@/components/GeneIcon";
import RoostrAvatarPixel from "@/components/RoostrAvatarPixel";
import BreedInfoModal from "@/components/BreedInfoModal";
import StatInfoModal from "@/components/StatInfoModal";
import ArchetypeInfoModal from "@/components/ArchetypeInfoModal";
import Popup from "@/components/Popup";
import SellRoostrForm from "@/components/SellRoostrForm";
import GiftRoostrButton, { type GiftFriend } from "@/components/GiftRoostrButton";
import { countryFlag } from "@/lib/flag";
import { groupName } from "@/lib/breeds";
import { tierBackground } from "@/lib/tierBg";
import { MONO_FONT } from "@/lib/tokens";
import { STAT_KIND_COLOR, type StatKind } from "@/lib/statKinds";
import {
  GENE_MAX_LEVEL,
  NICKNAME_MAX,
  SKILLS,
  SKILL_IDS,
  STAT_BAR_MAX,
  TIERS,
  WEIGHT_CLASSES,
  computeStats,
  geneUpgradeCost,
  roleLabel,
  skillLabel,
  type HydratedRoostr,
} from "@/lib/roostr";
import {
  validateText,
  NICKNAME_RULE,
  type TextErrorCode,
} from "@/lib/validation";
import StatModBadges from "@/components/StatModBadges";
import BattleRecord from "@/components/BattleRecord";
import {
  upgradeGeneAction,
  renameRoostrAction,
  clearNicknameAction,
} from "@/app/collection/[id]/actions";
import { useLocale, useT } from "@/i18n/I18nProvider";

// Brief "upgrade applied" pulse on the gene's button after a successful upgrade.
const successPulse = keyframes`
  0% { transform: scale(1); }
  45% { transform: scale(1.06); filter: brightness(1.25); }
  100% { transform: scale(1); filter: brightness(1); }
`;

const SKILL_KIND = Object.fromEntries(
  SKILLS.map((s) => [s.id, s.kind]),
) as Record<string, StatKind>;

export default function RoostrDetail({
  roostr,
  roostrId,
  coins,
  isOwner,
  locked = false,
  friends = [],
}: {
  roostr: HydratedRoostr;
  roostrId: string;
  coins: number;
  isOwner: boolean;
  locked?: boolean;
  friends?: GiftFriend[];
}) {
  // The owner can manage (sell / upgrade) only an ACTIVE bird; a listed/sold one
  // is locked.
  const canManage = isOwner && !locked;
  // Renaming is a cosmetic, owner-only edit — allowed regardless of lock status.
  const canRename = isOwner;
  const t = useT();
  const locale = useLocale();
  const [pending, startTransition] = useTransition();
  const [busyGene, setBusyGene] = useState<string | null>(null);
  const [flashGene, setFlashGene] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState(false);
  const [statInfoOpen, setStatInfoOpen] = useState(false);
  const [archOpen, setArchOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [nickOpen, setNickOpen] = useState(false);
  const [nickInput, setNickInput] = useState("");
  const [nickErr, setNickErr] = useState<TextErrorCode | "server" | null>(null);
  const [savingNick, startNick] = useTransition();

  const breedName = roostr.breed.name[locale];
  const name = roostr.nickname || breedName;
  const seedId = `#${roostr.seed.toString(16).padStart(6, "0").toUpperCase()}-RSTR`;
  const tier = roostr.tier;
  const kgUnit = locale === "ru" ? "кг" : "kg";
  // Weight is a grade on a scale (tiny → huge); it can shift, so show position.
  const weightIdx = WEIGHT_CLASSES.findIndex(
    (w) => w.id === roostr.weightClass.id,
  );
  // Current HP isn't tracked yet (no battle damage) → full. Shows as cur/max,
  // e.g. "1/43" once battles deplete it.
  const curHp = roostr.maxHealth;
  // Innate stats (base + weight, no genes) — the dark part of each bar; the gene
  // upgrades sit lighter on top.
  const baseStats = useMemo(
    () => computeStats([], {}, roostr.weightClass),
    [roostr.weightClass],
  );

  // Rating progress within the current tier band (our level/XP analog).
  const nextTier = TIERS.find((tr) => tr.min > roostr.rating);
  const bandStart = tier.min;
  const bandEnd = nextTier?.min ?? roostr.rating;
  const bandPct = nextTier
    ? Math.min(100, ((roostr.rating - bandStart) / (bandEnd - bandStart)) * 100)
    : 100;

  function upgrade(geneId: string) {
    setBusyGene(geneId);
    startTransition(async () => {
      const res = await upgradeGeneAction(roostrId, geneId);
      setBusyGene(null);
      if (res?.ok) {
        // brief success pulse on the button
        setFlashGene(geneId);
        window.setTimeout(
          () => setFlashGene((g) => (g === geneId ? null : g)),
          600,
        );
      }
    });
  }

  function openNickname() {
    setNickInput(roostr.nickname ?? "");
    setNickErr(null);
    setNickOpen(true);
  }

  function saveNickname() {
    // Validate client-side first (instant feedback); the action re-validates with
    // the SAME rule server-side, so the XSS/length guard can't be bypassed.
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
    <Stack spacing={3}>
      <Button
        component={Link}
        href="/collection"
        color="neutral"
        sx={{ alignSelf: "flex-start" }}
      >
        ← {t("detail.back")}
      </Button>

      {/* Title + badges — full width, top-left (above the avatar/stats row) */}
      <Box>
        <Stack
          direction="row"
          alignItems="center"
          spacing={1}
          sx={{ minWidth: 0 }}
        >
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
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ mt: 0.5 }}
          flexWrap="wrap"
          useFlexGap
        >
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
      </Box>

      {/* avatar + stats — responsive 2-column grid */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            md: "300px minmax(0, 1fr)",
          },
          gap: 3,
          alignItems: "start",
        }}
      >
        {/* avatar + identity */}
        <Stack spacing={1.5} sx={{ minWidth: 0 }}>
          <Box
            sx={{
              position: "relative",
              width: "100%",
              maxWidth: { xs: 340, md: "none" },
              mx: "auto",
            }}
          >
            <Box
              sx={{
                aspectRatio: "1 / 1",
                borderRadius: 0,
                border: 4,
                borderColor: "neutral.main",
                overflow: "hidden",
                background: tierBackground(tier.color),
              }}
            >
              <RoostrAvatarPixel
                colors={roostr.colors}
                pattern={roostr.pattern}
                breed={roostr.breed}
                weightClass={roostr.weightClass}
                seed={roostr.seed}
              />
            </Box>
            <Chip
              label={`★ ${tier.id}`}
              sx={(theme) => ({
                position: "absolute",
                top: 12,
                left: 12,
                fontWeight: 800,
                bgcolor: tier.color,
                color: theme.palette.getContrastText(tier.color),
              })}
            />
          </Box>

          {/* level / rating progress */}
          <Card sx={{ p: 1.5 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }} noWrap>
                {t("collection.level")} {tier.id}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums", flexShrink: 0 }}
              >
                {roostr.rating}
                {nextTier ? ` / ${nextTier.min}` : ""}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              value={bandPct}
              sx={{ height: 8, borderRadius: 0 }}
            />
            {/* battle record — wins/losses (green/red), labelled on hover */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ⚔️ {t("detail.record")}
              </Typography>
              <BattleRecord
                wins={roostr.wins}
                losses={roostr.losses}
                draws={roostr.draws}
                variant="body2"
              />
            </Stack>
            {/* HP — current / max (current = full until battle damage exists) */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1, mb: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ♥ HP
              </Typography>
              <Typography
                variant="body2"
                sx={{ fontWeight: 800, fontVariantNumeric: "tabular-nums" }}
              >
                {curHp}/{roostr.maxHealth}
              </Typography>
            </Stack>
            <LinearProgress
              variant="determinate"
              color="error"
              value={(curHp / roostr.maxHealth) * 100}
              sx={{ height: 8, borderRadius: 0 }}
            />

            {/* Weight grade — a shifting scale (tiny → huge); current is filled. */}
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mt: 1, mb: 0.5 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                ⚖️ {roostr.weightClass.name[locale]}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ fontVariantNumeric: "tabular-nums" }}
              >
                {roostr.weightClass.kg} {kgUnit}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.5}>
              {WEIGHT_CLASSES.map((w, i) => (
                <Box
                  key={w.id}
                  title={`${w.name[locale]} · ${w.kg} ${kgUnit}`}
                  sx={{
                    flex: 1,
                    height: 8,
                    borderRadius: 0,
                    bgcolor: i <= weightIdx ? "tertiary.main" : "action.hover",
                  }}
                />
              ))}
            </Stack>
          </Card>
        </Stack>

        {/* combat stats + trait */}
        <Stack spacing={1.5} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Card sx={{ p: { xs: 1.5, md: 2 }, flexGrow: 1 }}>
            <Stack
              direction="row"
              alignItems="center"
              spacing={0.5}
              sx={{ mb: 1.5 }}
            >
              <Typography variant="h6">{t("detail.combatStats")}</Typography>
              {/* legend: red attack / blue defense / green utility */}
              <IconButton
                size="small"
                aria-label={t("stats.kindsTitle")}
                onClick={() => setStatInfoOpen(true)}
                sx={{ color: "primary.main" }}
              >
                ⓘ
              </IconButton>
            </Stack>
           
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: {
                  xs: "minmax(0, 1fr)",
                  sm: "minmax(0, 1fr) minmax(0, 1fr)",
                },
                columnGap: 2,
                rowGap: 0.75,
              }}
            >
              {SKILL_IDS.map((id) => {
                const total = roostr.stats[id];
                const base = baseStats[id];
                const color = STAT_KIND_COLOR[SKILL_KIND[id]] ?? "primary";
                const basePct = Math.min(
                  100,
                  (Math.min(base, total) / STAT_BAR_MAX) * 100,
                );
                const buffPct = Math.min(
                  100 - basePct,
                  (Math.max(0, total - base) / STAT_BAR_MAX) * 100,
                );
                return (
                  <Box key={id}>
                    <Stack direction="row" justifyContent="space-between">
                      <Typography variant="caption" color="text.secondary">
                        {skillLabel(id, locale)}
                      </Typography>
                      <br />
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          fontVariantNumeric: "tabular-nums",
                        }}
                      >
                        {total}
                      </Typography>
                    </Stack>
                    {/* base (solid) + gene-upgrade portion (lighter) stacked */}
                    <Box
                      sx={{
                        display: "flex",
                        height: 6,
                        borderRadius: 0,
                        overflow: "hidden",
                        bgcolor: "action.hover",
                      }}
                    >
                      <Box
                        sx={{ width: `${basePct}%`, bgcolor: `${color}.main` }}
                      />
                      <Box
                        sx={{ width: `${buffPct}%`, bgcolor: `${color}.light` }}
                      />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Card>

          {/* Breed trait — innate, non-upgradeable buff/debuff */}
          <Card sx={{ p: { xs: 1.5, md: 2 } }}>
            <Typography variant="overline" color="text.secondary">
              {t("detail.breedTrait")} · {breedName}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, mt: 0.25 }}>
              ☆ {roostr.breed.trait.name[locale]}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {roostr.breed.trait.description[locale]}
            </Typography>
            <Stack
              direction="row"
              spacing={0.5}
              flexWrap="wrap"
              useFlexGap
              sx={{ mt: 1 }}
            >
              {roostr.breed.trait.effects.map((e) => {
                const pct = Math.round(e.mod * 100);
                return (
                  <Chip
                    key={e.stat}
                    size="small"
                    variant="outlined"
                    color={pct >= 0 ? "success" : "error"}
                    label={`${pct > 0 ? "+" : ""}${pct}% ${skillLabel(e.stat, locale)}`}
                  />
                );
              })}
            </Stack>
          </Card>
        </Stack>
      </Box>

      {/* Working notice — bird is on the farm / in the lab. Can't be sold until
          removed from work; the Sell button explains instead of opening the form. */}
      {isOwner && roostr.status === "working" && (
        <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "tertiary.main" }}>
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
          >
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              🔧{" "}
              {t("detail.atWork", {
                station: t(
                  roostr.work?.kind === "farm" ? "nav.farm" : "nav.lab",
                ),
              })}
            </Typography>
            <Button
              variant="contained"
              onClick={() => window.alert(t("detail.sellBlocked"))}
            >
              {t("detail.sell")}
            </Button>
          </Stack>
        </Card>
      )}

      {/* Gift limbo — sent as a pending gift: locked, and the sender CAN'T cancel
          it. It only comes back if the recipient declines. */}
      {isOwner && roostr.status === "gifting" && (
        <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "secondary.main" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            🎁 {t("detail.giftPending")}
          </Typography>
        </Card>
      )}

      {/* Locked notice — on the market (or otherwise non-active, non-working/gifting) */}
      {isOwner &&
        locked &&
        roostr.status !== "working" &&
        roostr.status !== "gifting" && (
          <Card sx={{ p: { xs: 1.5, md: 2 }, borderColor: "tertiary.main" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              🔒 {t("detail.locked")}
            </Typography>
          </Card>
        )}

      {/* Owner actions — sell now; gift / release are coming */}
      {canManage && (
        <Card sx={{ p: { xs: 1.5, md: 2 } }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={() => setSellOpen(true)}>
              {t("detail.sell")}
            </Button>
            <GiftRoostrButton roostrId={roostrId} friends={friends} />
            <Button
              variant="outlined"
              color="neutral"
              disabled
              endIcon={<Chip label={t("pedia.soon")} size="small" variant="outlined" />}
            >
              {t("detail.release")}
            </Button>
          </Stack>
        </Card>
      )}

      {/* Genetic upgrades */}
      <Stack direction="row" justifyContent="space-between" alignItems="center">
        <Typography
          variant="h5"
          sx={{ fontWeight: 800, textTransform: "uppercase" }}
        >
          {t("detail.geneticUpgrades")}
        </Typography>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {coins.toLocaleString()}
          </Typography>
          <Image
            src="/corn-coin.png"
            alt="Corn Coin"
            width={18}
            height={17}
            style={{ height: 16, width: "auto" }}
          />
        </Stack>
      </Stack>

      <Box
        sx={{
          display: "grid",
          gap: 2,
          gridTemplateColumns: {
            xs: "minmax(0, 1fr)",
            sm: "repeat(2, minmax(0, 1fr))",
            lg: "repeat(4, minmax(0, 1fr))",
          },
        }}
      >
        {roostr.genes.map((gene) => {
          const level = roostr.geneLevels[gene.id] ?? 1;
          const maxed = level >= GENE_MAX_LEVEL;
          const cost = geneUpgradeCost(level);
          const canAfford = coins >= cost;
          const disabled =
            !isOwner ||
            maxed ||
            !canAfford ||
            (pending && busyGene === gene.id);
          return (
            <Card
              key={gene.id}
              sx={{ p: 1.5, display: "flex", flexDirection: "column", gap: 1 }}
            >
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <GeneIcon no={gene.no} family={gene.family} size={64} />
                <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                  <Typography
                    variant="subtitle2"
                    sx={{ fontWeight: 800 }}
                    noWrap
                  >
                    {gene.name[locale]}
                  </Typography>
                  <Chip
                    label={`${t("detail.lvl")} ${level}`}
                    size="small"
                    variant="outlined"
                    sx={{ alignSelf: "flex-start" }}
                  />
                </Stack>
              </Stack>

              {/* gene's base effect (fixed identity) — magnitude grows with
                  level, reflected in the all-stats panel, not by mutating this. */}
              <Box sx={{ minHeight: 24 }}>
                <StatModBadges mods={gene.statMods} locale={locale} />
              </Box>

              {canManage ? (
                (() => {
                  const busy = pending && busyGene === gene.id;
                  return (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={disabled}
                      onClick={() => upgrade(gene.id)}
                      sx={
                        flashGene === gene.id
                          ? { animation: `${successPulse} 0.6s ease` }
                          : undefined
                      }
                    >
                      {busy ? (
                        <CircularProgress size={18} color="inherit" />
                      ) : (
                        <Stack
                          direction="row"
                          spacing={0.75}
                          alignItems="center"
                        >
                          <span>
                            {maxed ? t("detail.maxLevel") : t("detail.upgrade")}
                          </span>
                          {!maxed && (
                            <Box
                              component="span"
                              sx={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 0.25,
                                opacity: 0.9,
                              }}
                            >
                              {cost}
                              <Image
                                src="/corn-coin.png"
                                alt=""
                                width={18}
                                height={17}
                                style={{ height: 13, width: "auto" }}
                              />
                            </Box>
                          )}
                        </Stack>
                      )}
                    </Button>
                  );
                })()
              ) : null}
            </Card>
          );
        })}
      </Box>

      <BreedInfoModal
        breedId={roostr.breed.id}
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
      />
      <StatInfoModal
        open={statInfoOpen}
        onClose={() => setStatInfoOpen(false)}
      />
      <ArchetypeInfoModal
        roleId={roostr.role}
        genes={roostr.genes}
        open={archOpen}
        onClose={() => setArchOpen(false)}
      />

      {/* Sell modal — price input (more content TBD) */}
      <Popup
        open={sellOpen}
        onClose={() => setSellOpen(false)}
        title={t("detail.sellTitle")}
      >
        <SellRoostrForm roostr={roostr} />
      </Popup>

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
            {/* delete — only when a nickname is actually set */}
            {roostr.nickname ? (
              <Button
                color="error"
                onClick={clearNickname}
                disabled={savingNick}
              >
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
    </Stack>
  );
}
