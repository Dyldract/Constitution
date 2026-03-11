import { NextResponse } from "next/server";
import { getRoomByCode, addPlayer } from "@/lib/store";

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
    const player = await addPlayer(room.id, (playerName || "").toString());
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
