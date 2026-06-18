"use client";

import { useState } from "react";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import RoostrCard from "@/components/RoostrCard";
import GeneLab from "@/components/GeneLab";
import { rollRoostr, type RolledRoostr } from "@/lib/roostr";
import { markDiscovered } from "@/lib/dex";
import { useT } from "@/i18n/I18nProvider";

interface BatchStats {
  n: number;
  genes: Record<number, number>; // 2|3|4 -> count
  roles: Record<string, number>;
  body: Record<string, number>; // body color id -> count
}

function craft(n: number): BatchStats {
  const s: BatchStats = { n, genes: {}, roles: {}, body: {} };
  for (let i = 0; i < n; i++) {
    const r = rollRoostr();
    s.genes[r.genes.length] = (s.genes[r.genes.length] ?? 0) + 1;
    s.roles[r.role] = (s.roles[r.role] ?? 0) + 1;
    s.body[r.colors.body] = (s.body[r.colors.body] ?? 0) + 1;
  }
  return s;
}

// Distribution rows sorted by count desc, with percentage of the batch.
function Dist({
  title,
  data,
  total,
}: {
  title: string;
  data: Record<string | number, number>;
  total: number;
}) {
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <Box sx={{ width: "100%" }}>
      <Typography variant="overline" color="text.secondary">
        {title}
      </Typography>
      <Stack spacing={0.25}>
        {rows.map(([label, count]) => (
          <Stack key={label} direction="row" justifyContent="space-between">
            <Typography variant="body2">{label}</Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontVariantNumeric: "tabular-nums" }}
            >
              {count} · {((100 * count) / total).toFixed(2)}%
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
}

export default function DebugPage() {
  const t = useT();
  const [current, setCurrent] = useState<RolledRoostr | null>(null);
  const [count, setCount] = useState(0);
  const [batch, setBatch] = useState<BatchStats | null>(null);

  function hatch() {
    const rolled = rollRoostr();
    setCurrent(rolled);
    markDiscovered(rolled.breed.id); // single craft = real, fills dex
    setCount((c) => c + 1);
  }

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" component="h1">
          {t("debug.title")}
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {t("debug.subtitle")} {t("debug.rolls", { count })}
        </Typography>

        <Button variant="contained" size="large" onClick={hatch}>
          🥚 {t("debug.hatch")}
        </Button>

        <Box sx={{ minHeight: 360, display: "flex", alignItems: "center" }}>
          {current ? (
            <RoostrCard roostr={current} />
          ) : (
            <Typography color="text.secondary">{t("debug.press")}</Typography>
          )}
        </Box>

        {/* DNA upgrade lab for the freshly crafted roostr (resets per craft). */}
        {current && <GeneLab key={current.seed} roostr={current} />}

        <Divider flexItem />

        {/* Batch craft: roll many, see drop distribution (no dex writes). */}
        <Typography variant="overline" color="text.secondary">
          Batch craft — drop rates
        </Typography>
        <Stack direction="row" spacing={1}>
          {[100, 1000, 10000].map((n) => (
            <Button
              key={n}
              variant="outlined"
              color="neutral"
              onClick={() => setBatch(craft(n))}
            >
              Craft ×{n.toLocaleString()}
            </Button>
          ))}
        </Stack>

        {batch && (
          <Stack spacing={2} sx={{ width: "100%" }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              {batch.n.toLocaleString()} rolls
            </Typography>
            <Dist
              title="Gene count"
              data={batch.genes}
              total={batch.n}
            />
            <Dist title="Recommended role" data={batch.roles} total={batch.n} />
            <Dist title="Body color" data={batch.body} total={batch.n} />
          </Stack>
        )}
      </Stack>
    </Container>
  );
}
