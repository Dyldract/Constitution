import { NextResponse } from "next/server";
import { getRoomById, setVote } from "@/lib/store";
import type { VoteType } from "@/lib/types";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, playerId, type, index, value } = body;
    if (!roomId || !playerId || !type || value === undefined) {
      return NextResponse.json(
        { error: "roomId, playerId, type et value (booléen) requis" },
        { status: 400 }
      );
    }
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }
    const idx = typeof index === "number" ? index : parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return NextResponse.json({ error: "index invalide" }, { status: 400 });
    }
    const voteValue = value === true || value === "true" || value === 1;
    await setVote(roomId, playerId, type as VoteType, idx, voteValue);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le vote" },
      { status: 500 }
    );
  }
}
