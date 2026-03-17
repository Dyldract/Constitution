# Constitution

Application collaborative pour voter ensemble une constitution : **nom**, **10 articles**, **100 amendements**, puis génération automatique du **préambule**.

## Fonctionnement

1. **Créer une salle** : un joueur crée une salle et reçoit un code à 6 caractères (ex. `AB12CD`).
2. **Rejoindre** : les autres joueurs rejoignent avec ce code et leur nom.
3. **Phase Articles** : pour chacun des 10 articles, propositions + vote. Puis clôture → passage aux amendements.
4. **Phase Amendements** : idem pour les 100 amendements (chaque bloc est repliable pour garder la page lisible).
5. **Clôture finale** : le préambule est **généré automatiquement** à partir du nom adopté, des articles et des amendements, avec la date du jour.


## Site de lancement

Ouvrir https://constitution-beryl.vercel.app/ 


## Stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Base de données** : **Supabase** (PostgreSQL) pour salles, joueurs, propositions et votes.

## Fichiers importants

- `src/lib/supabase.ts` : client Supabase (côté serveur).
- `src/lib/store.ts` : salle, joueurs, propositions, votes (requêtes Supabase).
- `src/lib/preamble.ts` : génération du texte du préambule.
- `src/app/api/` : routes API (créer/rejoindre salle, propositions, votes, clôture des phases).
- `src/app/room/page.tsx` : interface de la salle (phases articles → amendements → résultat).
- `supabase-rls-policies.sql` : script SQL optionnel pour les policies RLS sur les tables Supabase.
