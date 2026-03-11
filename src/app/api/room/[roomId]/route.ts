import { NextResponse } from "next/server";
import { getRoomById, getPlayersInRoom } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const room = await getRoomById(roomId);
  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }
  const players = await getPlayersInRoom(roomId);
  return NextResponse.json(
    {
      ...room,
      players: players.map((p) => ({ id: p.id, name: p.name })),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
        Pragma: "no-cache",
      },
    }
  );
}
