"use client";

import { useState } from "react";
import Image from "next/image";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { sellPriceBounds, type HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

// Sell form (visual foundation): a digits-only price input clamped to the
// roostr's allowed range. Bounds come from sellPriceBounds (weight class + gene
// count + sunk upgrade coins). Listing isn't wired to the server yet.
export default function SellRoostrForm({ roostr }: { roostr: HydratedRoostr }) {
  const t = useT();
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
  const onChange = (v: string) => setPrice(v.replace(/[^\d]/g, ""));

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

      <Button
        variant="contained"
        size="large"
        fullWidth
        disabled={!valid}
        // TODO: wire to a listRoostr server action (create listing + status).
        onClick={() => {}}
      >
        {t("sell.list")}
      </Button>
    </Stack>
  );
}
