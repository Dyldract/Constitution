import type { Room } from "./types";
import { ARTICLES_COUNT, AMENDMENTS_COUNT } from "./types";

/**
 * Génère le préambule de la constitution à partir du nom, des articles et amendements adoptés.
 */
export function generatePreamble(room: Room): string {
  const name = room.resultName || "Constitution";
  const articles = room.resultArticles.filter(Boolean) as string[];
  const amendments = room.resultAmendments.filter(Boolean) as string[];

  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const intro = `Le peuple souverain, réuni pour fonder les bases de la nation, proclame solennellement la présente ${name}.`;

  const articlesSummary =
    articles.length > 0
      ? `\n\nLes principes fondamentaux, en ${articles.length} articles, établissent les droits et devoirs des citoyens, l'organisation des pouvoirs et les valeurs communes.`
      : "";

  const amendmentsSummary =
    amendments.length > 0
      ? `\n\n${amendments.length} amendement${amendments.length > 1 ? "s" : ""} complètent et précisent le cadre constitutionnel, afin d'assurer son adaptation et sa pérennité.`
      : "";

  const closing = `\n\nAdoptée le ${date}, cette constitution est la loi suprême de la nation. En foi de quoi, les représentants du peuple l'ont établie et promulguée.`;

  return intro + articlesSummary + amendmentsSummary + closing;
}
