"use client";

import { useState, useTransition } from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import MenuItem from "@mui/material/MenuItem";
import Stack from "@mui/material/Stack";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import { useToast } from "@/components/ToastProvider";
import { createNewsAction } from "@/app/notifications/actions";

// Admin-only (rendered on the admin-gated /debug page): publish a News item to all
// players. Optional "claim_egg" CTA grants N eggs, once per user. Dev tool → labels
// are English-only on purpose.
export default function NewsPublisher() {
  const toast = useToast();
  const [pending, start] = useTransition();
  const [titleEn, setTitleEn] = useState("");
  const [titleRu, setTitleRu] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [bodyRu, setBodyRu] = useState("");
  const [link, setLink] = useState("");
  const [cta, setCta] = useState<"none" | "claim_egg">("none");
  const [amount, setAmount] = useState(1);

  const ready =
    !!titleEn.trim() && !!titleRu.trim() && !!bodyEn.trim() && !!bodyRu.trim();

  function publish() {
    if (!ready) return;
    start(async () => {
      const res = await createNewsAction({
        titleEn,
        titleRu,
        bodyEn,
        bodyRu,
        link: link || undefined,
        ctaType: cta === "claim_egg" ? "claim_egg" : undefined,
        ctaAmount: cta === "claim_egg" ? amount : undefined,
      });
      toast.show({
        variant: res.ok ? "success" : "error",
        message: res.ok ? "News published" : "Failed to publish",
      });
      if (res.ok) {
        setTitleEn("");
        setTitleRu("");
        setBodyEn("");
        setBodyRu("");
        setLink("");
        setCta("none");
        setAmount(1);
      }
    });
  }

  return (
    <Card sx={{ width: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          Publish news (admin)
        </Typography>
        <Stack spacing={1.5} sx={{ mt: 1 }}>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              size="small"
              label="Title (EN)"
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              size="small"
              label="Title (RU)"
              value={titleRu}
              onChange={(e) => setTitleRu(e.target.value)}
              sx={{ flex: 1, minWidth: 200 }}
            />
          </Box>
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              size="small"
              label="Body (EN)"
              value={bodyEn}
              onChange={(e) => setBodyEn(e.target.value)}
              multiline
              minRows={2}
              sx={{ flex: 1, minWidth: 200 }}
            />
            <TextField
              size="small"
              label="Body (RU)"
              value={bodyRu}
              onChange={(e) => setBodyRu(e.target.value)}
              multiline
              minRows={2}
              sx={{ flex: 1, minWidth: 200 }}
            />
          </Box>
          <TextField
            size="small"
            label="Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
            placeholder="/pedia/mechanics/referrals"
            fullWidth
          />
          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
            <TextField
              size="small"
              select
              label="CTA"
              value={cta}
              onChange={(e) => setCta(e.target.value as "none" | "claim_egg")}
              sx={{ minWidth: 160 }}
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="claim_egg">Claim eggs</MenuItem>
            </TextField>
            {cta === "claim_egg" && (
              <TextField
                size="small"
                type="number"
                label="Eggs"
                value={amount}
                onChange={(e) =>
                  setAmount(Math.max(1, Number(e.target.value) || 1))
                }
                sx={{ width: 100 }}
              />
            )}
          </Box>
          <Button
            variant="contained"
            onClick={publish}
            disabled={pending || !ready}
            sx={{ alignSelf: "flex-start" }}
          >
            Publish
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
