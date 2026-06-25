import { cookies, headers } from "next/headers";
import { dictionaries } from "./dictionaries";
import {
  LOCALE_COOKIE,
  defaultLocale,
  isLocale,
  localeFromTag,
  createT,
  type Locale,
  type TFunc,
} from "./config";

/**
 * Current locale (server only). Priority: explicit choice (NEXT_LOCALE cookie) →
 * browser system language (Accept-Language header) → default. The cookie is set
 * by the locale switcher and, on first Telegram login, from the id_token locale.
 */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  if (isLocale(v)) return v;
  const accept = (await headers()).get("accept-language");
  return localeFromTag(accept) ?? defaultLocale;
}

/** Server-side translations for the current request. */
export async function getTranslations(): Promise<{ locale: Locale; t: TFunc }> {
  const locale = await getLocale();
  return { locale, t: createT(dictionaries[locale]) };
}
