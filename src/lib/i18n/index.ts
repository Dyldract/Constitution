import { en } from "./en";
import { fr } from "./fr";
import {
  DEFAULT_LOCALE,
  type Dictionary,
  type Locale,
  LOCALES,
} from "./types";

export type { Dictionary, Locale };
export { DEFAULT_LOCALE, LOCALES, LOCALE_STORAGE_KEY } from "./types";

const dictionaries: Record<Locale, Dictionary> = { fr, en };

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "fr" || value === "en";
}

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[DEFAULT_LOCALE];
}

export function resolveLocale(
  value: string | null | undefined
): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export const localeLabels: Record<Locale, string> = {
  fr: "Français",
  en: "English",
};
