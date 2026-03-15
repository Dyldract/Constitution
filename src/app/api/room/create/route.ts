import { NextResponse } from "next/server";
import { createRoom, addPlayer } from "@/lib/store";

export async function POST(req: Request) {
  try {
    let body: { playerName?: string; constitutionName?: string; isPublic?: boolean } = {};
    try {
      body = await req.json();
    } catch {
      // body vide ou invalide
    }
    const constitutionName = (body.constitutionName ?? "").toString().trim() || "Constitution";
    const playerName = (body.playerName ?? "Hôte").toString().trim() || "Hôte";
    const isPublic = body.isPublic === true;

    const room = await createRoom(constitutionName, isPublic);
    const player = await addPlayer(room.id, playerName);

    // Vérifier que la salle a bien été créée
    if (!room.id || !room.code) {
      throw new Error("Erreur lors de la création de la salle");
    }

    return NextResponse.json({
      roomId: room.id,
      code: room.code,
      phase: room.phase,
      playerId: player.id,
    });
  } catch (e) {
    const err = e as { message?: string; details?: string; code?: string };
    const msg =
      err?.message ||
      (typeof e === "string" ? e : "Impossible de créer la salle");
    console.error("Erreur création salle:", e);
    return NextResponse.json(
      { error: msg, details: err?.details, code: err?.code },
      { status: 500 }
    );
  }
}
