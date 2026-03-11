import { NextResponse } from "next/server";
import { getRoomById, addProposal, getProposals } from "@/lib/store";
import type { ProposalType } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const type = searchParams.get("type") as ProposalType | null;
  const indexStr = searchParams.get("index");
  if (!roomId) {
    return NextResponse.json({ error: "roomId requis" }, { status: 400 });
  }
  const room = await getRoomById(roomId);
  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }
  const index = indexStr != null ? parseInt(indexStr, 10) : undefined;
  if (indexStr != null && (isNaN(index!) || index! < 0)) {
    return NextResponse.json({ error: "index invalide" }, { status: 400 });
  }
  const list = await getProposals(roomId, type || "article", index);
  return NextResponse.json({ proposals: list });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomId, playerId, type, index, text } = body;
    if (!roomId || !playerId || type === undefined || text === undefined) {
      return NextResponse.json(
        { error: "roomId, playerId, type et text requis" },
        { status: 400 }
      );
    }
    if (type !== "article" && type !== "amendment") {
      return NextResponse.json({ error: "type doit être article ou amendment" }, { status: 400 });
    }
    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }
    const idx = typeof index === "number" ? index : parseInt(index, 10);
    if (isNaN(idx) || idx < 0) {
      return NextResponse.json({ error: "index invalide" }, { status: 400 });
    }
    const proposal = await addProposal(roomId, type as ProposalType, idx, String(text).trim(), playerId);
    return NextResponse.json(proposal);
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Impossible d'ajouter la proposition" },
      { status: 500 }
    );
  }
}
