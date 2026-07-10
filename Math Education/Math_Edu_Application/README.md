# MATH EDUCATION - Application

Application web d'apprentissage adaptatif des mathematiques (CP a Terminale Spe),
pilotee par un DAG de 414 competences. Voir le contexte projet complet dans
`../CLAUDE.md`.

## Stack

- **React 18 + Vite 5 + TypeScript**
- **Tailwind CSS 3**
- **react-router-dom 6** (routage)
- **Supabase** (Postgres + auth + RLS) via `@supabase/supabase-js`
- A venir : KaTeX (rendu math), react-flow (visualisation DAG), Markmap (cartes mentales)

## Prerequis

- Node **>= 18.18** (version epinglee dans `.nvmrc`)

## Demarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les cles (facultatif au debut)
npm run dev                  # http://localhost:5173
```

Le Hello World tourne **sans** cles Supabase. Le backend devient actif des que
`.env.local` est renseigne.

## Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de dev (HMR) sur le port 5173 |
| `npm run build` | Verification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build de production localement |
| `npm run lint` | ESLint |
| `npm run format` | Prettier (formatage `src/`) |

## Variables d'environnement

Les cles vivent dans `.env.local` (ignore par Git). Au **deploiement** (Netlify /
Vercel), reporter ces memes variables dans les Variables d'environnement du
service, sinon l'app marche en local mais pas en ligne (piege classique).

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | URL du projet Supabase (publique) |
| `VITE_SUPABASE_ANON_KEY` | Cle anon publique (protegee par RLS) |

La cle `service_role` ne doit **jamais** figurer cote client.

## Structure

```
src/
├── main.tsx          # bootstrap React + Router
├── App.tsx           # page Hello World
├── lib/supabase.ts   # client Supabase (tolerant a l'absence de cles)
├── components/       # DagView, ExercisePlayer, MindmapView, Dashboard (a venir)
├── pages/            # routes (landing, login, dashboard... a venir)
└── types/            # types partages alignes sur les schemas JSON (a venir)
```
