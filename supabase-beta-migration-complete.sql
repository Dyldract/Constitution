-- Migration Beta complète (à utiliser si "players" ou d'autres tables n'existent pas)
-- À exécuter dans Supabase → SQL Editor.
-- Prérequis : la table public.rooms existe avec id (uuid), code, phase, etc.

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

-- 3. Table proposals (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.proposals (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  type       text NOT NULL,
  index_     integer NOT NULL,
  text       text NOT NULL,
  author_id  text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_proposals_room_id ON public.proposals(room_id);

-- 4. Table votes (si elle n'existe pas)
CREATE TABLE IF NOT EXISTS public.votes (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id  text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  type       text NOT NULL,
  index_     integer NOT NULL,
  value      boolean NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_votes_room_id ON public.votes(room_id);

-- 5. Table chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id  text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id ON public.chat_messages(room_id);

-- 6. Policies RLS (optionnel)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'chat_messages' AND policyname = 'Allow all on chat_messages') THEN
    CREATE POLICY "Allow all on chat_messages"
      ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;
