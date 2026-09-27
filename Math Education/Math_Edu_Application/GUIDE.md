# Guide de l'application MATH EDUCATION

> Manuel d'utilisation et explication de la structure du code.
> Destiné à Gauthier et Marius. À lire avant de toucher au projet.
> Pour le contexte produit complet (DAG, roadmap, modèle éco), voir `../CLAUDE.md`.

---

## 1. Ce que c'est

L'application web MATH EDUCATION, nom de produit **Racine**.

Techniquement, c'est une **application** (comptes, base de données, logique métier),
pas un simple site vitrine. Elle tourne dans le navigateur (React).

**Où en est le projet, honnêtement.** Les écrans existent et fonctionnent, adossés
au vrai contenu pédagogique de Marius. Le moteur de progression sur le DAG, le test
de positionnement adaptatif et la révision espacée sont codés et couverts par des
tests. L'authentification (Google et email) et la base de données sont **codées et
testées**, mais elles attendent un projet Supabase : le précédent a été supprimé
par le tier gratuit après une semaine d'inactivité. Tant que `.env.local` est vide,
l'application tourne en **mode démonstration** sur des données factices.

Ce qui manque encore : **les emails** (donc le consentement parental reste
impossible à obtenir), le **paiement**, et l'**espace parent réel**.

**Les briques installées aujourd'hui :**

| Brique | Rôle | Statut |
|--------|------|--------|
| React 18 | Construire l'interface (les écrans) | En place |
| Vite 5 | Serveur de dev rapide + build de production | En place |
| TypeScript | Typage du code (moins de bugs, autocomplétion) | En place |
| Tailwind CSS 3 | Mise en forme (styles) sans écrire de CSS à la main | En place |
| react-router 6 | Naviguer entre les écrans (URL → page) | En place, 14 routes |
| KaTeX | Rendu des formules mathématiques | En place |
| react-flow | Visualisation du DAG de compétences | En place |
| Markmap | Rendu des cartes mentales | En place |
| Vitest | Tests unitaires du moteur et du repository | En place, 176 tests |
| Supabase | Base de données + comptes + sécurité (RLS) | **Codé et testé, attend un projet** |
| Docker | Postgres jetable pour tester le schéma SQL | Utilisé par `npm run test:sql` |

---

## 2. Prise en main (5 minutes)

### Prérequis
- **Node.js ≥ 18.18** installé (la version est épinglée dans `.nvmrc`).
- Un terminal ouvert dans le dossier `Math_Edu_Application/`.

### Première fois
```bash
npm install
```
Installe toutes les dépendances dans `node_modules/` (ce dossier n'est jamais
versionné sur Git). À refaire seulement quand les dépendances changent.

### Lancer l'application en local
```bash
npm run dev
```
Ouvre ensuite **http://localhost:5173**. La page se recharge automatiquement à
chaque modification du code (Hot Reload). Pour arrêter : `Ctrl + C` dans le terminal.

### Se connecter

**Avec un projet Supabase configuré** (`.env.local` renseigné) : bouton « Continuer
avec Google », ou inscription et connexion par email et mot de passe. Un compte créé
par Google passe d'abord par `/bienvenue`, qui réclame le niveau scolaire et la date
de naissance. Sans eux on ne peut ni bâtir un parcours, ni appliquer la règle des
15 ans.

**Sans projet Supabase** : l'app bascule en mode démonstration, et un encart
« Mode démonstration » apparaît en bas de l'écran de connexion avec deux entrées, un
élève déjà diagnostiqué (Léa, 4e) et un professeur. Cet encart est **invisible** dès
que les clés sont présentes.

Le rôle décide de l'espace : élève, professeur ou parent. Chacun est cloisonné,
personne ne peut ouvrir l'espace d'un autre en tapant l'URL.

---

## 3. Les commandes disponibles

| Commande | Ce qu'elle fait | Quand l'utiliser |
|----------|-----------------|------------------|
| `npm run dev` | Lance le serveur de développement (port 5173) | Au quotidien, pour coder |
| `npm test` | Lance les tests unitaires (moteur + repository) | Avant de committer |
| `npm run test:sql` | Rejoue le schéma SQL et les politiques RLS dans un Postgres jetable (Docker) | Après toute modif de `supabase/migrations/` |
| `npm run test:watch` | Relance les tests à chaque sauvegarde | Pendant qu'on code le moteur |
| `npm run build` | Vérifie les types puis fabrique la version de production dans `dist/` | Avant de déployer |
| `npm run preview` | Sert localement la version de production | Tester le build final |
| `npm run lint` | Analyse le code (ESLint) et signale les erreurs de style/qualité | Avant de committer |
| `npm run format` | Reformate automatiquement le code (Prettier) | Quand le code est mal indenté |

**Avant tout commit : `npm test && npm run lint && npm run build`.** Les trois
doivent passer. Le lint est réglé sur zéro warning toléré, c'est volontaire.

---

## 4. La structure des fichiers

```
Math_Edu_Application/
│
├── index.html            ← Point d'entrée HTML. Charge src/main.tsx.
├── package.json          ← Liste des dépendances et des commandes npm.
├── vite.config.ts        ← Configuration de Vite (port, alias @/..., tests).
├── tsconfig*.json        ← Configuration TypeScript (règles de typage).
├── tailwind.config.js    ← Configuration Tailwind (couleurs de la marque...).
├── .env.local            ← VOS clés réelles (IGNORÉ par Git, ne part jamais en ligne).
│
└── src/                  ← TOUT LE CODE DE L'APPLICATION
    │
    ├── main.tsx          ← Démarre React, le routeur et le SessionProvider.
    ├── App.tsx           ← Les routes (URL → écran) et les gardes d'accès.
    ├── index.css         ← Styles globaux (Tailwind, KaTeX, markmap).
    │
    ├── pages/            ← Un fichier = un écran = une URL.
    │   ├── LoginPage            /connexion
    │   ├── PlacementTestPage    /test              (élève)
    │   ├── WorkspacePage        /travail           (élève) plan du jour
    │   ├── PathPage             /parcours          (élève) graphe + chemin
    │   ├── ExercisePage         /exercice/:skillId (élève)
    │   ├── MindmapListPage      /cartes            (élève)
    │   ├── MindmapPage          /cartes/:id        (élève)
    │   ├── SchedulePage         /cours             (élève) réservation
    │   ├── TeacherSchedulePage  /prof/cours        (professeur)
    │   ├── ParentPage           /parent            (parent)
    │   ├── SubscriptionPage     /abonnement
    │   └── ProfilePage          /profil
    │
    ├── components/       ← Briques d'interface réutilisables.
    │   ├── ui/                  Design system : Button, Card, Badge, Field...
    │   ├── layout/AppShell      Navigation (rail desktop, barre du bas mobile)
    │   ├── dag/                 DagGraph (react-flow), DagPath, SkillDetailPanel
    │   ├── exercise/AnswerInput Saisie de réponse selon le type d'exercice
    │   └── mindmap/MindmapView  Rendu Markmap
    │
    ├── lib/              ← LE MOTEUR. C'est le cœur métier, et il est testé.
    │   ├── dag.ts               Progression : déblocage, maîtrise, redescente
    │   ├── placement.ts         Test de positionnement adaptatif
    │   ├── exercise.ts          Correction d'une réponse
    │   ├── format.ts            Dates, durées, euros, niveaux scolaires
    │   ├── mindmapTree.ts       Markdown hiérarchique → arbre Markmap
    │   ├── supabase.ts          Client Supabase (pas encore utilisé)
    │   └── *.test.ts            Les tests de ce moteur
    │
    ├── state/            ← État applicatif partagé.
    │   ├── SessionProvider      Session, progression, réservations
    │   ├── session.ts           Contrat + hooks useSession
    │   ├── usePlan.ts           Le plan du jour (dérivé du DAG)
    │   └── useBookings.ts       Réservations et créneaux enrichis
    │
    ├── data/             ← Couche d'accès aux données. LA couture Supabase.
    │   ├── repository.ts        L'interface DataRepository
    │   ├── mockRepository.ts    Implémentation factice (localStorage)
    │   └── index.ts             Choisit le repository actif  ← 1 ligne à changer
    │
    ├── content/          ← Le contenu pédagogique de Marius (3 JSON) + index.
    ├── mocks/mockData.ts ← Données factices (Léa, prof Marc, créneaux).
    └── types/            ← content.ts (contenu) et domain.ts (état élève).
```

### Les principes à retenir
- **Le moteur est dans `lib/`, il est pur, il est testé.** Aucun composant React
  dedans, aucune dépendance au navigateur. C'est ce qui permet de le déplacer côté
  serveur plus tard sans le réécrire.
- **Aucun composant ne contient de donnée en dur.** Tout passe par `data/` ou
  `content/`. Le jour où Supabase remplace le mock, aucun écran ne bouge.
- **Un seul point à changer pour brancher la base** : `src/data/index.ts`.
- Le raccourci `@/` pointe vers `src/`. Exemple : `import { skills } from '@/content'`.

---

## 5. Configurer le backend Supabase

Les clés sont déjà renseignées dans `.env.local`, mais **l'application ne s'en sert
pas encore** : `src/data/index.ts` utilise le repository factice. Brancher la base
est le chantier du prochain sprint, et il suppose d'abord de créer les tables et les
politiques RLS.

Pour mémoire, récupérer les clés : projet sur **supabase.com** (région `eu-west`),
puis **Project Settings → API** → `Project URL` et `anon public key`, à coller dans
`.env.local` :
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### ⚠ Trois pièges à connaître

**Les variables d'environnement au déploiement.** Vos clés sont dans `.env.local`
en local, mais ce fichier ne part JAMAIS sur Git ni en ligne. Au moment de déployer
sur Netlify ou Vercel, il faut recopier ces mêmes variables (`VITE_SUPABASE_URL`,
`VITE_SUPABASE_ANON_KEY`) dans les **Variables d'environnement** du service. C'est
le bug n°1 : tout marche en local, rien ne marche en ligne, parce que les variables
n'ont pas été configurées côté hébergeur.

**La Row Level Security (RLS) Supabase.** Supabase bloque par défaut l'accès à
toutes les tables tant que vous n'avez pas défini de politiques de sécurité.
Symptôme : l'app affiche « pas de données » alors que la base est remplie. La
solution : demander à Claude Code de « configurer les politiques RLS appropriées »,
puis copier les règles générées dans Supabase.

**Ne jamais mettre la clé `service_role` dans le code de l'app** : c'est une clé
administrateur qui contourne toute la sécurité. Elle reste côté serveur uniquement.

---

## 6. Comment ajouter quelque chose (recettes rapides)

### Ajouter une page
1. Créer `src/pages/MaPage.tsx` avec un composant React exporté par défaut.
2. La déclarer dans **`src/App.tsx`** (et non `main.tsx`), en la chargeant à la
   demande si elle embarque une grosse dépendance :
   ```tsx
   const MaPage = lazy(() => import('@/pages/MaPage'))
   ```
3. Ajouter la route, avec la garde d'accès qui convient :
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
4. Si la page doit apparaître dans la navigation, l'ajouter au bon tableau de
   `src/components/layout/AppShell.tsx` (`STUDENT_NAV`, `TEACHER_NAV`, `PARENT_NAV`).

### Ajouter un composant réutilisable
Regarder d'abord dans `src/components/ui/` : le design system existe déjà (Button,
Card, Badge, Field, Notice, EmptyState, Progress...). N'en créer un nouveau que si
rien ne colle.

### Toucher au moteur
Toute modification de `lib/dag.ts`, `lib/placement.ts` ou `lib/exercise.ts`
**s'accompagne d'un test**. Ces trois fichiers décident de ce qu'un élève voit et de
ce qui est compté juste : une régression silencieuse y coûte très cher. Lancer
`npm run test:watch` pendant qu'on y travaille.

### Ajouter un style
Utiliser les classes Tailwind directement dans le JSX. Les couleurs sont des jetons
de la marque (`text-ink`, `bg-accent`, `border-line`...), définis dans
`tailwind.config.js`. Ne pas écrire de couleur en dur.

---

## 7. Règles de travail

- **Une fonctionnalité = une session Claude Code = un commit** (cf. `../CLAUDE.md`).
- **Jamais de clé sur Git.** Vérifier avec `git status` qu'aucun `.env.local`
  n'apparaît avant de committer.
- **`npm test && npm run lint && npm run build` avant de committer.**
- **Jamais de bouton inerte.** Un bouton qui n'est pas encore branché ne doit pas
  être affiché : mieux vaut un bouton absent qu'un bouton mort. Même règle pour les
  textes : ne jamais annoncer à l'écran quelque chose que le code ne fait pas (par
  exemple « un email a été envoyé » alors que rien n'envoie d'email).
- **Le contenu pédagogique (DAG, exercices, cartes) reste du JSON versionné.** Cette
  app le consomme, elle ne le modifie pas. Il sera chargé en base par un script de
  seed, mais Git reste la source de vérité.

---

## 8. Prochaines étapes

Le détail complet est dans le plan d'audit et dans `../CLAUDE.md` section 7.
Dans l'ordre :

1. **Authentification et base** : Supabase Auth (Google + email), tables, politiques
   RLS, `supabaseRepository`. C'est ce qui rend la progression durable et partageable.
2. **Emails** : confirmation du consentement parental, aujourd'hui impossible à obtenir.
3. **Contenu en base et correction côté serveur** : sortir les réponses des exercices
   du bundle livré au navigateur, et casser la limite de taille du contenu.
4. **Mise en ligne** : dépôt GitHub dédié, Netlify, domaine, PWA installable,
   landing publique et politique de confidentialité.
5. **Espace parent** : consentement, export et suppression des données, suivi de
   l'enfant, résumé hebdomadaire.
6. **Filet de sécurité** : Playwright sur les parcours critiques, `/security-review`.

**Côté contenu (Marius) :** 15 des 38 compétences du contenu pilote n'ont encore
aucun exercice. Le code sait maintenant les contourner sans casser, mais elles
dégradent la qualité du diagnostic tant qu'elles sont vides.
