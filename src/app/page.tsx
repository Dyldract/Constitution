"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [code, setCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [hostName, setHostName] = useState("");
  const [constitutionName, setConstitutionName] = useState("");
  const [error, setError] = useState("");
  const createSubmitted = useRef(false);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la création");
      
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-slate-900 to-slate-950">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold text-white mb-2 font-serif">
          Vote Constitution
        </h1>
        <p className="text-slate-400">
          10 articles, 100 amendements · Vote oui/non · Préambule généré automatiquement
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
          <button
            type="submit"
            disabled={creating}
            className="btn btn-primary w-full py-3 text-lg"
          >
            {creating ? "Création…" : "Créer une salle"}
          </button>
          <p className="text-sm text-slate-400 text-center">
            Le nom est choisi par vous. Les autres rejoignent avec le code.
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
    </div>
  );
}
