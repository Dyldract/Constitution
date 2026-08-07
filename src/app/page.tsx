"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { useLocale } from "@/components/LocaleProvider";

type PublicRoom = { id: string; code: string; resultName: string; phase: string; playersCount: number };

export default function HomePage() {
  const router = useRouter();
  const { t } = useLocale();
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
    const timer = setInterval(() => {
      fetch("/api/rooms", { cache: "no-store" })
        .then((r) => r.json())
        .then((data) => setPublicRooms(data.rooms ?? []))
        .catch(() => {});
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (createSubmitted.current || creating) return;
    const name = (constitutionName || "").trim();
    const host = (hostName || "").trim();
    if (!name) {
      setError(t.home.errorConstitutionName);
      return;
    }
    if (!host) {
      setError(t.home.errorHostName);
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
        const msg =
          [data.error, data.details].filter(Boolean).join(" — ") ||
          t.home.errorCreate;
        throw new Error(msg);
      }

      if (!data.roomId) {
        throw new Error(t.home.errorRoomNotCreated);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      const q = new URLSearchParams({ roomId: data.roomId });
      if (data.playerId) q.set("playerId", data.playerId);
      router.push(`/room?${q.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.home.errorCreateGeneric);
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
      setError(t.home.errorEnterCode);
      return;
    }
    if (!trimmedPlayer) {
      setError(t.home.errorPlayerName);
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
        throw new Error(data.error || t.home.errorJoin);
      }

      if (!data.roomId || !data.playerId) {
        throw new Error(t.home.errorJoinFailed);
      }

      await new Promise((resolve) => setTimeout(resolve, 100));

      router.push(`/room?roomId=${data.roomId}&playerId=${data.playerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.home.errorJoinGeneric);
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
      if (!res.ok) throw new Error(data.error || t.home.errorJoinGeneric);
      if (!data.roomId || !data.playerId)
        throw new Error(t.home.errorConnectionFailed);
      setJoiningRoomCode(null);
      setJoinName("");
      router.push(`/room?roomId=${data.roomId}&playerId=${data.playerId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.home.errorJoinGeneric);
    }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center p-6 gap-8 bg-gradient-to-b from-slate-900 to-slate-950 relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>

      <main className="w-full flex flex-col items-center justify-center min-w-0 max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-white mb-2 font-serif">
            Constitution
          </h1>
          <p className="text-slate-400">{t.home.tagline}</p>
        </div>

        <div className="card max-w-md w-full space-y-6">
          <form onSubmit={handleCreate} className="space-y-2">
            <label className="block text-sm text-slate-400">
              {t.home.constitutionNameLabel}{" "}
              <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              placeholder={t.home.constitutionNamePlaceholder}
              value={constitutionName}
              onChange={(e) => {
                setConstitutionName(e.target.value);
                setError("");
              }}
              className="input"
              disabled={creating}
              autoComplete="off"
            />
            <label className="block text-sm text-slate-400">
              {t.home.hostNameLabel}
            </label>
            <input
              type="text"
              placeholder={t.home.hostNamePlaceholder}
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
              <span className="text-sm text-slate-400">{t.home.makePublic}</span>
            </label>
            <button
              type="submit"
              disabled={creating}
              className="btn btn-primary w-full py-3 text-lg"
            >
              {creating ? t.home.creating : t.home.createRoom}
            </button>
            <p className="text-sm text-slate-400 text-center">
              {t.home.createHint}
            </p>
          </form>

          <div className="border-t border-slate-600 pt-6">
            <p className="text-sm text-slate-400 mb-3 text-center">
              {t.home.alreadyHaveCode}
            </p>
            <form onSubmit={handleJoin} className="space-y-3">
              <input
                type="text"
                placeholder={t.home.codePlaceholder}
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input uppercase tracking-widest text-center"
                maxLength={6}
              />
              <input
                type="text"
                placeholder={t.home.yourName}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                className="input"
              />
              <button type="submit" className="btn btn-secondary w-full">
                {t.home.join}
              </button>
            </form>
          </div>

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}
        </div>
      </main>

      <aside className="w-full max-w-md mx-auto lg:max-w-none lg:w-72 lg:absolute lg:left-6 lg:top-1/2 lg:-translate-y-1/2 flex-shrink-0 max-lg:mt-8 max-lg:pb-4">
        <h2 className="text-lg font-semibold text-slate-200 mb-3">
          {t.home.publicRooms}
        </h2>
        {publicRooms.length === 0 ? (
          <p className="text-slate-500 text-sm">{t.home.noPublicRooms}</p>
        ) : (
          <ul className="space-y-2">
            {publicRooms.map((room) => (
              <li key={room.id} className="card py-3">
                <div className="flex flex-col gap-2">
                  <span
                    className="font-medium text-white truncate"
                    title={room.resultName}
                  >
                    {room.resultName}
                  </span>
                  <span className="text-slate-400 text-sm">
                    {t.home.participants(room.playersCount)}
                  </span>
                  {joiningRoomCode === room.code ? (
                    <form
                      onSubmit={handleJoinPublicRoom}
                      className="flex gap-2 mt-1"
                    >
                      <input
                        type="text"
                        placeholder={t.home.yourName}
                        value={joinName}
                        onChange={(e) => setJoinName(e.target.value)}
                        className="input text-sm py-1.5"
                        autoFocus
                      />
                      <div className="flex gap-1">
                        <button
                          type="submit"
                          className="btn btn-primary text-sm py-1.5"
                        >
                          OK
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setJoiningRoomCode(null);
                            setJoinName("");
                            setError("");
                          }}
                          className="btn btn-secondary text-sm py-1.5"
                        >
                          {t.home.cancel}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setJoiningRoomCode(room.code)}
                      className="btn btn-secondary text-sm w-full mt-1"
                    >
                      {t.home.join}
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
