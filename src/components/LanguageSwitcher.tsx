"use client";

import { LOCALES, localeLabels, type Locale } from "@/lib/i18n";
import { useLocale } from "./LocaleProvider";

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={`inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/80 p-1 ${className}`}
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((code: Locale) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            aria-pressed={active}
            className={`px-2.5 py-1 text-xs font-medium transition-colors rounded-md ${
              active
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            {localeLabels[code]}
          </button>
        );
      })}
    </div>
  );
}
