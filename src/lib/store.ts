import { nanoid } from "nanoid";
import { getSupabase } from "./supabase";
import type { Room, Player, Proposal, Vote, ProposalType, ChatMessage } from "./types";
import { AMENDMENTS_COUNT } from "./types";

// Types pour les lignes Supabase (snake_case + index_)
type RoomRow = {
  id: string;
  code: string;
  phase: string;
  created_at: string;
  is_public: boolean;
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
  index?: number;
  index_?: number;
  text: string;
  author_id?: string;
  author_name?: string;
  created_at: string;
};
type VoteRow = {
  id: string;
  room_id: string;
  player_id: string;
  type: string;
  index?: number;
  index_?: number;
  value: boolean;
  created_at: string;
};

/** Normalise la phase lue depuis la DB */
function normalizePhase(raw: unknown): Room["phase"] {
  const s = String(raw ?? "").toLowerCase();
  if (s === "done") return "done";
  return "amendments";
}

function rowToRoom(r: RoomRow): Room {
  const raw = (r as Record<string, unknown>).phase ?? (r as Record<string, unknown>).Phase;
  const isPublic = (r as Record<string, unknown>).is_public === true;
  return {
    id: r.id,
    code: r.code,
    phase: normalizePhase(raw),
    createdAt: new Date(r.created_at).getTime(),
    isPublic: Boolean(isPublic),
    resultName: r.result_name,
    resultArticles: r.result_articles ?? [],
    resultAmendments: r.result_amendments ?? [],
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
  const idx = r.index ?? r.index_;
  const authorId = (r as Record<string, unknown>).author_id ?? "";
  const authorName = (r as Record<string, unknown>).author_name as string | undefined;
  return {
    id: r.id,
    roomId: r.room_id,
    type: r.type as Proposal["type"],
    index: typeof idx === "number" ? idx : 0,
    text: r.text,
    authorId: String(authorId),
    authorName: authorName ?? undefined,
    createdAt: new Date(r.created_at).getTime(),
  };
}
function rowToVote(r: VoteRow): Vote {
  const idx = r.index ?? r.index_;
  return {
    id: r.id,
    roomId: r.room_id,
    playerId: r.player_id,
    type: r.type as Vote["type"],
    index: typeof idx === "number" ? idx : 0,
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

export async function createRoom(constitutionName: string, isPublic: boolean = false): Promise<Room> {
  const code = await generateCode();
  const name = (constitutionName || "Constitution").toString().trim() || "Constitution";
  const resultAmendments = Array(AMENDMENTS_COUNT).fill(null);

  const { data, error } = await getSupabase()
    .from("rooms")
    .insert({
      code,
      phase: "amendments",
      is_public: isPublic,
      result_name: name,
      result_articles: [],
      result_amendments: resultAmendments,
      preamble: null,
    })
    .select()
    .single();

  if (error) throw error;
  return rowToRoom(data as RoomRow);
}

/** Salles publiques avec nombre de participants */
export async function getPublicRooms(): Promise<
  { id: string; code: string; resultName: string; phase: Room["phase"]; playersCount: number }[]
> {
  const { data: rooms, error: roomsError } = await getSupabase()
    .from("rooms")
    .select("id, code, result_name, phase")
    .eq("is_public", true)
    .order("created_at", { ascending: false });
  if (roomsError) throw roomsError;
  if (!rooms?.length) return [];
  const ids = rooms.map((r: { id: string }) => r.id);
  const { data: counts } = await getSupabase()
    .from("players")
    .select("room_id")
    .in("room_id", ids);
  const countByRoom: Record<string, number> = {};
  for (const id of ids) countByRoom[id] = 0;
  for (const row of counts ?? []) {
    const rid = (row as { room_id: string }).room_id;
    if (rid in countByRoom) countByRoom[rid]++;
  }
  type PublicRoomRow = { id: string; code: string; result_name: string; phase: string };
  return (rooms as PublicRoomRow[]).map((r) => ({
    id: r.id,
    code: r.code,
    resultName: r.result_name,
    phase: normalizePhase(r.phase),
    playersCount: countByRoom[r.id] ?? 0,
  }));
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
  const player = await getPlayer(authorId);
  const authorName = player?.name ?? "Anonyme";
  const cleanText = text.trim();

  const { data, error } = await getSupabase()
    .from("proposals")
    .insert({
      room_id: roomId,
      type,
      index,
      text: cleanText,
      author_name: authorName,
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
  if (index !== undefined) query = query.eq("index", index);
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
    .match({ room_id: roomId, player_id: playerId, type, index });

  const { error } = await getSupabase().from("votes").insert({
    id: nanoid(),
    room_id: roomId,
    player_id: playerId,
    type,
    index,
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
  if (index !== undefined) query = query.eq("index", index);
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

// --- Chat ---
type ChatMessageRow = { id: string; room_id: string; player_id: string; text: string; created_at: string };

export async function addChatMessage(roomId: string, playerId: string, text: string): Promise<ChatMessage> {
  const id = nanoid();
  const { data, error } = await getSupabase()
    .from("chat_messages")
    .insert({ id, room_id: roomId, player_id: playerId, text: text.trim() })
    .select()
    .single();
  if (error) throw error;
  const row = data as ChatMessageRow;
  const player = await getPlayer(playerId);
  return {
    id: row.id,
    roomId: row.room_id,
    playerId: row.player_id,
    playerName: player?.name,
    text: row.text,
    createdAt: new Date(row.created_at).getTime(),
  };
}

export async function getChatMessages(roomId: string): Promise<ChatMessage[]> {
  const { data: rows, error } = await getSupabase()
    .from("chat_messages")
    .select("*")
    .eq("room_id", roomId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows?.length) return [];
  const playerIds = Array.from(new Set((rows as ChatMessageRow[]).map((r) => r.player_id)));
  const players = await Promise.all(playerIds.map((id) => getPlayer(id)));
  const nameById: Record<string, string> = {};
  playerIds.forEach((id, i) => {
    nameById[id] = players[i]?.name ?? "?";
  });
  return (rows as ChatMessageRow[]).map((r) => ({
    id: r.id,
    roomId: r.room_id,
    playerId: r.player_id,
    playerName: nameById[r.player_id],
    text: r.text,
    createdAt: new Date(r.created_at).getTime(),
  }));
}
