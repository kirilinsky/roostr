"use client";

import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import { useT } from "@/i18n/I18nProvider";

export default function LogoutButton() {
  const router = useRouter();
  const t = useT();
  return (
    <Button
      variant="outlined"
      color="inherit"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        router.push("/");
        router.refresh();
      }}
    >
      {t("profile.logout")}
    </Button>
  );
}
