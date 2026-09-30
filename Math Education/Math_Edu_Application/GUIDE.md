# Guide de l'application MATH EDUCATION

> Manuel de travail sur le code. Destiné à Gauthier et Marius.
>
> **Où en est le projet et ce qui reste à faire : `ROADMAP.md`.** C'est lui qui
> fait foi sur l'avancement, et il porte aussi les décisions déjà tranchées et
> les pièges rencontrés. Contexte produit : `../CLAUDE.md`.
>
> Ce guide-ci répond à une seule question : comment travailler sur ce code.

---

## 1. Ce que c'est

L'application web MATH EDUCATION, nom de produit **Racine**. C'est une
**application** (comptes, base de données, logique métier), pas un site vitrine.

**Où en est le projet, en une phrase.** Les 13 écrans fonctionnent, adossés au
vrai contenu de Marius, le moteur est couvert par 176 tests, et Supabase est
entièrement branché (authentification Google et email, base Postgres, politiques
RLS). Manquent les emails, le contenu en base, le déploiement et l'espace parent.
Détail dans `ROADMAP.md`.

**Les briques en place :**

| Brique | Rôle | Statut |
|--------|------|--------|
| React 18 | Construire les écrans | En place |
| Vite 5 | Serveur de dev rapide, build de production | En place |
| TypeScript | Typage (moins de bugs, autocomplétion) | En place |
| Tailwind CSS 3 | Mise en forme sans écrire de CSS | En place |
| react-router 6 | Naviguer entre les écrans, avec gardes de rôle | En place, 13 routes |
| KaTeX | Rendu des formules mathématiques | En place |
| react-flow | Visualisation du DAG de compétences | En place |
| Markmap | Rendu des cartes mentales | En place |
| **Supabase** | Base de données, comptes, sécurité (RLS) | **Branché et validé** |
| Vitest | Tests du moteur et du repository | En place, 176 tests |
| Docker | Postgres jetable pour tester le schéma SQL | Utilisé par `npm run test:sql` |

---

## 2. Prise en main (5 minutes)

### Prérequis

- **Node.js ≥ 18.18** aujourd'hui (version épinglée dans `.nvmrc`).
  **Attention :** `supabase-js` exige un WebSocket natif, donc Node 22 minimum,
  pour tout script Node. Le script `supabase/tests/integration.mjs` a été écrit
  en `fetch` pur pour contourner, mais le script de seed du sprint 3 butera
  dessus. Montée en Node 24 prévue, marche à suivre dans `ROADMAP.md` §7.
- **Docker** si vous voulez lancer `npm run test:sql`. Inutile sinon.

### Première fois

```bash
npm install
```

### Lancer l'application

```bash
npm run dev
```

Puis **http://localhost:5173**. La page se recharge à chaque modification.
`Ctrl + C` pour arrêter.

### Se connecter

**Avec un projet Supabase configuré** (`.env.local` renseigné) : bouton
« Continuer avec Google », ou inscription et connexion par email et mot de passe.
Un compte créé par Google passe d'abord par `/bienvenue`, qui réclame le niveau
scolaire et la date de naissance. Sans eux, on ne peut ni bâtir un parcours, ni
appliquer la règle des 15 ans, puisque Google ne fournit que l'identité.

**Sans clés** : l'application bascule en mode démonstration, et un encart
apparaît en bas de l'écran de connexion avec un compte élève déjà diagnostiqué
(Léa, 4e) et un compte professeur. Cet encart est **invisible** dès que les clés
sont présentes, il n'a rien à faire devant un vrai utilisateur.

Le rôle décide de l'espace : élève, professeur ou parent. Chacun est cloisonné,
personne ne peut ouvrir l'espace d'un autre en tapant l'URL.

---

## 3. Les commandes disponibles

| Commande | Ce qu'elle fait | Quand |
|----------|-----------------|-------|
| `npm run dev` | Serveur de développement (port 5173) | Au quotidien |
| `npm test` | Tests unitaires du moteur et du repository | Avant de committer |
| `npm run test:watch` | Relance les tests à chaque sauvegarde | Pendant qu'on code le moteur |
| `npm run test:sql` | Rejoue **toutes** les migrations et les politiques RLS dans un Postgres jetable | Après toute modif de `supabase/migrations/` |
| `npm run check:supabase` | Vérifie que le projet Supabase réel répond et que les tables sont là | En cas de doute sur la base |
| `npm run check:db` | Triggers, RLS, escalade de privilège et capacité, contre le **vrai** projet | Après une migration appliquée |
| `npm run build` | Vérifie les types puis fabrique `dist/` | Avant de déployer |
| `npm run preview` | Sert le build de production | Tester le build final |
| `npm run lint` | ESLint, **zéro warning toléré** | Avant de committer |
| `npm run format` | Prettier | Quand le code est mal indenté |

**Avant tout commit : `npm test && npm run lint && npm run build`.** Les trois
doivent passer. Le zéro warning est volontaire.

### Les quatre niveaux de vérification

Du plus isolé au plus réel. Comprendre ce que chacun prouve évite de croire qu'on
a testé quelque chose qu'on n'a pas testé.

1. `npm test` : le moteur en isolation. Ne touche **pas** à Supabase.
2. `npm run test:sql` : le schéma et les politiques, dans Docker. Prouve que le
   SQL est correct, pas qu'il est appliqué.
3. `npm run check:supabase` : le projet réel est réveillé et les tables sont là.
4. `npm run check:db` : crée de vrais comptes, joue les scénarios, puis nettoie.
   C'est le seul qui prouve que les triggers et les politiques fonctionnent.
   Nécessite `SUPABASE_SERVICE_ROLE_KEY`.

**Aucun des quatre ne teste l'interface.** Les parcours navigateur restent à
dérouler à la main, la liste est dans `ROADMAP.md` §1.

---

## 4. La structure des fichiers

```
Math_Edu_Application/
│
├── index.html            ← Point d'entrée HTML. Charge src/main.tsx.
├── package.json          ← Dépendances et commandes npm.
├── vite.config.ts        ← Vite : port, alias @/..., tests, découpage des chunks.
├── tailwind.config.js    ← Jetons de couleur de la marque.
├── .env.local            ← VOS clés (IGNORÉ par Git, ne part jamais en ligne).
│
├── supabase/
│   ├── migrations/       ← LE SCHÉMA. Un fichier par changement, numéroté.
│   └── tests/            ← Harnais SQL rejouable (run.sh, integration.mjs).
│
└── src/
    │
    ├── main.tsx          ← Démarre React, le routeur et le SessionProvider.
    ├── App.tsx           ← Les routes et les gardes d'accès.
    ├── index.css         ← Styles globaux (Tailwind, KaTeX, markmap).
    │
    ├── pages/            ← Un fichier = un écran = une URL.
    │   ├── LoginPage            /connexion            public
    │   ├── WelcomePage          /bienvenue            complétion après Google
    │   ├── PlacementTestPage    /test                 élève
    │   ├── WorkspacePage        /travail              élève, plan du jour
    │   ├── PathPage             /parcours             élève, graphe et chemin
    │   ├── ExercisePage         /exercice/:skillId    élève
    │   ├── MindmapListPage      /cartes               élève
    │   ├── MindmapPage          /cartes/:id           élève
    │   ├── SchedulePage         /cours                élève, réservation
    │   ├── TeacherSchedulePage  /prof/cours           professeur
    │   ├── ParentPage           /parent               parent
    │   ├── SubscriptionPage     /abonnement           connecté
    │   └── ProfilePage          /profil               connecté
    │
    ├── components/
    │   ├── ui/                     Design system : Button, Card, Badge, Field...
    │   ├── layout/AppShell         Navigation (rail desktop, barre du bas mobile)
    │   ├── layout/SyncErrorBanner  Avertit quand une écriture a échoué
    │   ├── dag/                    DagGraph (react-flow), DagPath, SkillDetailPanel
    │   ├── exercise/AnswerInput    Saisie selon le type d'exercice
    │   └── mindmap/MindmapView     Rendu Markmap
    │
    ├── lib/              ← LE MOTEUR. Pur, sans React, testé.
    │   ├── dag.ts               Progression : déblocage, maîtrise, redescente
    │   ├── placement.ts         Test de positionnement adaptatif
    │   ├── exercise.ts          Correction d'une réponse
    │   ├── age.ts               Âge et seuil de consentement parental
    │   ├── id.ts                Identifiants, avec repli hors contexte sécurisé
    │   ├── redirect.ts          Nettoyage des destinations de redirection
    │   ├── format.ts            Dates, durées, euros, niveaux scolaires
    │   ├── mindmapTree.ts       Markdown hiérarchique → arbre Markmap
    │   ├── supabase.ts          Client Supabase
    │   └── *.test.ts            Les tests de ce moteur
    │
    ├── state/
    │   ├── SessionProvider      Session, progression, réservations, erreurs d'écriture
    │   ├── session.ts           Contrat et hooks useSession
    │   ├── usePlan.ts           Le plan du jour (dérivé du DAG)
    │   └── useBookings.ts       Réservations et créneaux enrichis
    │
    ├── data/             ← LA COUTURE. Tout l'état élève passe par là.
    │   ├── repository.ts           L'interface, une mutation par intention
    │   ├── supabaseRepository.ts   L'implémentation réelle
    │   ├── mockRepository.ts       L'implémentation factice (localStorage)
    │   └── index.ts                Choisit le repository actif
    │
    ├── content/          ← Le contenu pédagogique de Marius (3 JSON) et son index.
    ├── mocks/mockData.ts ← La seule source de données inventées.
    └── types/            ← content.ts (contenu) et domain.ts (état élève).
```

### Les principes à retenir

- **Le moteur est dans `lib/`, il est pur, il est testé.** Aucun composant React
  dedans, aucune dépendance au navigateur. C'est ce qui permettra de le déplacer
  côté serveur au sprint 3 sans le réécrire.
- **Aucun composant ne contient de donnée en dur.** Tout passe par `data/` ou
  `content/`.
- **`data/repository.ts` expose une mutation par intention, jamais une
  sauvegarde en bloc.** L'ancienne version réécrivait toute la session à chaque
  changement d'état : tenable contre `localStorage`, intenable contre Postgres où
  une seule réponse d'exercice aurait réécrit les 38 lignes de progression.
- **Le repository actif est choisi automatiquement** dans `data/index.ts` :
  Supabase dès que les clés sont là, le mock sinon. `VITE_USE_MOCK=true` force le
  mock malgré des clés valides, pour faire une démonstration sans toucher aux
  vraies données.
- Le raccourci `@/` pointe vers `src/`. Exemple : `import { skills } from '@/content'`.

---

## 5. Le backend Supabase

### Les clés

Dans `.env.local`, ignoré par Git. Modèle dans `.env.example`.

| Variable | Rôle | Envoyée au navigateur |
|----------|------|------------------------|
| `VITE_SUPABASE_URL` | URL du projet | oui, publique |
| `VITE_SUPABASE_ANON_KEY` | Clé publishable (ex « anon »), protégée par les RLS | oui, publique |
| `VITE_USE_MOCK` | `true` force les données factices | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète, scripts locaux uniquement | **non, jamais** |

Où les trouver : **Project Settings → API**. La publishable key va dans
`VITE_SUPABASE_ANON_KEY`, la `service_role` (appelée « secret key » dans la
nouvelle interface) dans `SUPABASE_SERVICE_ROLE_KEY`.

### Le schéma

Il vit dans `supabase/migrations/`, un fichier par changement, numéroté. Chaque
fichier explique ce qu'il fait et pourquoi. Pour l'appliquer : Supabase → **SQL
Editor** → New query → coller → Run. Les fichiers sont rejouables, les relancer
par erreur ne casse rien.

**Règle absolue : ne jamais modifier une migration déjà appliquée.** On en crée
une nouvelle. Sinon la base et le dépôt divergent, et plus personne ne sait ce
qui tourne réellement.

### ⚠ Cinq pièges à connaître

**1. Les variables d'environnement au déploiement.** `.env.local` ne part jamais
sur Git ni en ligne. Au moment de déployer, il faut recopier chaque variable
`VITE_*` dans les Variables d'environnement de l'hébergeur. C'est le bug n°1 :
tout marche en local, rien ne marche en ligne.

**2. Le préfixe `VITE_` n'est pas cosmétique.** Tout ce qui le porte est embarqué
dans le JavaScript envoyé au navigateur. La clé `service_role` contourne toutes
les politiques RLS : dans le bundle, elle donnerait à n'importe quel visiteur un
accès total en lecture et en écriture.

**3. Les politiques RLS qui se lisent entre elles partent en récursion
infinie**, avec une erreur illisible. C'est la première cause de perte de temps
sur Supabase. Toutes les jointures d'autorisation sont donc isolées dans des
fonctions `security definer` (`est_prof_de`, `est_parent_de`, `role_actuel`,
`peut_lire_eleve`, `nb_places_prises`). Faire pareil pour toute nouvelle règle.

**4. Une règle qui doit valoir pour tout le monde doit être `security
definer`.** Deux bugs de production sont venus de là : un trigger qui lisait une
table sous les droits de l'élève ne voyait rien, et une vue qui comptait des
lignes filtrées par le RLS du lecteur donnait un total faux. Si une fonction doit
voir la vérité indépendamment de qui appelle, elle est `security definer`.

**5. Le tier gratuit met un projet en pause après une semaine d'inactivité**,
puis finit par le supprimer. Un projet a déjà été perdu comme ça. Le workflow
`.github/workflows/supabase-keepalive.yml` fait une requête hebdomadaire et
alerte par email si le projet ne répond plus.

---

## 6. Comment ajouter quelque chose

### Ajouter une page

1. Créer `src/pages/MaPage.tsx`, composant React exporté par défaut.
2. La déclarer dans **`src/App.tsx`** (et non `main.tsx`), chargée à la demande
   si elle embarque une grosse dépendance :
   ```tsx
   const MaPage = lazy(() => import('@/pages/MaPage'))
   ```
3. Ajouter la route avec la garde qui convient :
   ```tsx
   <Route
     path="/ma-page"
     element={
       <RequireAuth roles={ELEVE}>
         <MaPage />
       </RequireAuth>
     }
   />
   ```
   `roles` est optionnel : sans lui, la page est ouverte à tout compte connecté.
   `RequireAuth` redirige aussi vers `/bienvenue` tant que le profil est
   incomplet.
4. Si la page doit apparaître dans la navigation, l'ajouter au bon tableau de
   `src/components/layout/AppShell.tsx` (`STUDENT_NAV`, `TEACHER_NAV`,
   `PARENT_NAV`).

### Toucher au schéma de la base

1. **Créer un nouveau fichier** `supabase/migrations/000N_ce_que_ca_fait.sql`.
   Ne jamais modifier un fichier déjà appliqué.
2. Le rendre rejouable : `create table if not exists`, `create or replace
   function`, et `drop policy if exists` avant chaque `create policy`.
3. Écrire en tête du fichier **ce qu'il corrige et pourquoi**. Les quatre
   migrations existantes sont le modèle à suivre.
4. Ajouter les assertions correspondantes dans `supabase/tests/`, **sous
   `set role authenticated` avec un JWT**, jamais en propriétaire de table.
5. `npm run test:sql`, puis appliquer dans le SQL Editor, puis `npm run check:db`.

### Ajouter une écriture en base

Passer par `data/repository.ts` : ajouter une méthode à l'interface, l'implémenter
dans **les deux** repositories (Supabase et mock), et ajouter son test de contrat
dans `data/mockRepository.test.ts`. Le provider appelle la mutation et met l'état
local à jour, jamais l'inverse.

### Ajouter un composant réutilisable

Regarder d'abord dans `src/components/ui/` : le design system existe (Button,
Card, Badge, Field, Notice, EmptyState, Progress, Avatar, Toggle...). N'en créer
un nouveau que si rien ne colle.

### Toucher au moteur

Toute modification de `lib/dag.ts`, `lib/placement.ts` ou `lib/exercise.ts`
**s'accompagne d'un test**. Ces trois fichiers décident de ce qu'un élève voit et
de ce qui est compté juste : une régression silencieuse y coûte très cher.
Lancer `npm run test:watch` pendant qu'on y travaille.

### Ajouter un style

Classes Tailwind directement dans le JSX. Les couleurs sont des jetons de la
marque (`text-ink`, `bg-accent`, `border-line`...), définis dans
`tailwind.config.js`. **Ne jamais écrire une couleur en dur.**

---

## 7. Règles de travail

- **Une fonctionnalité = une session Claude Code = un commit.**
- **Jamais de clé sur Git.** Vérifier avec `git status` qu'aucun `.env.local`
  n'apparaît avant de committer.
- **`npm test && npm run lint && npm run build` avant de committer.**
- **Jamais de bouton inerte.** Un bouton non branché ne s'affiche pas : mieux
  vaut absent que mort.
- **Jamais de texte mensonger.** Ne pas annoncer à l'écran ce que le code ne fait
  pas, par exemple « un email a été envoyé » alors que rien n'en envoie.
- **Jamais de correction silencieuse.** Une écriture qui échoue est dite à
  l'utilisateur, via `SyncErrorBanner` : un élève qui a travaillé pour rien doit
  l'apprendre.
- **Toute assertion SQL tourne sous le contexte d'un vrai utilisateur.** Le
  propriétaire de table contourne le RLS, donc un test qui s'exécute en
  propriétaire ne teste rien. Deux bugs sont passés par cet angle mort.
- **Le contenu pédagogique reste du JSON versionné.** Cette app le consomme, elle
  ne le modifie pas. Git reste la source de vérité, même après le seed en base.
- **Fin de sprint : mettre `ROADMAP.md` à jour.** C'est ce qui permet de reprendre
  après une interruption.

---

## 8. Prochaines étapes

Le détail, avec les prérequis dans le bon ordre et les pièges, est dans
**`ROADMAP.md`**. En résumé :

1. **Sprint 2b** : Node 24, domaine, Resend, consentement parental enfin
   obtenable. C'est le blocage réglementaire n°1.
2. **Sprint 3** : contenu en base, correction des réponses côté serveur (elles
   sont aujourd'hui dans le bundle), TanStack Query.
3. **Sprint 4** : dépôt dédié, Netlify, domaine, PWA, landing et politique de
   confidentialité.
4. **Sprint 5** : espace parent réel.
5. **Sprint 6** : Playwright et `/security-review`, avant le premier élève.

**Côté contenu (Marius) :** la relecture humaine des 69 exercices, puis les
exercices des **15 compétences qui n'en ont aucun**. Le code sait les contourner
sans casser, mais elles dégradent la précision du diagnostic.
