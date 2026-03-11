import { NextResponse } from "next/server";
import { createRoom, addPlayer } from "@/lib/store";

export async function POST(req: Request) {
  try {
    let body: { playerName?: string; constitutionName?: string } = {};
    try {
      body = await req.json();
    } catch {
      // body vide ou invalide
    }
    const constitutionName = (body.constitutionName ?? "").toString().trim() || "Constitution";
    const playerName = (body.playerName ?? "Hôte").toString().trim() || "Hôte";

    const room = await createRoom(constitutionName);
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
    console.error("Erreur création salle:", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Impossible de créer la salle" },
      { status: 500 }
    );
  }
}
