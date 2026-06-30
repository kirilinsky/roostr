"use client";

import Link from "next/link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import SynthGeneIcon from "@/components/SynthGeneIcon";
import { SYNTH_GENE_BY_ID } from "@/lib/roostr";
import type { SynthGeneNotification } from "@/db/queries";
import { useLocale, useT } from "@/i18n/I18nProvider";
import { BREED_NAME, EmptyNotice, unreadSx, usePager } from "./shared";
import { useNotifActions } from "@/hooks/useNotifActions";

// "Gene X spliced into bird Y" — one row per successful synth-gene purchase,
// links to the bird. Read mark key `synth:<id>`.
export default function SynthGeneList({
  events,
}: {
  events: SynthGeneNotification[];
}) {
  const t = useT();
  const locale = useLocale();
  const { markReadAsync, readBtn } = useNotifActions();
  const { paged, pager } = usePager(events);
  if (events.length === 0) return <EmptyNotice />;

  return (
    <>
      <List disablePadding>
        {paged.map((e) => {
          const gene = SYNTH_GENE_BY_ID[e.geneId];
          const geneName = gene ? gene.name[locale] : e.geneId;
          const bird = e.nickname || (BREED_NAME[e.breedId]?.[locale] ?? e.breedId);
          return (
            <ListItem
              key={e.id}
              divider
              sx={[{ px: 0, gap: 1.5, flexWrap: "wrap" }, unreadSx(e.unread)]}
            >
              {gene && <SynthGeneIcon no={gene.no} size={40} />}
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  🧬 {t("notifications.synthApplied", { gene: geneName, bird })}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(e.at).toLocaleDateString(locale)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  component={Link}
                  href={`/collection/${e.roostrId}`}
                  size="small"
                  variant="outlined"
                  onClick={() => markReadAsync(`synth:${e.id}`)}
                >
                  {t("notifications.viewRooster")}
                </Button>
                {e.unread && readBtn(`synth:${e.id}`)}
              </Stack>
            </ListItem>
          );
        })}
      </List>
      {pager}
    </>
  );
}
