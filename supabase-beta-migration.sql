-- Migration Beta : is_public sur rooms + chat
-- À exécuter dans Supabase → SQL Editor avant d'utiliser la version bêta.

-- 1. Colonne is_public sur rooms (défaut false = privé)
ALTER TABLE public.rooms
ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- 2. Table des messages de chat (room_id et player_id en uuid si vos tables utilisent uuid)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id         text PRIMARY KEY,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  text       text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_room_id
  ON public.chat_messages(room_id);

-- 3. Policies RLS pour le chat (si besoin)
CREATE POLICY "Allow all on chat_messages"
  ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
