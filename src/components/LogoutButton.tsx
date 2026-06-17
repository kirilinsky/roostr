"use client";

import { useRouter } from "next/navigation";
import Button from "@mui/material/Button";

export default function LogoutButton() {
  const router = useRouter();
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
      Log out
    </Button>
  );
}
