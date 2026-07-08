"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { sellPriceBounds, LISTING_TTL_HOURS, type HydratedRoostr } from "@/lib/roostr";
import { listRoostrAction } from "@/app/market/actions";
import { useT } from "@/i18n/I18nProvider";

// Sell form: a digits-only price input clamped to the roostr's allowed range
// (weight class + gene count + sunk upgrade coins). Submitting calls
// listRoostrAction, which RE-CLAMPS the price server-side, so the client bounds
// are just UX. `onListed` closes the modal on success.
export default function SellRoostrForm({
  roostr,
  onListed,
}: {
  roostr: HydratedRoostr;
  onListed?: () => void;
}) {
  const t = useT();
  const router = useRouter();
  const [pending, start] = useTransition();
  const [serverErr, setServerErr] = useState<string | null>(null);
  const { min, max } = sellPriceBounds(
    roostr.genes,
    roostr.geneLevels,
    roostr.weightClass,
  );
  const [price, setPrice] = useState(String(min));

  const num = Number(price);
  const inRange = Number.isInteger(num) && num >= min && num <= max;
  const showError = price !== "" && !inRange;
  const valid = price !== "" && inRange;

  // strip everything but digits so nothing non-numeric ever lands in the field
  const onChange = (v: string) => {
    setPrice(v.replace(/[^\d]/g, ""));
    if (serverErr) setServerErr(null);
  };

  const submit = () => {
    if (!valid || !roostr.id) return;
    setServerErr(null);
    start(async () => {
      const res = await listRoostrAction(roostr.id!, num);
      if (res.ok) {
        onListed?.();
        router.refresh();
      } else {
        setServerErr(res.error);
      }
    });
  };

  return (
    <Stack spacing={2} sx={{ py: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {t("sell.bounds", { min: min.toLocaleString(), max: max.toLocaleString() })}
      </Typography>

      <TextField
        label={t("sell.price")}
        value={price}
        onChange={(e) => onChange(e.target.value)}
        inputMode="numeric"
        error={showError}
        helperText={
          showError
            ? t("sell.outOfRange", {
                min: min.toLocaleString(),
                max: max.toLocaleString(),
              })
            : " "
        }
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <Image
                  src="/corn-coin.png"
                  alt=""
                  width={18}
                  height={17}
                  style={{ height: 16, width: "auto" }}
                />
              </InputAdornment>
            ),
          },
        }}
      />

      <Typography variant="caption" color="text.secondary">
        ⏳ {t("sell.ttlNote", { hours: LISTING_TTL_HOURS })}
      </Typography>

      {serverErr && (
        <Typography variant="body2" color="error">
          {t("sell.error")}
        </Typography>
      )}

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!valid || pending}
        onClick={submit}
      >
        {pending ? <CircularProgress size={22} color="inherit" /> : t("sell.list")}
      </Button>
    </Stack>
  );
}
