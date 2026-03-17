"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type PublicRoom = { id: string; code: string; resultName: string; phase: string; playersCount: number };

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [hostName, setHostName] = useState("");
  const [constitutionName, setConstitutionName] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [error, setError] = useState("");
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([]);
  const [joiningRoomCode, setJoiningRoomCode] = useState<string | null>(null);
  const [joinName, setJoinName] = useState("");
  const createSubmitted = useRef(false);

  useEffect(() => {
    fetch("/api/rooms", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setPublicRooms(data.rooms ?? []))
      .catch(() => {});
    const t = setInterval(() => {
      fetch("/api/rooms", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setPublicRooms(data.rooms ?? []))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(t);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createSubmitted.current || creating) return;
    const name = (constitutionName || "").trim();
    const host = (hostName || "").trim();
    if (!name) {
      setError("Indiquez le nom de la constitution.");
      return;
    }
    if (!host) {
      setError("Indiquez votre nom (créateur).");
      return;
    }
    createSubmitted.current = true;
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/room/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          constitutionName: name,
          playerName: host,
          isPublic,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = [data.error, data.details].filter(Boolean).join(" — ") || "Erreur lors de la création";
        throw new Error(msg);
      }
      
      // Vérifier que les données essentielles sont présentes
      if (!data.roomId) {
        throw new Error("La salle n'a pas pu être créée correctement");
      }
      
      // Attendre un court instant pour s'assurer que la salle est bien créée côté serveur
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      const q = new URLSearchParams({ roomId: data.roomId });
      if (data.playerId) q.set("playerId", data.playerId);
      router.push(`/room?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer la salle");
      createSubmitted.current = false;
    } finally {
      setCreating(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const trimmedCode = code.trim();
    const trimmedPlayer = (playerName || "").trim();
    if (!trimmedCode) {
      setError("Veuillez entrer un code de salle");
      return;
    }
    if (!trimmedPlayer) {
      setError("Indiquez votre nom de joueur.");
      return;
    }
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: trimmedCode.toUpperCase(),
          playerName: trimmedPlayer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Erreur lors de la connexion");
      }
      
      // Vérifier que les données essentielles sont présentes
      if (!data.roomId || !data.playerId) {
        throw new Error("La connexion à la salle a échoué");
      }
      
      // Attendre un court instant pour s'assurer que tout est prêt
      await new Promise((resolve) => setTimeout(resolve, 100));
      
      router.push(`/room?roomId=${data.roomId}&playerId=${data.playerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rejoindre");
    }
  }

  async function handleJoinPublicRoom(e: React.FormEvent) {
    e.preventDefault();
    const name = joinName.trim();
    if (!name || !joiningRoomCode) return;
    setError("");
    try {
      const res = await fetch("/api/room/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: joiningRoomCode, playerName: name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Impossible de rejoindre");
      if (!data.roomId || !data.playerId) throw new Error("Connexion échouée");
      setJoiningRoomCode(null);
      setJoinName("");
      router.push(`/room?roomId=${data.roomId}&playerId=${data.playerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de rejoindre");
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-6 gap-8 bg-gradient-to-b from-slate-900 to-slate-950">
      {/* Zone centrale : d’abord sur mobile ; desktop : formulaire centré (aside en absolute à gauche) */}
      <main className="w-full flex flex-col items-center justify-center min-w-0 max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 font-serif">
            Constitution
          </h1>
          <p className="text-slate-400">
            30 amendements · Vote oui/non · Chat · Préambule généré automatiquement
          </p>
        </div>

        <div className="card max-w-md w-full space-y-6">
          <form onSubmit={handleCreate} className="space-y-2">
            <label className="block text-sm text-slate-400">
              Nom de la constitution <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Constitution de la République"
              value={constitutionName}
              onChange={(e) => {
                setConstitutionName(e.target.value);
                setError("");
              }}
              className="input"
              disabled={creating}
              autoComplete="off"
            />
            <label className="block text-sm text-slate-400">Votre nom (créateur)</label>
            <input
              type="text"
              placeholder="Hôte"
              value={hostName}
              onChange={(e) => setHostName(e.target.value)}
              className="input"
              disabled={creating}
              autoComplete="off"
            />
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="rounded border-slate-600"
              />
              <span className="text-sm text-slate-400">Rendre la salle publique (visible dans la liste)</span>
            </label>
            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary w-full py-3 text-lg"
            >
              {creating ? "Création…" : "Créer une salle"}
            </button>
            <p className="text-sm text-slate-400 text-center">
              Le nom est choisi par vous. Les autres rejoignent avec le code ou via la liste.
            </p>
          </form>

          <div className="border-t border-slate-600 pt-6">
            <p className="text-sm text-slate-400 mb-3 text-center">
              Déjà un code ?
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder="Code (ex: AB12CD)"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input uppercase tracking-widest text-center"
                maxLength={6}
              />
              <input
                type="text"
                placeholder="Votre nom"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="input"
              />
              <button type="submit" className="btn btn-secondary w-full">
                Rejoindre
              </button>
            </form>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </main>

      {/* Salles publiques : en bas sur mobile ; à gauche sur desktop */}
      <aside className="w-full max-w-md mx-auto lg:max-w-none lg:w-72 lg:absolute lg:left-6 lg:top-1/2 lg:-translate-y-1/2 flex-shrink-0 max-lg:mt-8 max-lg:pb-4">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">Salles publiques</h2>
        {publicRooms.length === 0 ? (
          <p className="text-slate-500 text-sm">Aucune salle publique pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {publicRooms.map((room) => (
              <li key={room.id} className="card py-3">
                <div className="flex flex-col gap-2">
                  <span className="font-medium text-white truncate" title={room.resultName}>
                    {room.resultName}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {room.playersCount} participant{room.playersCount !== 1 ? "s" : ""}
                  </span>
                  {joiningRoomCode === room.code ? (
                    <form onSubmit={handleJoinPublicRoom} className="flex gap-2 mt-1">
                      <input
                        type="text"
                        placeholder="Votre nom"
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        className="input text-sm py-1.5"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button type="submit" className="btn btn-primary text-sm py-1.5">
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => { setJoiningRoomCode(null); setJoinName(""); setError(""); }}
                          className="btn btn-secondary text-sm py-1.5"
                        >
                          Annuler
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setJoiningRoomCode(room.code)}
                      className="btn btn-secondary text-sm w-full mt-1"
                    >
                      Rejoindre
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
