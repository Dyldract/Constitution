-- Script Supabase pour Vote Constitution (bêta)
-- À exécuter dans Supabase → SQL Editor.
-- Prérequis : table public.rooms existante (id uuid, code, phase, ...).

-- 1. Colonne is_public sur rooms
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 2. Table players (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.players (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  name       text NOT NULL,
  joined_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_players_room_id ON public.players(room_id);

-- 3. Table votes (si elle n'existe pas — colonne "index" comme proposals)
CREATE TABLE IF NOT EXISTS public.votes (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id  text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  type       text NOT NULL,
  "index"    integer NOT NULL,
  value      boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_votes_room_id ON public.votes(room_id);

-- 4. Table chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id  text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);

-- 5. Policy RLS pour le chat (ignorer l'erreur si elle existe déjà)
CREATE POLICY "Allow all on chat_messages"
  ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
