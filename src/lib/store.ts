import { nanoid } from "nanoid";
import { getSupabase } from "./supabase";
import type { Room, Player, Proposal, Vote, ProposalType } from "./types";
import { ARTICLES_COUNT, AMENDMENTS_COUNT } from "./types";

// Types pour les lignes Supabase (snake_case + index_)
type RoomRow = {
  id: string;
  code: string;
  phase: string;
  created_at: string;
  result_name: string;
  result_articles: (string | null)[];
  result_amendments: (string | null)[];
  preamble: string | null;
};
type PlayerRow = { id: string; room_id: string; name: string; joined_at: string };
type ProposalRow = {
  id: string;
  room_id: string;
  type: string;
  index_: number;
  text: string;
  author_id: string;
  created_at: string;
};
type VoteRow = {
  id: string;
  room_id: string;
  player_id: string;
  type: string;
  index_: number;
  value: boolean;
  created_at: string;
};

/** Normalise la phase lue depuis la DB (casse ou clé différente possible avec PostgREST) */
function normalizePhase(raw: unknown): Room["phase"] {
  const s = String(raw ?? "").toLowerCase();
  if (s === "amendments") return "amendments";
  if (s === "done") return "done";
  return "articles";
}

function rowToRoom(r: RoomRow): Room {
  const raw = (r as Record<string, unknown>).phase ?? (r as Record<string, unknown>).Phase;
  return {
    id: r.id,
    code: r.code,
    phase: normalizePhase(raw),
    createdAt: new Date(r.created_at).getTime(),
    resultName: r.result_name,
    resultArticles: r.result_articles,
    resultAmendments: r.result_amendments,
    preamble: r.preamble,
  };
}
function rowToPlayer(r: PlayerRow): Player {
  return {
    id: r.id,
    name: r.name,
    roomId: r.room_id,
    joinedAt: new Date(r.joined_at).getTime(),
  };
}
function rowToProposal(r: ProposalRow): Proposal {
  return {
    id: r.id,
    roomId: r.room_id,
    type: r.type as Proposal["type"],
    index: r.index_,
    text: r.text,
    authorId: r.author_id,
    createdAt: new Date(r.created_at).getTime(),
  };
}
function rowToVote(r: VoteRow): Vote {
  return {
    id: r.id,
    roomId: r.room_id,
    playerId: r.player_id,
    type: r.type as Vote["type"],
    index: r.index_,
    value: r.value,
    createdAt: new Date(r.created_at).getTime(),
  };
}

async function generateCode(): Promise<string> {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++)
    code += chars[Math.floor(Math.random() * chars.length)];
  const { data } = await getSupabase().from("rooms").select("id").eq("code", code).maybeSingle();
  if (data) return generateCode();
  return code;
}

export async function createRoom(constitutionName: string): Promise<Room> {
  const id = nanoid();
  const code = await generateCode();
  const name = (constitutionName || "Constitution").toString().trim() || "Constitution";
  const resultArticles = Array(ARTICLES_COUNT).fill(null);
  const resultAmendments = Array(AMENDMENTS_COUNT).fill(null);

  const { data, error } = await getSupabase()
    .from("rooms")
    .insert({
      id,
      code,
      phase: "articles",
      result_name: name,
      result_articles: resultArticles,
      result_amendments: resultAmendments,
      preamble: null,
    })
    .select()
    .single();

  if (error) throw error;
  // Forcer phase = articles juste après création (annule tout défaut/trigger en base)
  await getSupabase()
    .from("rooms")
    .update({ phase: "articles" })
    .eq("id", id)
    .select("id")
    .single();
  return rowToRoom({ ...(data as RoomRow), phase: "articles" });
}

export async function getRoomById(id: string): Promise<Room | null> {
  const { data, error } = await getSupabase().from("rooms").select("*").eq("id", id).single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToRoom(data as RoomRow) : null;
}

export async function getRoomByCode(code: string): Promise<Room | null> {
  const { data, error } = await getSupabase()
    .from("rooms")
    .select("*")
    .eq("code", code.trim().toUpperCase())
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToRoom(data as RoomRow) : null;
}

export async function addPlayer(roomId: string, playerName: string): Promise<Player> {
  const room = await getRoomById(roomId);
  if (!room) throw new Error("Salle introuvable");
  const id = nanoid();
  const name = (playerName || "Joueur").toString().trim() || "Joueur";

  const { data, error } = await getSupabase()
    .from("players")
    .insert({ id, room_id: roomId, name })
    .select()
    .single();

  if (error) throw error;
  return rowToPlayer(data as PlayerRow);
}

export async function getPlayersInRoom(roomId: string): Promise<Player[]> {
  const { data, error } = await getSupabase()
    .from("players")
    .select("*")
    .eq("room_id", roomId)
    .order("joined_at", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((r) => rowToPlayer(r as PlayerRow));
}

export async function addProposal(
  roomId: string,
  type: Proposal["type"],
  index: number,
  text: string,
  authorId: string
): Promise<Proposal> {
  const room = await getRoomById(roomId);
  if (!room) throw new Error("Salle introuvable");
  const id = nanoid();
  const cleanText = text.trim();

  const { data, error } = await getSupabase()
    .from("proposals")
    .insert({
      id,
      room_id: roomId,
      type,
      index_: index,
      text: cleanText,
      author_id: authorId,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToProposal(data as ProposalRow);
}

export async function getProposals(
  roomId: string,
  type: Proposal["type"],
  index?: number
): Promise<Proposal[]> {
  let query = getSupabase()
    .from("proposals")
    .select("*")
    .eq("room_id", roomId)
    .eq("type", type)
    .order("created_at", { ascending: true });
  if (index !== undefined) query = query.eq("index_", index);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => rowToProposal(r as ProposalRow));
}

/** Dernière proposition (par date) pour un (type, index) = texte soumis au vote */
export async function getLatestProposal(
  roomId: string,
  type: Proposal["type"],
  index: number
): Promise<Proposal | null> {
  const list = await getProposals(roomId, type, index);
  return list.length > 0 ? list[list.length - 1]! : null;
}

export async function setVote(
  roomId: string,
  playerId: string,
  type: ProposalType,
  index: number,
  value: boolean
): Promise<void> {
  const room = await getRoomById(roomId);
  if (!room) throw new Error("Salle introuvable");

  await getSupabase()
    .from("votes")
    .delete()
    .match({ room_id: roomId, player_id: playerId, type, index_: index });

  const { error } = await getSupabase().from("votes").insert({
    id: nanoid(),
    room_id: roomId,
    player_id: playerId,
    type,
    index_: index,
    value,
  });
  if (error) throw error;
}

export async function getVotes(
  roomId: string,
  type: Vote["type"],
  index?: number
): Promise<Vote[]> {
  let query = getSupabase()
    .from("votes")
    .select("*")
    .eq("room_id", roomId)
    .eq("type", type)
    .order("created_at", { ascending: true });
  if (index !== undefined) query = query.eq("index_", index);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => rowToVote(r as VoteRow));
}

export async function getVotesByPlayer(roomId: string, playerId: string): Promise<Vote[]> {
  const { data, error } = await getSupabase()
    .from("votes")
    .select("*")
    .eq("room_id", roomId)
    .eq("player_id", playerId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => rowToVote(r as VoteRow));
}

export async function setRoomPhase(roomId: string, phase: Room["phase"]): Promise<void> {
  const room = await getRoomById(roomId);
  if (!room) throw new Error("Salle introuvable");
  const { data, error } = await getSupabase()
    .from("rooms")
    .update({ phase })
    .eq("id", roomId)
    .select("id")
    .single();
  if (error) throw error;
  if (!data)
    throw new Error(
      "La phase n'a pas pu être mise à jour (vérifier les policies RLS sur la table rooms)."
    );
}

export async function setRoomResults(
  roomId: string,
  results: Partial<
    Pick<Room, "resultName" | "resultArticles" | "resultAmendments" | "preamble">
  >
): Promise<void> {
  const room = await getRoomById(roomId);
  if (!room) throw new Error("Salle introuvable");

  const updates: Record<string, unknown> = {};
  if (results.resultName !== undefined) updates.result_name = results.resultName;
  if (results.resultArticles !== undefined) updates.result_articles = results.resultArticles;
  if (results.resultAmendments !== undefined)
    updates.result_amendments = results.resultAmendments;
  if (results.preamble !== undefined) updates.preamble = results.preamble;
  if (Object.keys(updates).length === 0) return;

  const { data, error } = await getSupabase()
    .from("rooms")
    .update(updates)
    .eq("id", roomId)
    .select("id")
    .single();
  if (error) throw error;
  if (!data)
    throw new Error(
      "Les résultats n'ont pas pu être enregistrés (vérifier les policies RLS sur la table rooms)."
    );
}

export async function getPlayer(playerId: string): Promise<Player | null> {
  const { data, error } = await getSupabase()
    .from("players")
    .select("*")
    .eq("id", playerId)
    .single();
  if (error) {
    if (error.code === "PGRST116") return null;
    throw error;
  }
  return data ? rowToPlayer(data as PlayerRow) : null;
}
