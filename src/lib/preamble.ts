import type { Room } from "./types";

/**
 * Génère le préambule à partir du nom et des amendements adoptés.
 */
export function generatePreamble(room: Room): string {
  const name = room.resultName || "Constitution";
  const amendments = room.resultAmendments.filter(Boolean) as string[];

  const date = new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const intro = `Le peuple souverain, réuni pour fonder les bases de la nation, proclame solennellement la présente ${name}.`;

  const amendmentsSummary =
    amendments.length > 0
      ? `\n\n${amendments.length} amendement${amendments.length > 1 ? "s" : ""} complètent et précisent le cadre constitutionnel, afin d'assurer son adaptation et sa pérennité.`
      : "\n\nLes amendements adoptés par le peuple en précisent les principes et les modalités.";

  const closing = `\n\nAdoptée le ${date}, cette constitution est la loi suprême de la nation. En foi de quoi, les représentants du peuple l'ont établie et promulguée.`;

  return intro + amendmentsSummary + closing;
}
