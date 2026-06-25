"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Pagination from "@mui/material/Pagination";
import Stack from "@mui/material/Stack";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import Typography from "@mui/material/Typography";
import { alpha } from "@mui/material/styles";
import { useLocale, useT } from "@/i18n/I18nProvider";
import type { ResourceKind, ResourceTxn } from "@/db/queries";

// Per-resource icon + i18n label key for ledger rows + tab labels (mirrors the
// page's wallet meta — kept here since the history is a client island).
const RESOURCE_META: Record<ResourceKind, { icon: string; labelKey: string }> = {
  coin: { icon: "/corn-coin.png", labelKey: "currency.coin" },
  sci: { icon: "/sci.png", labelKey: "resource.sci" },
  egg: { icon: "/eggs.png", labelKey: "resource.eggs" },
  feather: { icon: "/feather.png", labelKey: "resource.feathers" },
};

// "all" + one tab per wallet currency, so the ledger isn't a mixed pile.
type Filter = "all" | ResourceKind;
const TABS: Filter[] = ["all", "coin", "sci", "egg"];
const PAGE_SIZE = 7; // max rows per page

export default function BankHistory({ txns }: { txns: ResourceTxn[] }) {
  const t = useT();
  const locale = useLocale();
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);

  // Switching tab resets to the first page (the old page may not exist there).
  function selectTab(f: Filter) {
    setFilter(f);
    setPage(1);
  }

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }),
    [locale],
  );

  const rows = useMemo(
    () => (filter === "all" ? txns : txns.filter((x) => x.resource === filter)),
    [txns, filter],
  );
  const pageCount = Math.ceil(rows.length / PAGE_SIZE);
  const paged = rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <Card
      sx={{
        boxShadow: "none",
        border: 1,
        borderColor: "divider",
        borderRadius: 1,
        minHeight: { lg: 520 },
      }}
    >
      <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
          <Typography variant="overline" color="text.secondary">
            {t("bank.history")}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {rows.length.toLocaleString()}
          </Typography>
        </Stack>

        <Tabs
          value={filter}
          onChange={(_, v: Filter) => selectTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            mt: 0.5,
            minHeight: 40,
            borderBottom: 1,
            borderColor: "divider",
            "& .MuiTab-root": {
              minHeight: 40,
              px: 1.5,
              fontWeight: 800,
            },
          }}
        >
          {TABS.map((f) => (
            <Tab
              key={f}
              value={f}
              label={f === "all" ? t("bank.all") : t(RESOURCE_META[f].labelKey)}
            />
          ))}
        </Tabs>

        {rows.length === 0 ? (
          <Stack
            spacing={1}
            alignItems="center"
            justifyContent="center"
            sx={{ minHeight: 320, py: 4 }}
          >
            <Typography color="text.secondary">{t("bank.empty")}</Typography>
          </Stack>
        ) : (
          <>
            <List disablePadding sx={{ mt: 1 }}>
              {paged.map((tx) => {
              const meta = RESOURCE_META[tx.resource];
              const income = tx.amount >= 0;
              return (
                <ListItem
                  key={tx.id}
                  sx={(theme) => ({
                    px: 1,
                    py: 1,
                    gap: 1.25,
                    mb: 0.75,
                    border: 1,
                    borderColor: "divider",
                    borderRadius: 1,
                    bgcolor: alpha(theme.palette.background.default, 0.72),
                    "&:last-child": { mb: 0 },
                  })}
                  secondaryAction={
                    <Typography
                      sx={{
                        pr: 1,
                        fontWeight: 900,
                        fontVariantNumeric: "tabular-nums",
                        color: income ? "success.main" : "error.main",
                      }}
                    >
                      {income ? "+" : "−"}
                      {Math.abs(tx.amount).toLocaleString()}
                    </Typography>
                  }
                >
                  <Box
                    sx={{
                      width: 34,
                      height: 34,
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: 1,
                      borderColor: "divider",
                      borderRadius: 1,
                      bgcolor: "background.paper",
                    }}
                  >
                    <Image
                      src={meta.icon}
                      alt={t(meta.labelKey)}
                      width={22}
                      height={22}
                      style={{ height: 22, width: "auto" }}
                    />
                  </Box>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                      {t(`txn.${tx.kind}`)}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {dateFmt.format(new Date(tx.at))}
                    </Typography>
                  </Box>
                </ListItem>
              );
            })}
            </List>
            {pageCount > 1 && (
              <Stack alignItems="center" sx={{ mt: 1.5 }}>
                <Pagination
                  count={pageCount}
                  page={page}
                  onChange={(_, p) => setPage(p)}
                  size="small"
                  color="primary"
                />
              </Stack>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
