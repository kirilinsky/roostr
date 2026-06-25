"use client";

import { LanguageSelector } from "next-language-selector";
import Box from "@mui/material/Box";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { locales, defaultLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { useLocale } from "@/i18n/I18nProvider";

// next-language-selector handles the cookie write + reload; we only swap its UI via
// `renderCustom` for an on-brand MUI segmented toggle (🌐 EN | RU). The highlighted
// value tracks the locale the server actually resolved (provider), so it's correct
// even on first paint when the choice came from Accept-Language / Telegram, not a
// cookie.
export default function LocaleSwitcher() {
  const current = useLocale();

  return (
    <LanguageSelector
      locales={[...locales]}
      defaultLocale={defaultLocale}
      cookieName={LOCALE_COOKIE}
      autoReload
      renderCustom={({ onChange }) => (
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          <Box
            component="span"
            aria-hidden
            sx={{ fontSize: "0.9rem", opacity: 0.6 }}
          >
            🌐
          </Box>
          <ToggleButtonGroup
            value={current}
            exclusive
            size="small"
            aria-label="language"
            onChange={(_e, next: Locale | null) => {
              if (next && next !== current) onChange(next);
            }}
            sx={{
              "& .MuiToggleButton-root": {
                px: 1.25,
                py: 0.25,
                fontWeight: 700,
                fontSize: "0.75rem",
                lineHeight: 1.4,
                letterSpacing: "0.04em",
              },
            }}
          >
            {locales.map((l) => (
              <ToggleButton key={l.code} value={l.code}>
                {l.name}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>
      )}
    />
  );
}
