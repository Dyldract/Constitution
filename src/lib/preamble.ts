import type { Room } from "./types";
import { DEFAULT_LOCALE, getDictionary, type Locale } from "./i18n";

/**
 * Génère le préambule à partir du nom et des amendements adoptés.
 */
export function generatePreamble(
  room: Pick<Room, "resultName" | "resultAmendments">,
  locale: Locale = DEFAULT_LOCALE
): string {
  const t = getDictionary(locale).preamble;
  const name = room.resultName || t.defaultName;
  const amendments = room.resultAmendments.filter(Boolean) as string[];

  const dateLocale = locale === "en" ? "en-US" : "fr-FR";
  const date = new Date().toLocaleDateString(dateLocale, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const intro = t.intro(name);

  const amendmentsSummary =
    amendments.length > 0
      ? t.amendmentsSummary(amendments.length)
      : t.amendmentsFallback;

  const closing = t.closing(date);

  return intro + amendmentsSummary + closing;
}
