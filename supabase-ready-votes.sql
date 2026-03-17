-- Table pour suivre les joueurs "prêts à clôturer" une salle.
-- À exécuter dans Supabase → SQL Editor.

CREATE TABLE IF NOT EXISTS public.ready_votes (
  id         text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  room_id    uuid NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
  player_id  text NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ready_votes_room_id
  ON public.ready_votes(room_id);

-- RLS optionnel (selon ta config)
-- Si RLS est activé sur le schéma public, tu peux ajouter :
-- CREATE POLICY "Allow all on ready_votes"
--   ON public.ready_votes
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

