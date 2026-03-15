-- Recharger le cache schéma PostgREST (Supabase)
-- À exécuter dans Supabase → SQL Editor quand tu as l'erreur
-- "Could not find the 'is_public' column of 'rooms' in the schema cache"
--
-- Cela force l'API à prendre en compte les colonnes récemment ajoutées (ex: is_public).

NOTIFY pgrst, 'reload schema';
