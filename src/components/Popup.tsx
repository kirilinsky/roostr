"use client";

import type { ReactNode } from "react";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";

// Reusable themed modal. Wraps MUI Dialog with the design-system frame (rounded,
// neutral border) + a title row with a close button. Drop any content as children.
// `fullScreenOnMobile` makes content-heavy modals (e.g. the worker picker grid)
// take the whole phone screen instead of a cramped centered box.
export default function Popup({
  open,
  onClose,
  title,
  children,
  maxWidth = "sm",
  fullScreenOnMobile = false,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg";
  fullScreenOnMobile?: boolean;
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth={maxWidth}
      fullWidth
      fullScreen={fullScreenOnMobile && isMobile}
      slotProps={{
        paper: { sx: { borderRadius: 0, border: 3, borderColor: "neutral.main" } },
      }}
    >
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ px: 2, pt: 1.5, pb: 1 }}
      >
        <Typography variant="h6" sx={{ fontWeight: 800, minWidth: 0 }} noWrap>
          {title}
        </Typography>
        <IconButton onClick={onClose} size="small" aria-label="close" sx={{ flexShrink: 0 }}>
          ✕
        </IconButton>
      </Stack>
      <DialogContent sx={{ pt: 0 }}>{children}</DialogContent>
    </Dialog>
  );
}
