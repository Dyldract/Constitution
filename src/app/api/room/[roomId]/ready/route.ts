import { NextResponse } from "next/server";
import {
  getRoomById,
  getPlayersInRoom,
  getVotes,
  getVotesByPlayer,
} from "@/lib/store";
import type { VoteType } from "@/lib/types";

const CLOSE_TYPE: VoteType = "close";
const CLOSE_INDEX = 0;

export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const { searchParams } = new URL(req.url);
  const playerId = searchParams.get("playerId");

  const room = await getRoomById(roomId);
  if (!room) {
    return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
  }

  const players = await getPlayersInRoom(roomId);
  const playersCount = players.length;
  const closeVotes = await getVotes(roomId, CLOSE_TYPE, CLOSE_INDEX);
  const readyCount = closeVotes.length;

  let myReady = false;
  if (playerId) {
    const myVotes = await getVotesByPlayer(roomId, playerId);
    myReady = myVotes.some((v) => v.type === CLOSE_TYPE);
  }

  return NextResponse.json({
    readyCount,
    playersCount,
    myReady,
    players: players.map((p) => ({ id: p.id, name: p.name })),
  });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;
    const body = await req.json();
    const { playerId, ready } = body as { playerId?: string; ready?: boolean };

    if (!playerId) {
      return NextResponse.json(
        { error: "playerId requis" },
        { status: 400 }
      );
    }

    const room = await getRoomById(roomId);
    if (!room) {
      return NextResponse.json({ error: "Salle introuvable" }, { status: 404 });
    }

    const players = await getPlayersInRoom(roomId);
    const playersCount = players.length;

    const client = (await import("@/lib/supabase")).getSupabase();

    if (ready) {
      // On garde l'information sous forme de lignes dédiées dans ready_votes
      await client
        .from("ready_votes")
        .delete()
        .match({ room_id: roomId, player_id: playerId });
      await client
        .from("ready_votes")
        .insert({
          room_id: roomId,
          player_id: playerId,
        });
    } else {
      await client
        .from("ready_votes")
        .delete()
        .match({ room_id: roomId, player_id: playerId });
    }

    const { data: rows, error } = await client
      .from("ready_votes")
      .select("player_id")
      .eq("room_id", roomId);
    if (error) throw error;
    const readyCount = rows?.length ?? 0;

    return NextResponse.json({
      readyCount,
      playersCount,
      myReady: Boolean(ready),
      players: players.map((p) => ({ id: p.id, name: p.name })),
    });
  } catch (e) {
    console.error("Erreur ready:", e);
    return NextResponse.json(
      { error: "Impossible de mettre à jour l'état de clôture" },
      { status: 500 }
    );
  }
}

