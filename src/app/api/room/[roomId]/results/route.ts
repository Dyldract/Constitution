import { NextResponse } from "next/server";
import {
  getRoomById,
  getLatestProposal,
  getVotes,
  setRoomResults,
  setRoomPhase,
} from "@/lib/store";
import { generatePreamble } from "@/lib/preamble";
import { AMENDMENTS_COUNT } from "@/lib/types";
import { resolveLocale } from "@/lib/i18n";

function isAdopted(votes: { value: boolean }[]): boolean {
  if (votes.length === 0) return false;
  const yes = votes.filter((v) => v.value).length;
  return yes / votes.length > 0.5;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await req.json().catch(() => ({}));
    const locale = resolveLocale(
      typeof body?.locale === "string" ? body.locale : undefined
    );
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }

    if (room.phase === "amendments") {
      const resultAmendments: (string | null)[] = [];
      for (let i = 0; i < AMENDMENTS_COUNT; i++) {
        const proposal = await getLatestProposal(roomId, "amendment", i);
        const voteList = await getVotes(roomId, "amendment", i);
        if (proposal && isAdopted(voteList)) {
          resultAmendments.push(proposal.text);
        } else {
          resultAmendments.push(null);
        }
      }
      try {
        await setRoomResults(roomId, { resultAmendments });
      } catch (e) {
        console.warn("setRoomResults(resultAmendments) ignoré:", e);
      }
      const updatedRoom = await getRoomById(roomId);
      const roomForPreamble = updatedRoom ?? {
        ...room,
        resultAmendments,
        resultArticles: [],
      };
      const preamble = generatePreamble(roomForPreamble, locale);
      try {
        await setRoomResults(roomId, { preamble });
      } catch (e) {
        console.warn("setRoomResults(preamble) ignoré:", e);
      }
      try {
        await setRoomPhase(roomId, "done");
      } catch (e) {
        console.error("setRoomPhase échoué:", e);
        return NextResponse.json(
          { error: e instanceof Error ? e.message : "Impossible de passer en phase terminée" },
          { status: 500 }
        );
      }
      return NextResponse.json({
        phase: "done",
        resultAmendments,
        preamble,
      });
    }

    const currentPhase = room.phase ?? "(vide)";
    console.error(
      `[results] Phase inattendue pour la salle ${roomId}: "${currentPhase}" (type: ${typeof room.phase})`
    );
    return NextResponse.json(
      {
        error:
          currentPhase === "done"
            ? "La phase est déjà terminée. Créez une nouvelle salle pour recommencer."
            : `Phase invalide ou déjà terminée (phase actuelle: ${currentPhase}).`,
      },
      { status: 400 }
    );
  } catch (e) {
    console.error("Erreur clôture phase:", e);
    const message =
      e instanceof Error ? e.message : "Erreur lors de la clôture de la phase";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
