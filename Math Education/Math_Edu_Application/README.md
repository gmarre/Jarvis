# MATH EDUCATION — Application

Application web d'apprentissage adaptatif des mathématiques (CP à Terminale
spécialité), pilotée par un DAG de compétences. Nom de produit : **Racine**.

> **Pour reprendre le projet, lire `ROADMAP.md` en premier.** Il dit l'état réel
> du code, les décisions déjà tranchées et ce qui reste sprint par sprint. C'est
> lui qui fait foi sur l'avancement.
>
> - `ROADMAP.md` — où on en est, ce qui vient, et pourquoi.
> - `GUIDE.md` — comment travailler sur le code : commandes, structure, recettes.
> - `../CLAUDE.md` — contexte produit (DAG, modèle économique, rôles).
>
> Ce README ne donne que le résumé technique.

## Stack

- **React 18 + Vite 5 + TypeScript**, **Tailwind CSS 3** (jetons Studio Clair dans `tailwind.config.js`)
- **react-router-dom 6** : 13 routes, avec gardes de rôle (élève / professeur / parent)
- **react-flow** (graphe du DAG), **KaTeX** (formules), **markmap-view** (cartes mentales)
- **Supabase** : Postgres, authentification Google et email, politiques RLS. **Branché et validé.**
- **Vitest** pour le moteur et le repository, **Docker** pour rejouer le schéma SQL

## Prérequis

- Node **>= 18.18** aujourd'hui (`.nvmrc`), mais **Node 22 minimum bientôt requis** :
  `supabase-js` exige un WebSocket natif pour ses scripts Node. Montée en Node 24
  prévue au sprint 2b, marche à suivre dans `ROADMAP.md` §7.
- **Docker** pour `npm run test:sql` uniquement.

## Démarrage

```bash
npm install
npm run dev                  # http://localhost:5173
```

**Avec un projet Supabase configuré** (`.env.local` renseigné) : bouton
« Continuer avec Google », ou inscription et connexion par email. Un compte créé
par Google passe d'abord par `/bienvenue`, qui réclame le niveau scolaire et la
date de naissance, sans lesquels on ne peut ni bâtir un parcours, ni appliquer la
règle des 15 ans.

**Sans clés** : l'application bascule en mode démonstration sur données factices,
et un encart apparaît en bas de l'écran de connexion avec un compte élève déjà
diagnostiqué (Léa, 4e) et un compte professeur. Cet encart est invisible dès que
les clés sont présentes.

## Scripts

| Commande | Effet |
|----------|-------|
| `npm run dev` | Serveur de dev (HMR) sur le port 5173 |
| `npm test` | Tests unitaires du moteur et du repository (176) |
| `npm run test:watch` | Idem, en continu |
| `npm run test:sql` | Rejoue les migrations et les politiques RLS dans un Postgres jetable (Docker) |
| `npm run check:supabase` | Vérifie que le projet Supabase réel répond et que les tables sont là |
| `npm run check:db` | Triggers, RLS, escalade de privilège et capacité, contre le **vrai** projet |
| `npm run build` | Vérification TypeScript + build de production dans `dist/` |
| `npm run preview` | Sert le build de production localement |
| `npm run lint` | ESLint, **zéro warning toléré** |
| `npm run format` | Prettier sur `src/` |

Avant chaque commit : `npm test && npm run lint && npm run build`.

## Routes

| Route | Écran | Accès |
|-------|-------|-------|
| `/connexion` | Connexion et inscription, consentement parental | public |
| `/bienvenue` | Complétion de profil après connexion Google | connecté |
| `/test` | Test de positionnement et résultat | élève |
| `/travail` | Espace de travail, plan du jour | élève |
| `/parcours` | Chemin vers l'objectif, et graphe par domaine | élève |
| `/exercice/:skillId` | Lecteur d'exercice | élève |
| `/cartes`, `/cartes/:id` | Cartes mémoire et carte mentale | élève |
| `/cours` | Calendrier et réservation de cours | élève |
| `/prof/cours` | Ouverture de créneaux | professeur |
| `/parent` | Espace parent (page d'attente, sprint 5) | parent |
| `/abonnement` | Offre et tarif, sans paiement | connecté |
| `/profil` | Profil, abonnement, confidentialité, export RGPD | connecté |

## Variables d'environnement

Dans `.env.local`, ignoré par Git. Modèle : `.env.example`.

| Variable | Description | Envoyée au navigateur |
|----------|-------------|------------------------|
| `VITE_SUPABASE_URL` | URL du projet | oui, publique |
| `VITE_SUPABASE_ANON_KEY` | Clé publishable (ex « anon »), protégée par les RLS | oui, publique |
| `VITE_USE_MOCK` | `true` force les données factices malgré des clés valides | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète, scripts locaux uniquement | **non, jamais** |

**Le préfixe `VITE_` n'est pas cosmétique :** tout ce qui le porte est embarqué
dans le bundle JavaScript. La clé `service_role` contourne toutes les politiques
RLS, elle ne doit jamais le porter ni aller dans les variables de build Netlify.

Au **déploiement**, reporter chaque variable `VITE_*` dans les Variables
d'environnement de l'hébergeur, sinon l'app marche en local et pas en ligne.
C'est le piège classique.

## Structure

```
src/
├── main.tsx              # bootstrap React + Router + SessionProvider
├── App.tsx               # routes, gardes de rôle, écrans lourds chargés à la demande
│
├── content/              # contenu pédagogique réel, copie des JSON de Marius
│   ├── skills_dag.json   #   38 compétences (domaines A, C, et 3 de B)
│   ├── exercises.json     #   69 exercices, 4 types
│   ├── mindmaps.json     #   6 cartes mentales en Markdown hiérarchique
│   └── index.ts          #   chargement et index (par id, compétence, domaine)
│
├── lib/                  # LE MOTEUR : pur, sans React, testé
│   ├── dag.ts            #   statuts, lacune racine, chemin, maîtrise, Leitner
│   ├── placement.ts      #   test de positionnement adaptatif
│   ├── exercise.ts       #   correction des 4 types de réponse
│   ├── age.ts            #   âge et seuil de consentement parental
│   ├── id.ts             #   identifiants, avec repli hors contexte sécurisé
│   ├── redirect.ts       #   nettoyage des destinations de redirection
│   ├── mindmapTree.ts    #   Markdown hiérarchique vers arbre markmap
│   ├── format.ts         #   dates, heures, euros, niveaux scolaires
│   └── supabase.ts       #   client Supabase
│
├── data/                 # LA COUTURE : tout l'état élève passe par là
│   ├── repository.ts     #   interface DataRepository, une mutation par intention
│   ├── supabaseRepository.ts
│   ├── mockRepository.ts #   implémentation factice (localStorage)
│   └── index.ts          #   sélection du repository actif
│
├── mocks/mockData.ts     # la seule source de données inventées
├── state/                # SessionProvider, hooks de session, plan du jour
├── components/           # ui/ (design system), layout/, dag/, exercise/, mindmap/
└── pages/                # un fichier par écran

supabase/
├── migrations/           # le schéma, chaque fichier expliquant son objet
└── tests/                # harnais SQL rejouable en une commande
```

## Les trois règles du moteur (`src/lib/dag.ts`)

C'est la brique différenciante du produit, à lire avant d'y toucher :

1. une compétence est **proposable** si tous ses prérequis sont maîtrisés ;
2. elle est **maîtrisée** quand son `mastery_threshold` est atteint sur une
   fenêtre glissante des N dernières tentatives (2 sur 3 par défaut) ;
3. en cas d'**échec répété** sans aucune réussite, l'application propose de
   redescendre sur le prérequis fautif plutôt que de s'acharner.

La **lacune racine** est la compétence non maîtrisée dont tous les prérequis
sont, eux, acquis : la seule sur laquelle l'élève peut travailler utilement.
Le moteur ne propose jamais une lacune sans exercice, sous peine d'annoncer
« 0 exercices » puis d'ouvrir un écran vide.

## Ce qui manque encore

Par ordre de valeur, détail dans `ROADMAP.md` :

1. **Les emails**, donc le consentement parental est impossible à obtenir.
2. **Le contenu en base et la correction côté serveur** : les réponses des
   exercices sont aujourd'hui livrées dans le bundle.
3. **Le déploiement**, l'application n'est accessible qu'en local.
4. **L'espace parent**, le rôle existe mais son espace est une page d'attente.
5. **Le paiement**, rien n'est monétisé.
