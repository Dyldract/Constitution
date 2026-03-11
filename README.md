# Vote Constitution

Application collaborative pour voter ensemble une constitution : **nom**, **10 articles**, **100 amendements**, puis génération automatique du **préambule**.

## Fonctionnement

1. **Créer une salle** : un joueur crée une salle et reçoit un code à 6 caractères (ex. `AB12CD`).
2. **Rejoindre** : les autres joueurs rejoignent avec ce code et leur nom.
3. **Phase Nom** : tout le monde peut proposer un nom pour la constitution et voter pour une proposition. Un joueur clôture le vote → le nom gagnant est adopté.
4. **Phase Articles** : pour chacun des 10 articles, propositions + vote. Puis clôture → passage aux amendements.
5. **Phase Amendements** : idem pour les 100 amendements (chaque bloc est repliable pour garder la page lisible).
6. **Clôture finale** : le préambule est **généré automatiquement** à partir du nom adopté, des articles et des amendements, avec la date du jour.
7. **Résultat** : affichage de la constitution complète (préambule + articles + amendements).

## Lancer le projet

```bash
cd "vote-constitution"
npm install
npm run dev
```

Ouvrir [http://localhost:3000](http://localhost:3000).

### Accéder depuis un autre appareil (réseau local)

Le serveur écoute maintenant sur toutes les interfaces réseau (`0.0.0.0`). Pour accéder depuis un autre ordinateur ou smartphone sur le même réseau Wi‑Fi :

1. **Trouver l'adresse IP locale** de ton ordinateur :
   ```bash
   # Sur Linux/Mac
   hostname -I
   # ou
   ip addr show | grep "inet " | grep -v "127.0.0.1"
   
   # Sur Windows
   ipconfig
   # Cherche "Adresse IPv4" (ex: 192.168.1.100)
   ```

2. **Depuis l'autre appareil**, ouvre un navigateur et va sur :
   ```
   http://[TON_IP_LOCALE]:3000
   ```
   Par exemple : `http://192.168.1.100:3000`

3. **Assure-toi que le firewall** autorise les connexions sur le port 3000.

**Note** : Les deux appareils doivent être sur le **même réseau Wi‑Fi**.

## Stack

- **Next.js 14** (App Router), **TypeScript**, **Tailwind CSS**
- **Base de données** : **Supabase** (PostgreSQL) pour salles, joueurs, propositions et votes.

## Variables d'environnement

Copier `.env.example` vers `.env.local` et remplir les clés Supabase (Project Settings → API) :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Ne jamais committer `.env.local`. Pour un déploiement (ex. Vercel), ajouter ces variables dans les paramètres du projet.

## Fichiers importants

- `src/lib/supabase.ts` : client Supabase (côté serveur).
- `src/lib/store.ts` : salle, joueurs, propositions, votes (requêtes Supabase).
- `src/lib/preamble.ts` : génération du texte du préambule.
- `src/app/api/` : routes API (créer/rejoindre salle, propositions, votes, clôture des phases).
- `src/app/room/page.tsx` : interface de la salle (phases articles → amendements → résultat).
- `supabase-rls-policies.sql` : script SQL optionnel pour les policies RLS sur les tables Supabase.
