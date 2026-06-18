"use client";

import { LanguageSelector } from "next-language-selector";
import { locales, defaultLocale, LOCALE_COOKIE } from "@/i18n/config";

// Client wrapper — the package has no "use client" directive of its own.
export default function LocaleSwitcher() {
  return (
    <LanguageSelector
      locales={[...locales]}
      defaultLocale={defaultLocale}
      cookieName={LOCALE_COOKIE}
      isDropdown
      autoReload
    />
  );
}
