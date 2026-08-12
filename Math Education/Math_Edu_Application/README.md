# MATH EDUCATION - Application

Application web d'apprentissage adaptatif des mathematiques (CP a Terminale Spe),
pilotee par un DAG de competences. Voir le contexte projet complet dans
`../CLAUDE.md`.

Direction artistique : **Studio Clair**, implementee depuis les maquettes Claude
Design (`Math Education - Maquettes MVP.dc.html`).

## Stack

- **React 18 + Vite 5 + TypeScript**
- **Tailwind CSS 3** (tokens Studio Clair dans `tailwind.config.js`)
- **react-router-dom 6** (routage)
- **react-flow** (vue graphe du DAG), **KaTeX** (formules), **markmap-view** (cartes mentales)
- **Supabase** (Postgres + auth + RLS) : cable mais pas encore branche, cf. « Etat actuel »

## Prerequis

- Node **>= 18.18** (version epinglee dans `.nvmrc`)

## Demarrage

```bash
npm install
npm run dev                  # http://localhost:5173
```

L'application tourne **sans** Supabase : les donnees viennent du repository
factice (`src/data/mockRepository.ts`). Sur l'ecran de connexion :

- **Continuer avec le compte de demonstration** : Lea, 4e, deja diagnostiquee.
- **Creer un compte** : compte neuf, qui montre tous les etats vides.
- **Voir l'espace professeur** : vue prof (ouverture de creneaux, eleves suivis).

## Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de dev (HMR) sur le port 5173 |
| `npm run build` | Verification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build de production localement |
| `npm run lint` | ESLint (zero warning tolere) |
| `npm run format` | Prettier (formatage `src/`) |

## Etat actuel

Les 7 ecrans du brief sont implementes, branches sur le **contenu reel** produit
par Marius (26 competences, 69 exercices, 4 cartes mentales) et sur une
**progression eleve factice**. Supabase n'est pas encore branche : c'est le
prochain jalon.

| Route | Ecran | Maquette |
|-------|-------|----------|
| `/connexion` | Connexion / role, consentement parental | 1b, 1c |
| `/test` | Test de positionnement + resultat | 1d, 1e |
| `/travail` | Espace de travail, plan du jour | 1f, 1h |
| `/parcours` | Chemin racine -> objectif, et graphe par domaine | 1j, 1i |
| `/exercice/:skillId` | Lecteur d'exercice | dessine dans le systeme |
| `/cartes`, `/cartes/:id` | Cartes memoire et carte mentale | dessine dans le systeme |
| `/profil` | Profil, abonnement, confidentialite | 1k, 1l |
| `/cours` | Calendrier de cours (eleve) | 1m, 1n |
| `/prof/cours` | Ouverture de creneaux (professeur) | 1n |

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
├── main.tsx              # bootstrap React + Router + SessionProvider
├── App.tsx               # routes (ecrans lourds charges a la demande)
│
├── content/              # contenu pedagogique reel, copie des JSON de Marius
│   ├── skills_dag.json   #   26 competences (domaines A, B, C)
│   ├── exercises.json    #   69 exercices, 4 types
│   ├── mindmaps.json     #   4 cartes mentales en Markdown hierarchique
│   └── index.ts          #   chargement + index (par id, par competence, par domaine)
│
├── lib/
│   ├── dag.ts            # MOTEUR : statuts, lacune racine, chemin, maitrise, Leitner
│   ├── placement.ts      # test de positionnement adaptatif (descente dans le DAG)
│   ├── exercise.ts       # correction des 4 types de reponse
│   ├── mindmapTree.ts    # Markdown hierarchique -> arbre markmap
│   ├── format.ts         # dates, heures, euros, niveaux scolaires en francais
│   └── supabase.ts       # client Supabase (tolerant a l'absence de cles)
│
├── data/                 # COUTURE SUPABASE : tout l'etat eleve passe par la
│   ├── repository.ts     #   interface DataRepository
│   ├── mockRepository.ts #   implementation factice (localStorage)
│   └── index.ts          #   selection du repository actif
│
├── mocks/mockData.ts     # la seule source de donnees inventees
├── state/                # SessionProvider, hooks de session, plan du jour
├── components/           # ui/ (design system), layout/, dag/, exercise/, mindmap/
└── pages/                # un fichier par ecran
```

## Les trois regles du moteur (`src/lib/dag.ts`)

C'est la brique differenciante du produit, a lire avant d'y toucher :

1. une competence est **proposable** si tous ses prerequis sont maitrises ;
2. elle est **maitrisee** quand son `mastery_threshold` est atteint sur une
   fenetre glissante des N dernieres tentatives (2 sur 3 par defaut) ;
3. en cas d'**echec repete** sans aucune reussite, l'application propose de
   redescendre sur le prerequis fautif plutot que de s'acharner.

La **lacune racine** est la competence non maitrisee dont tous les prerequis
sont, eux, acquis : la seule sur laquelle l'eleve peut travailler utilement.

## Prochaine etape : brancher Supabase

Tout est prevu pour que les ecrans n'aient pas a bouger :

1. creer les tables `profiles`, `skill_progress`, `exercise_attempts`,
   `content_*`, `availability_slots`, `bookings` (cf. `../CLAUDE.md` section 6) ;
2. ecrire les politiques **RLS** (un eleve ne lit que ses lignes, un professeur
   lit la progression de ses eleves, le contenu est en lecture seule) ;
3. ecrire un `supabaseRepository` qui implemente `DataRepository` ;
4. changer **une ligne** dans `src/data/index.ts`.
