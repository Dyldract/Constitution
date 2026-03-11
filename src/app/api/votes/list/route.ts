import { NextResponse } from "next/server";
import { getRoomById, getVotes, getVotesByPlayer } from "@/lib/store";
import type { ProposalType } from "@/lib/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  const type = searchParams.get("type") as ProposalType | null;
  const indexStr = searchParams.get("index");
  const playerId = searchParams.get("playerId");
  if (!roomId) {
    return NextResponse.json({ error: "roomId requis" }, { status: 400 });
  }
  const room = await getRoomById(roomId);
  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }
  let list: { type: ProposalType; index: number; value: boolean }[];
  if (playerId) {
    list = (await getVotesByPlayer(roomId, playerId)).map((v) => ({
      type: v.type,
      index: v.index,
      value: v.value,
    }));
  } else {
    if (!type) {
      return NextResponse.json(
        { error: "type requis si playerId non fourni" },
        { status: 400 }
      );
    }
    const index = indexStr != null ? parseInt(indexStr, 10) : undefined;
    list = (await getVotes(roomId, type, index)).map((v) => ({
      type: v.type,
      index: v.index,
      value: v.value,
    }));
  }
  return NextResponse.json({ votes: list });
}
