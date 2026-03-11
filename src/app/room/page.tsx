"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { ARTICLES_COUNT, AMENDMENTS_COUNT } from "@/lib/types";
import type { Room as RoomType, Proposal } from "@/lib/types";

type Phase = RoomType["phase"];

function RoomPageContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("roomId") ?? "";
  const playerId = searchParams.get("playerId") ?? "";

  const [room, setRoom] = useState<RoomType | null>(null);
  const [proposals, setProposals] = useState<Record<string, Proposal[]>>({});
  const [votes, setVotes] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [newArticle, setNewArticle] = useState<Record<number, string>>({});
  const [newAmendment, setNewAmendment] = useState<Record<number, string>>({});
  const [closing, setClosing] = useState(false);
  const [votingKey, setVotingKey] = useState<string | null>(null);

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
      setRoom(data);
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
    async (type: "article" | "amendment", index?: number) => {
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

  useEffect(() => {
    if (!room) return;
    if (room.phase === "articles") {
      for (let i = 0; i < ARTICLES_COUNT; i++) fetchProposals("article", i);
    }
    if (room.phase === "amendments") {
      for (let i = 0; i < AMENDMENTS_COUNT; i++) fetchProposals("amendment", i);
    }
  }, [room?.phase, roomId, fetchProposals]);

  async function addProposal(
    type: "article" | "amendment",
    index: number,
    text: string
  ) {
    if (!roomId || !playerId || !text.trim()) return;
    const res = await fetch("/api/proposals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId,
        playerId,
        type,
        index,
        text: text.trim(),
      }),
    });
    if (!res.ok) return;
    fetchProposals(type, index);
    if (type === "article") setNewArticle((a) => ({ ...a, [index]: "" }));
    if (type === "amendment") setNewAmendment((a) => ({ ...a, [index]: "" }));
  }

  async function vote(
    type: "article" | "amendment",
    index: number,
    value: boolean
  ) {
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
      if (res.ok) setVotes((v) => ({ ...v, [key]: value }));
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
      // Mettre à jour la salle tout de suite avec la réponse (évite tout cache sur le GET)
      if (data.phase === "amendments" && data.resultArticles) {
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                phase: "amendments",
                resultArticles: data.resultArticles,
              }
            : prev
        );
      } else if (data.phase === "done") {
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
      await fetchRoom();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setClosing(false);
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

  const adoptedArticles = room.resultArticles.filter(Boolean) as string[];
  const adoptedAmendments = room.resultAmendments.filter(Boolean) as string[];

  return (
    <div className="min-h-screen p-6 pb-20 bg-gradient-to-b from-slate-900 to-slate-950">
      <header className="max-w-3xl mx-auto mb-8 flex flex-wrap items-center justify-between gap-4">
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
          Phase :{" "}
          {phase === "articles"
            ? "Articles"
            : phase === "amendments"
              ? "Amendements"
              : "Terminé"}
        </span>
      </header>

      <div className="max-w-3xl mx-auto space-y-8">
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 text-sm">
            {error}
          </div>
        )}
        {phase === "articles" && (
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">Les 10 articles</h2>
            <p className="text-slate-400 text-sm">
              Proposez un texte pour chaque article. La dernière proposition est
              soumise au vote. Adopté si plus de 50 % de oui.
            </p>
            {Array.from({ length: ARTICLES_COUNT }, (_, i) => (
              <ArticleBlock
                key={i}
                index={i}
                playerId={playerId}
                proposals={proposals[`article-${i}`] ?? []}
                myVote={votes[`article-${i}`]}
                newText={newArticle[i] ?? ""}
                setNewText={(s) =>
                  setNewArticle((a) => ({ ...a, [i]: s }))
                }
                onPropose={(text) => addProposal("article", i, text)}
                onVote={(value) => vote("article", i, value)}
                voting={votingKey === `article-${i}`}
              />
            ))}
            <button
              type="button"
              onClick={closePhase}
              disabled={closing}
              className="btn btn-secondary w-full"
            >
              {closing
                ? "En cours…"
                : "Clôturer les articles et passer aux amendements"}
            </button>
          </section>
        )}

        {phase === "amendments" && (
          <section className="space-y-8">
            <h2 className="text-2xl font-semibold">Les 100 amendements</h2>
            <p className="text-slate-400 text-sm">
              Proposez un texte pour chaque amendement. Vote oui/non. Adopté si
              plus de 50 % de oui.
            </p>
            {Array.from({ length: AMENDMENTS_COUNT }, (_, i) => (
              <AmendmentBlock
                key={i}
                index={i}
                playerId={playerId}
                proposals={proposals[`amendment-${i}`] ?? []}
                myVote={votes[`amendment-${i}`]}
                newText={newAmendment[i] ?? ""}
                setNewText={(s) =>
                  setNewAmendment((a) => ({ ...a, [i]: s }))
                }
                onPropose={(text) => addProposal("amendment", i, text)}
                onVote={(value) => vote("amendment", i, value)}
                voting={votingKey === `amendment-${i}`}
              />
            ))}
            <button
              type="button"
              onClick={closePhase}
              disabled={closing}
              className="btn btn-secondary w-full"
            >
              {closing
                ? "En cours…"
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
            {adoptedArticles.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold mb-2">Articles adoptés</h3>
                <ol className="list-decimal list-inside space-y-2">
                  {adoptedArticles.map((text, i) => (
                    <li key={i} className="text-slate-200">
                      {text}
                    </li>
                  ))}
                </ol>
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
            {adoptedArticles.length === 0 && adoptedAmendments.length === 0 && (
              <p className="text-slate-500">
                Aucun article ni amendement adopté.
              </p>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function getLatestProposal(proposals: Proposal[]): Proposal | null {
  if (proposals.length === 0) return null;
  return proposals[proposals.length - 1] ?? null;
}

function ArticleBlock({
  index,
  playerId,
  proposals,
  myVote,
  newText,
  setNewText,
  onPropose,
  onVote,
  voting,
}: {
  index: number;
  playerId: string;
  proposals: Proposal[];
  myVote: boolean | undefined;
  newText: string;
  setNewText: (s: string) => void;
  onPropose: (text: string) => void;
  onVote: (value: boolean) => void;
  voting: boolean;
}) {
  const latest = getLatestProposal(proposals);
  return (
    <div className="card">
      <h3 className="font-semibold mb-3">Article {index + 1}</h3>
      {playerId && (
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Texte de l'article"
            value={newText}
            onChange={(e) => setNewText(e.target.value)}
            className="input flex-1"
          />
          <button
            type="button"
            onClick={() => onPropose(newText)}
            disabled={!newText.trim()}
            className="btn btn-primary"
          >
            Proposer
          </button>
        </div>
      )}
      {latest ? (
        <div className="bg-slate-800/50 rounded-lg p-3 mb-3">
          <p className="text-sm text-slate-300 mb-2">Texte soumis au vote :</p>
          <p className="text-slate-200">{latest.text}</p>
          {playerId && (
            <div className="flex gap-2 mt-3">
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
      ) : (
        <p className="text-slate-500 text-sm">Aucune proposition pour cet article.</p>
      )}
    </div>
  );
}

function AmendmentBlock({
  index,
  playerId,
  proposals,
  myVote,
  newText,
  setNewText,
  onPropose,
  onVote,
  voting,
}: {
  index: number;
  playerId: string;
  proposals: Proposal[];
  myVote: boolean | undefined;
  newText: string;
  setNewText: (s: string) => void;
  onPropose: (text: string) => void;
  onVote: (value: boolean) => void;
  voting: boolean;
}) {
  const [open, setOpen] = useState(false);
  const latest = getLatestProposal(proposals);
  return (
    <div className="card py-3">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left"
      >
        <span className="font-medium">Amendement {index + 1}</span>
        <span className="text-slate-400">
          {latest ? "Texte proposé" : "Aucune proposition"}
        </span>
      </button>
      {open && (
        <div className="mt-4 space-y-2">
          {playerId && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Texte de l'amendement"
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                className="input flex-1 text-sm"
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
            <div className="bg-slate-800/50 rounded p-2 text-sm">
              <p className="text-slate-300 mb-2">Texte soumis au vote :</p>
              <p className="text-slate-200 mb-2">{latest.text}</p>
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
