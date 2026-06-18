"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { createT, type Locale, type TFunc } from "@/i18n/config";
import { dictionaries } from "@/i18n/dictionaries";

interface I18nValue {
  locale: Locale;
  t: TFunc;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  const value = useMemo<I18nValue>(
    () => ({ locale, t: createT(dictionaries[locale]) }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used within I18nProvider");
  return ctx;
}

export function useT(): TFunc {
  return useI18n().t;
}

export function useLocale(): Locale {
  return useI18n().locale;
}
