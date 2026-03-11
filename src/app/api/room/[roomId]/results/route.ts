import { NextResponse } from "next/server";
import {
  getRoomById,
  getLatestProposal,
  getVotes,
  setRoomResults,
  setRoomPhase,
} from "@/lib/store";
import { generatePreamble } from "@/lib/preamble";
import { ARTICLES_COUNT, AMENDMENTS_COUNT } from "@/lib/types";

function isAdopted(votes: { value: boolean }[]): boolean {
  if (votes.length === 0) return false;
  const yes = votes.filter((v) => v.value).length;
  return yes / votes.length > 0.5;
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }

    if (room.phase === "articles") {
      const resultArticles: (string | null)[] = [];
      for (let i = 0; i < ARTICLES_COUNT; i++) {
        const proposal = await getLatestProposal(roomId, "article", i);
        const voteList = await getVotes(roomId, "article", i);
        if (proposal && isAdopted(voteList)) {
          resultArticles.push(proposal.text);
        } else {
          resultArticles.push(null);
        }
      }
      await setRoomResults(roomId, { resultArticles });
      await setRoomPhase(roomId, "amendments");
      return NextResponse.json({ phase: "amendments", resultArticles });
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
      await setRoomResults(roomId, { resultAmendments });
      const updatedRoom = await getRoomById(roomId);
      if (!updatedRoom) {
        return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
      }
      const preamble = generatePreamble(updatedRoom);
      await setRoomResults(roomId, { preamble });
      await setRoomPhase(roomId, "done");
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
