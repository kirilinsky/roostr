"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { keyframes } from "@emotion/react";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import IconButton from "@mui/material/IconButton";
import Typography from "@mui/material/Typography";

// Universal toast system (design-system native — MUI + theme tokens, no extra dep).
// Reusable for achievement unlocks now and notifications/errors later. Push from
// any client component: `const toast = useToast(); toast.show({ ... })`.

export type ToastVariant = "achievement" | "info" | "success" | "error";

export interface ToastInput {
  message: string;
  title?: string;
  icon?: ReactNode; // emoji or node
  href?: string; // click → navigate here, then dismiss
  variant?: ToastVariant;
  durationMs?: number; // auto-dismiss (default 5s)
}
interface Toast extends ToastInput {
  id: number;
}

interface ToastApi {
  show: (t: ToastInput) => void;
}
const ToastCtx = createContext<ToastApi | null>(null);

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

const ACCENT: Record<ToastVariant, string> = {
  achievement: "tertiary.main",
  info: "primary.main",
  success: "success.main",
  error: "error.main",
};

const slideIn = keyframes`
  from { transform: translateX(24px); opacity: 0; }
  to   { transform: translateX(0); opacity: 1; }
`;

function ToastCard({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  const router = useRouter();
  const clickable = !!toast.href;
  const go = () => {
    if (toast.href) {
      router.push(toast.href);
      onClose();
    }
  };
  return (
    <Card
      role={clickable ? "button" : undefined}
      onClick={clickable ? go : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        p: 1,
        pl: 1.5,
        minWidth: 260,
        maxWidth: 360,
        borderLeft: 4,
        borderColor: ACCENT[toast.variant ?? "info"],
        boxShadow: 6,
        cursor: clickable ? "pointer" : "default",
        animation: `${slideIn} 0.25s ease`,
      }}
    >
      {toast.icon != null && (
        <Box sx={{ fontSize: 26, lineHeight: 1, flexShrink: 0 }}>
          {toast.icon}
        </Box>
      )}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        {toast.title && (
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }} noWrap>
            {toast.title}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" noWrap>
          {toast.message}
        </Typography>
      </Box>
      <IconButton
        size="small"
        aria-label="close"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        ✕
      </IconButton>
    </Card>
  );
}

export default function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const idRef = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((s) => s.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (input: ToastInput) => {
      const id = (idRef.current += 1);
      setToasts((s) => [...s, { id, ...input }]);
      window.setTimeout(() => dismiss(id), input.durationMs ?? 5000);
    },
    [dismiss],
  );

  const api = useMemo(() => ({ show }), [show]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      <Box
        sx={{
          position: "fixed",
          bottom: { xs: 12, md: 16 },
          right: { xs: 8, md: 16 },
          zIndex: (theme) => theme.zIndex.snackbar,
          display: "flex",
          flexDirection: "column",
          gap: 1,
          maxWidth: "calc(100vw - 16px)",
          pointerEvents: "none",
          "& > *": { pointerEvents: "auto" },
        }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onClose={() => dismiss(t.id)} />
        ))}
      </Box>
    </ToastCtx.Provider>
  );
}
