import { NextResponse } from "next/server";
import { getRoomByCode, addPlayer, findPlayerInRoomByName } from "@/lib/store";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { code, playerName } = body;
    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Code de salle requis" }, { status: 400 });
    }
    const room = await getRoomByCode(code.trim());
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable. Vérifiez le code." }, { status: 404 });
    }
    const name = (playerName || "").toString().trim();
    if (!name) {
      return NextResponse.json({ error: "Nom de joueur requis" }, { status: 400 });
    }

    // Si un joueur avec ce nom existe déjà dans la salle, on le réutilise
    const existing = await findPlayerInRoomByName(room.id, name);
    const player = existing ?? (await addPlayer(room.id, name));

    return NextResponse.json({
      roomId: room.id,
      code: room.code,
      playerId: player.id,
      playerName: player.name,
      phase: room.phase,
    });
  } catch (e) {
    return NextResponse.json({ error: "Impossible de rejoindre" }, { status: 500 });
  }
}
