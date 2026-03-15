import { NextResponse } from "next/server";
import { getRoomById, getChatMessages, addChatMessage } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }
    const messages = await getChatMessages(roomId);
    return NextResponse.json({ messages });
  } catch (e) {
    console.error("Erreur chat GET:", e);
    return NextResponse.json({ error: "Impossible de charger le chat" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }
    const body = await req.json().catch(() => ({}));
    const { playerId, text } = body;
    if (!playerId || typeof text !== "string" || !text.trim()) {
      return NextResponse.json(
        { error: "playerId et text requis" },
        { status: 400 }
      );
    }
    const message = await addChatMessage(roomId, playerId, text.trim().slice(0, 2000));
    return NextResponse.json(message);
  } catch (e) {
    console.error("Erreur chat POST:", e);
    return NextResponse.json({ error: "Impossible d'envoyer le message" }, { status: 500 });
  }
}
