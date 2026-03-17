"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AMENDMENTS_COUNT } from "@/lib/types";
import type { Room as RoomType, Proposal, ChatMessage } from "@/lib/types";

type Phase = RoomType["phase"];

function RoomPageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "";
  const playerId = searchParams.get("playerId") ?? "";

  const [room, setRoom] = useState<RoomType | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [proposals, setProposals] = useState<Record<string, Proposal[]>>({});
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [newAmendment, setNewAmendment] = useState<Record<number, string>>({});
  const [closing, setClosing] = useState(false);
  const [votingKey, setVotingKey] = useState<string | null>(null);
  const [readyCount, setReadyCount] = useState(0);
  const [iAmReady, setIAmReady] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const fetchRoom = useCallback(async () => {
    if (!roomId || roomNotFound) return;
    try {
      const res = await fetch(`/api/room/${roomId}?_=${Date.now()}`, {
        cache: "no-store",
        headers: { Pragma: "no-cache", "Cache-Control": "no-cache" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 404) {
          setRoomNotFound(true);
          setError("Salle introuvable. Elle a peut-être été supprimée ou le serveur a redémarré.");
          return;
        }
        throw new Error(data.error || "Erreur lors du chargement");
      }
      const data = await res.json();
      // Ne pas écraser par une phase "en arrière" (ex. cache renvoie "articles" alors qu'on est en "amendments")
      setRoom((prev) => {
        if (!prev) return data;
        const order = (p: string) => (p === "done" ? 2 : 1);
        const next =
          order(data.phase) < order(prev.phase)
            ? prev
            : data;
        // Si la phase est déjà terminée côté client avec des résultats,
        // ne pas les effacer si la réponse serveur ne les contient pas encore.
        if (
          prev.phase === "done" &&
          next.phase === "done" &&
          (next.resultAmendments == null || next.resultAmendments.length === 0) &&
          prev.resultAmendments?.some((x) => x)
        ) {
          return {
            ...next,
            resultAmendments: prev.resultAmendments,
            preamble: prev.preamble ?? next.preamble,
          };
        }
        return next;
      });
      setPlayers(data.players ?? []);
      setError("");
      setRoomNotFound(false);
    } catch (e) {
      if (!roomNotFound) {
        setError(e instanceof Error ? e.message : "Erreur de connexion");
      }
    } finally {
      setLoading(false);
    }
  }, [roomId, roomNotFound]);

  const fetchProposals = useCallback(
    async (type: "amendment", index?: number) => {
      if (!roomId) return;
      const url =
        `/api/proposals?roomId=${roomId}&type=${type}` +
        (index != null ? `&index=${index}` : "");
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      if (index != null)
        setProposals((p) => ({ ...p, [`${type}-${index}`]: data.proposals ?? [] }));
      else setProposals((p) => ({ ...p, [type]: data.proposals ?? [] }));
    },
    [roomId]
  );

  useEffect(() => {
    fetchRoom();
    if (roomNotFound) return; // Arrêter le polling si la salle n'existe pas
    const t = setInterval(fetchRoom, 3000);
    return () => clearInterval(t);
  }, [fetchRoom, roomNotFound]);

  useEffect(() => {
    if (!roomId || !playerId) return;
    fetch(`/api/votes/list?roomId=${roomId}&playerId=${playerId}`)
      .then((r) => r.json())
      .then((data) => {
        const v: Record<string, boolean> = {};
        for (const x of data.votes || [])
          v[`${x.type}-${x.index}`] = x.value === true;
        setVotes(v);
      })
      .catch(() => {});
  }, [roomId, playerId]);

  // État "prêt à clôturer" (lecture initiale)
  useEffect(() => {
    if (!roomId || !playerId || !room || room.phase !== "amendments") return;
    fetch(`/api/room/${roomId}/ready?playerId=${playerId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        setReadyCount(data.readyCount ?? 0);
        if (Array.isArray(data.players)) {
          setPlayers(data.players);
        }
        setIAmReady(Boolean(data.myReady));
      })
      .catch(() => {});
  }, [roomId, playerId, room?.phase]);

  useEffect(() => {
    if (!room) return;
    if (room.phase === "amendments") {
      for (let i = 0; i < AMENDMENTS_COUNT; i++) fetchProposals("amendment", i);
    }
  }, [room?.phase, roomId, fetchProposals]);

  const fetchChat = useCallback(async () => {
    if (!roomId) return;
    try {
      const res = await fetch(`/api/room/${roomId}/chat`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages ?? []);
      }
    } catch {
      // ignore
    }
  }, [roomId]);

  useEffect(() => {
    if (!roomId || (room?.phase !== "amendments" && room?.phase !== "done")) return;
    fetchChat();
    const t = setInterval(fetchChat, 4000);
    return () => clearInterval(t);
  }, [roomId, room?.phase, fetchChat]);

  async function addProposal(index: number, text: string) {
    if (!roomId || !playerId || !text.trim()) return;
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        playerId,
        type: "amendment",
        index,
        text: text.trim(),
      }),
    });
    if (!res.ok) return;
    fetchProposals("amendment", index);
    setNewAmendment((a) => ({ ...a, [index]: "" }));
  }

  async function sendChatMessage() {
    if (!roomId || !playerId || !chatInput.trim() || sendingChat) return;
    setSendingChat(true);
    try {
      const res = await fetch(`/api/room/${roomId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, text: chatInput.trim() }),
      });
      if (res.ok) {
        const msg = await res.json();
        setChatMessages((m) => [...m, msg]);
        setChatInput("");
      }
    } finally {
      setSendingChat(false);
    }
  }

  async function vote(type: "amendment", index: number, value: boolean) {
    if (!roomId || !playerId) return;
    const key = `${type}-${index}`;
    if (votingKey === key) return;
    setVotingKey(key);
    try {
      const res = await fetch("/api/votes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, playerId, type, index, value }),
      });
      if (res.ok) {
        setVotes((v) => ({ ...v, [key]: value }));
        // Rafraîchir le nombre de votes pour cet amendement
        fetchVoteCount(index);
      }
    } finally {
      setVotingKey(null);
    }
  }

  async function closePhase() {
    if (!roomId) return;
    setClosing(true);
    setError("");
    try {
      const res = await fetch(`/api/room/${roomId}/results`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      setError("");
      if (data.phase === "done") {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                phase: "done",
                resultAmendments: data.resultAmendments ?? prev.resultAmendments,
                preamble: data.preamble ?? prev.preamble,
              }
            : prev
        );
      }
      // Ne pas appeler fetchRoom() ici : en prod (Vercel) le GET peut être en cache
      // et écraser la phase qu'on vient de mettre à jour. Le polling (3s) resynchronisera.
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setClosing(false);
    }
  }

  async function fetchVoteCount(index: number) {
    if (!roomId) return;
    try {
      const res = await fetch(
        `/api/votes/list?roomId=${roomId}&type=amendment&index=${index}`,
        { cache: "no-store" }
      );
      if (!res.ok) return;
      const data = await res.json();
      const count = Array.isArray(data.votes) ? data.votes.length : 0;
      setVoteCounts((c) => ({ ...c, [`amendment-${index}`]: count }));
    } catch {
      // ignore
    }
  }

  async function toggleReady() {
    if (!roomId || !playerId || !room || room.phase !== "amendments") return;
    try {
      const res = await fetch(`/api/room/${roomId}/ready`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId, ready: !iAmReady }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Erreur");
      setReadyCount(data.readyCount ?? 0);
      setIAmReady(Boolean(data.myReady));
      if (Array.isArray(data.players)) {
        setPlayers(data.players);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    }
  }

  if (loading && !room && !roomNotFound) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-400">Chargement…</p>
      </div>
    );
  }

  if (roomNotFound || (!loading && !room && error)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="card text-center max-w-md">
          <p className="text-red-400 mb-4">{error || "Salle introuvable"}</p>
          <p className="text-slate-400 text-sm mb-4">
            Les salles sont stockées en mémoire et peuvent être perdues si le serveur redémarre.
            Veuillez créer une nouvelle salle.
          </p>
          <Link href="/" className="btn btn-secondary">
            Retour à l&#39;accueil
          </Link>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <p className="text-slate-400">Chargement…</p>
      </div>
    );
  }

  const phase = room.phase;

  if (!playerId && phase !== "done") {
    return (
      <div className="min-h-screen p-6 flex flex-col items-center justify-center">
        <div className="card max-w-sm w-full text-center">
          <p className="text-slate-400 mb-4">
            Entrez votre nom pour participer aux votes dans cette salle.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.querySelector(
                'input[name="name"]'
              ) as HTMLInputElement | null;
              const name = input?.value.trim() || "";
              if (!name) {
                input?.focus();
                return;
              }
              const res = await fetch("/api/room/join", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code: room.code, playerName: name }),
              });
              const data = await res.json();
              if (res.ok && data.playerId) {
                window.location.href = `/room?roomId=${roomId}&playerId=${data.playerId}`;
              }
            }}
            className="space-y-3"
          >
            <input
              type="text"
              name="name"
              placeholder="Votre nom"
              className="input"
            />
            <button type="submit" className="btn btn-primary w-full">
              Rejoindre
            </button>
          </form>
          <Link
            href="/"
            className="block mt-4 text-slate-400 hover:text-white text-sm"
          >
            Retour à l&#39;accueil
          </Link>
        </div>
      </div>
    );
  }

  const adoptedAmendments = room.resultAmendments.filter(Boolean) as string[];
  const showChat = phase === "amendments" || phase === "done";
  const playersCount = players.length;

  return (
    <div className="min-h-screen p-6 pb-20 bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center">
      <header className="w-full max-w-4xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4">
        <Link href="/" className="text-slate-400 hover:text-white">
          ← Accueil
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-slate-400">Code :</span>
          <span className="font-mono text-xl font-bold text-white tracking-widest bg-slate-800 px-3 py-1 rounded">
            {room.code}
          </span>
        </div>
        <span className="text-slate-400">
          Phase : {phase === "amendments" ? "Amendements" : "Terminé"}
        </span>
      </header>

      <div
        className={`w-full mx-auto space-y-8 flex flex-col items-start ${
          showChat
            ? "lg:grid lg:grid-cols-[30%_30%_30%] lg:gap-8 lg:justify-center"
            : ""
        }`}
      >
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {/* Liste des joueurs */}
        {(phase === "amendments" || phase === "done") && (
          <aside className="card w-full max-h-[20rem] overflow-y-auto mb-4 lg:mb-0 lg:flex lg:flex-col lg:justify-center">
            <h3 className="font-semibold mb-2 text-slate-200">
              Joueurs ({playersCount})
            </h3>
            {playersCount === 0 ? (
              <p className="text-slate-500 text-sm">Aucun joueur pour le moment.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {players.map((p) => (
                  <li key={p.id} className="text-slate-200">
                    {p.name}
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        <div
          className={`w-full ${
            showChat ? "lg:flex lg:flex-col lg:justify-center" : "max-w-4xl"
          }`}
        >
        {phase === "amendments" && (
          <section className="space-y-8 w-full">
            <h2 className="text-2xl font-semibold">Les 30 amendements</h2>
            <p className="text-slate-400 text-sm">
              Proposez un texte pour chaque amendement. Vote oui/non. Adopté si
              plus de 50 % de oui.
            </p>
            {playersCount > 0 && (
              <div className="rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <span className="text-slate-300">
                  Joueurs prêts à clôturer :{" "}
                  <span className="font-semibold">
                    {readyCount} / {playersCount}
                  </span>
                </span>
                {playerId && (
                  <button
                    type="button"
                    onClick={toggleReady}
                    className={`btn btn-sm ${
                      iAmReady ? "btn-secondary" : "btn-primary"
                    }`}
                  >
                    {iAmReady ? "Annuler mon accord" : "Je suis prêt à clôturer"}
                  </button>
                )}
              </div>
            )}
            {Array.from({ length: AMENDMENTS_COUNT }, (_, i) => (
              <AmendmentBlock
                key={i}
                index={i}
                playerId={playerId}
                proposals={proposals[`amendment-${i}`] ?? []}
                myVote={votes[`amendment-${i}`]}
                votesCount={voteCounts[`amendment-${i}`] ?? 0}
                playersCount={playersCount}
                newText={newAmendment[i] ?? ""}
                setNewText={(s) =>
                  setNewAmendment((a) => ({ ...a, [i]: s }))
                }
                onPropose={(text) => addProposal(i, text)}
                onVote={(value) => vote("amendment", i, value)}
                onOpen={() => fetchVoteCount(i)}
                voting={votingKey === `amendment-${i}`}
              />
            ))}
            <button
              type="button"
              onClick={closePhase}
              disabled={closing || playersCount === 0 || readyCount < playersCount}
              className="btn btn-secondary w-full"
            >
              {closing
                ? "En cours…"
                : readyCount < playersCount
                ? "En attente des joueurs pour clôturer"
                : "Clôturer et générer le préambule"}
            </button>
          </section>
        )}

        {phase === "done" && (
          <section className="card space-y-8">
            <h2 className="text-2xl font-semibold">
              {room.resultName || "Constitution"}
            </h2>
            {room.preamble && (
              <div className="border-l-4 border-blue-600 pl-4 py-2">
                <h3 className="text-sm font-semibold text-slate-400 mb-2">
                  Préambule
                </h3>
                <p className="whitespace-pre-wrap font-serif text-slate-200">
                  {room.preamble}
                </p>
              </div>
            )}
            {adoptedAmendments.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">
                  Amendements adoptés
                </h3>
                <ol className="list-decimal list-inside space-y-1 max-h-96 overflow-y-auto">
                  {adoptedAmendments.map((text, i) => (
                    <li key={i} className="text-slate-300 text-sm">
                      {text}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {adoptedAmendments.length === 0 && (
              <p className="text-slate-500">Aucun amendement adopté.</p>
            )}
          </section>
        )}
        </div>

        {showChat && (
          <aside className="card w-full flex-shrink-0 flex flex-col max-h-[28rem] lg:justify-center">
            <h3 className="font-semibold mb-2 text-slate-200">Chat</h3>
            <div className="flex-1 overflow-y-auto space-y-2 mb-3 min-h-[8rem]">
              {chatMessages.length === 0 && (
                <p className="text-slate-500 text-sm">Aucun message.</p>
              )}
              {chatMessages.map((m) => (
                <div key={m.id} className="text-sm">
                  <span className="text-slate-400 font-medium">{m.playerName ?? "?"} : </span>
                  <span className="text-slate-200">{m.text}</span>
                </div>
              ))}
            </div>
            {playerId && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Votre message…"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendChatMessage()}
                  className="input flex-1 text-sm py-1.5"
                />
                <button
                  type="button"
                  onClick={sendChatMessage}
                  disabled={!chatInput.trim() || sendingChat}
                  className="btn btn-primary text-sm py-1.5"
                >
                  {sendingChat ? "…" : "Envoyer"}
                </button>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function getLatestProposal(proposals: Proposal[]): Proposal | null {
  if (proposals.length === 0) return null;
  return proposals[proposals.length - 1] ?? null;
}

function AmendmentBlock({
  index,
  playerId,
  proposals,
  myVote,
  votesCount,
  playersCount,
  newText,
  setNewText,
  onPropose,
  onVote,
  onOpen,
  voting,
}: {
  index: number;
  playerId: string;
  proposals: Proposal[];
  myVote: boolean | undefined;
  votesCount: number;
  playersCount: number;
  newText: string;
  setNewText: (s: string) => void;
  onPropose: (text: string) => void;
  onVote: (value: boolean) => void;
  onOpen: () => void;
  voting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const latest = getLatestProposal(proposals);
  return (
    <div className="card py-3 w-full">
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) onOpen();
        }}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-medium">Amendement {index + 1}</span>
        <span className="text-slate-400">
          {latest ? "Texte proposé" : "Aucune proposition"}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-2 w-full">
          {playerId && (
            <div className="flex gap-2 w-full">
              <input
                type="text"
                placeholder="Texte de l'amendement"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="input flex-1 min-w-0 text-sm"
              />
              <button
                type="button"
                onClick={() => onPropose(newText)}
                disabled={!newText.trim()}
                className="btn btn-primary text-sm"
              >
                Proposer
              </button>
            </div>
          )}
          {latest && (
            <div className="bg-slate-800/50 rounded p-3 text-sm w-full">
              <p className="text-slate-300 mb-2">Texte soumis au vote :</p>
              <p className="text-slate-200 mb-2 break-words">{latest.text}</p>
              {playersCount > 0 && (
                <p className="text-slate-400 mb-2">
                  Votes enregistrés :{" "}
                  <span className="font-semibold">
                    {votesCount} / {playersCount}
                  </span>
                </p>
              )}
              {playerId && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onVote(true)}
                    disabled={voting}
                    className={`btn text-sm ${myVote === true ? "btn-primary" : "btn-secondary"}`}
                  >
                    {voting ? "…" : myVote === true ? "✓ Oui" : "Oui"}
                  </button>
                  <button
                    type="button"
                    onClick={() => onVote(false)}
                    disabled={voting}
                    className={`btn text-sm ${myVote === false ? "btn-primary" : "btn-secondary"}`}
                  >
                    {voting ? "…" : myVote === false ? "✓ Non" : "Non"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function RoomPage() {
  return (
    <Suspense fallback={<div className="p-4 text-center">Chargement…</div>}>
      <RoomPageContent />
    </Suspense>
  );
}
