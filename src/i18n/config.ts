// Lightweight i18n core: locale list, cookie name, dictionary type, t() factory.
// No [locale] routing — current locale lives in the NEXT_LOCALE cookie (set by
// next-language-selector), read on the server, passed into a client provider.

export const locales = [
  { code: "en", name: "EN" },
  { code: "ru", name: "RU" },
] as const;

export type Locale = (typeof locales)[number]["code"]; // "en" | "ru"

export const defaultLocale: Locale = "en";

// Must match next-language-selector's default cookie name.
export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && locales.some((l) => l.code === v);
}

// Best-effort: map a BCP-47 / language tag ("ru", "ru-RU", "en-US", "en_GB") to a
// supported locale, or null if unsupported. Used to guess the locale from the
// Telegram id_token `locale` claim and the browser's Accept-Language header.
export function localeFromTag(tag: string | undefined | null): Locale | null {
  if (!tag) return null;
  const code = tag.trim().toLowerCase().split(/[-_;,]/)[0];
  return locales.some((l) => l.code === code) ? (code as Locale) : null;
}

export type Dict = Record<string, string>;
export type TFunc = (
  key: string,
  vars?: Record<string, string | number>,
) => string;

export function createT(dict: Dict): TFunc {
  return (key, vars) => {
    let s = dict[key] ?? key;
    if (vars) {
      for (const [k, val] of Object.entries(vars)) {
        s = s.replaceAll(`{${k}}`, String(val));
      }
    }
    return s;
  };
}
