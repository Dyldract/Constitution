-- Activer RLS sur players et chat_messages
-- Exécuter dans Supabase → SQL Editor

-- 1. Activer RLS sur players
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- 2. Activer RLS sur chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- 3. Policies pour players (autoriser tout pour le rôle utilisé par l'API)
CREATE POLICY "Allow all on players"
  ON public.players FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Policies pour chat_messages (autoriser tout pour le rôle utilisé par l'API)
CREATE POLICY "Allow all on chat_messages"
  ON public.chat_messages FOR ALL
  USING (true)
  WITH CHECK (true);
