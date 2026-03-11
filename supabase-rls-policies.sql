-- Policies RLS pour vote-constitution
-- Exécuter dans Supabase → SQL Editor si tu as l'erreur "row-level security policy violation"

-- Rooms : lecture, création, mise à jour
CREATE POLICY "Allow all on rooms"
  ON public.rooms
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Players : idem
CREATE POLICY "Allow all on players"
  ON public.players
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Proposals : idem
CREATE POLICY "Allow all on proposals"
  ON public.proposals
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Votes : idem
CREATE POLICY "Allow all on votes"
  ON public.votes
  FOR ALL
  USING (true)
  WITH CHECK (true);
