"use client";

import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import CollectionCard from "@/components/CollectionCard";
import Popup from "@/components/Popup";
import type { HydratedRoostr } from "@/lib/roostr";
import { useT } from "@/i18n/I18nProvider";

// The admit-a-patient picker: hurt roster birds (most-wounded first, sorted by
// the parent), tap to select, sticky confirm.
export default function AdmitPickerPopup({
  open,
  injured,
  picked,
  busy,
  onPick,
  onClose,
  onAdmit,
}: {
  open: boolean;
  injured: HydratedRoostr[]; // already sorted most-wounded first
  picked: string | null;
  busy: boolean;
  onPick: (id: string | null) => void;
  onClose: () => void;
  onAdmit: () => void;
}) {
  const t = useT();
  return (
    <Popup
      open={open}
      onClose={() => !busy && onClose()}
      title={t("hospital.pickTitle")}
      maxWidth="md"
      fullScreenOnMobile
    >
      <Stack spacing={2}>
        {injured.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ py: 4 }}>
            {t("hospital.noHurt")}
          </Typography>
        ) : (
          <Box
            sx={{
              display: "grid",
              gap: 1.5,
              gridTemplateColumns: {
                xs: "repeat(2, minmax(0, 1fr))",
                sm: "repeat(3, minmax(0, 1fr))",
              },
            }}
          >
            {injured.map((r) => (
              <CollectionCard
                key={r.id}
                roostr={r}
                compact
                metric="hp"
                selected={picked === r.id}
                onClick={() => onPick(picked === r.id ? null : (r.id ?? null))}
              />
            ))}
          </Box>
        )}
        <Button
          variant="contained"
          size="large"
          fullWidth
          disabled={!picked || busy}
          onClick={onAdmit}
          sx={{ position: "sticky", bottom: 0 }}
        >
          {busy ? <CircularProgress size={20} color="inherit" /> : t("hospital.admitConfirm")}
        </Button>
      </Stack>
    </Popup>
  );
}
