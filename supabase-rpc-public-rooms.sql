-- Contournement du cache schéma PostgREST pour is_public sur rooms.
-- À exécuter dans Supabase → SQL Editor.
-- Permet de définir une salle comme publique et de lister les salles publiques
-- même quand le cache ne connaît pas encore la colonne is_public.

-- 1. Mettre à jour is_public pour une salle (appelé depuis l'app en secours)
CREATE OR REPLACE FUNCTION public.set_room_public(p_room_id uuid, p_is_public boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.rooms SET is_public = p_is_public WHERE id = p_room_id;
$$;

-- 2. Lister les salles publiques (appelé depuis l'app en secours)
CREATE OR REPLACE FUNCTION public.get_public_rooms()
RETURNS TABLE (
  id uuid,
  code text,
  result_name text,
  phase text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT r.id, r.code, r.result_name, r.phase, r.created_at
  FROM public.rooms r
  WHERE r.is_public = true
  ORDER BY r.created_at DESC;
$$;
