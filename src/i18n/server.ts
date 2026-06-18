import { cookies } from "next/headers";
import { dictionaries } from "./dictionaries";
import {
  LOCALE_COOKIE,
  defaultLocale,
  isLocale,
  createT,
  type Locale,
  type TFunc,
} from "./config";

/** Read the current locale from the cookie (server only). Falls back to default. */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : defaultLocale;
}

/** Server-side translations for the current request. */
export async function getTranslations(): Promise<{ locale: Locale; t: TFunc }> {
  const locale = await getLocale();
  return { locale, t: createT(dictionaries[locale]) };
}
