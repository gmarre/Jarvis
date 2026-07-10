# Guide de l'application MATH EDUCATION

> Manuel d'utilisation et explication de la structure du code.
> Destiné à Gauthier et Marius. À lire avant de toucher au projet.
> Pour le contexte produit complet (DAG, roadmap, modèle éco), voir `../CLAUDE.md`.

---

## 1. Ce que c'est

L'application web MATH EDUCATION. Pour l'instant, une base technique « Hello World »
prête à accueillir toute la suite : moteur de progression sur le DAG, exercices,
cartes mentales, comptes élèves/professeurs, déploiement en ligne.

Techniquement, c'est une **application** (comptes, base de données, logique métier),
pas un simple site vitrine. Elle tourne dans le navigateur (React) et parle à une
base de données hébergée (Supabase).

**Les briques installées aujourd'hui :**

| Brique | Rôle | Statut |
|--------|------|--------|
| React 18 | Construire l'interface (les écrans) | En place |
| Vite 5 | Serveur de dev rapide + build de production | En place |
| TypeScript | Typage du code (moins de bugs, autocomplétion) | En place |
| Tailwind CSS 3 | Mise en forme (styles) sans écrire de CSS à la main | En place |
| react-router 6 | Naviguer entre les écrans (URL → page) | En place, 1 route |
| Supabase | Base de données + comptes + sécurité (RLS) | Câblé, pas encore branché |
| KaTeX, react-flow, Markmap | Formules, visualisation du DAG, cartes mentales | À ajouter plus tard |

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

L'app démarre **sans** clés Supabase : le Hello World s'affiche, avec une mention
« Backend non configuré ». C'est normal au début.

---

## 3. Les commandes disponibles

| Commande | Ce qu'elle fait | Quand l'utiliser |
|----------|-----------------|------------------|
| `npm run dev` | Lance le serveur de développement (port 5173) | Au quotidien, pour coder |
| `npm run build` | Vérifie les types puis fabrique la version de production dans `dist/` | Avant de déployer, ou pour vérifier que tout compile |
| `npm run preview` | Sert localement la version de production | Tester le build final |
| `npm run lint` | Analyse le code (ESLint) et signale les erreurs de style/qualité | Avant de committer |
| `npm run format` | Reformate automatiquement le code (Prettier) | Quand le code est mal indenté |

---

## 4. La structure des fichiers

```
Math_Edu_Application/
│
├── index.html            ← Point d'entrée HTML. Charge src/main.tsx.
├── package.json          ← Liste des dépendances et des commandes npm.
├── vite.config.ts        ← Configuration de Vite (port, alias @/...).
├── tsconfig*.json         ← Configuration TypeScript (règles de typage).
├── tailwind.config.js    ← Configuration Tailwind (couleurs de la marque...).
├── postcss.config.js     ← Pipeline CSS (Tailwind + autoprefixer).
├── .eslintrc.cjs         ← Règles de qualité de code.
├── .prettierrc           ← Règles de formatage.
├── .nvmrc                ← Version de Node à utiliser (18.18.0).
│
├── .env.example          ← Modèle des variables d'environnement (VERSIONNÉ, vide).
├── .env.local            ← VOS clés réelles (IGNORÉ par Git, ne part jamais en ligne).
├── .gitignore            ← Liste de ce qui ne doit pas aller sur Git.
│
├── README.md             ← Résumé technique rapide.
├── GUIDE.md              ← Ce fichier.
│
├── node_modules/         ← Dépendances installées (jamais sur Git).
├── dist/                 ← Build de production (généré, jamais sur Git).
│
├── public/               ← Fichiers statiques servis tels quels (favicon, images...).
│
└── src/                  ← TOUT LE CODE DE L'APPLICATION
    │
    ├── main.tsx          ← Démarre React et met en place le routage (les URL).
    ├── App.tsx           ← La page d'accueil (Hello World pour l'instant).
    ├── index.css         ← Styles globaux (charge Tailwind).
    ├── vite-env.d.ts     ← Déclare les types des variables d'environnement.
    │
    ├── lib/              ← Code utilitaire partagé.
    │   └── supabase.ts   ← Connexion à la base de données Supabase.
    │
    ├── components/       ← Briques d'interface réutilisables (À VENIR).
    │                       Futurs : DagView, ExercisePlayer, MindmapView, Dashboard.
    │
    ├── pages/            ← Un fichier = un écran/une URL (À VENIR).
    │                       Futurs : landing, connexion, tableau de bord élève, exercice...
    │
    └── types/            ← Définitions TypeScript partagées (À VENIR).
                            Futurs : Skill, Exercise, Mindmap, SkillProgress, Profile.
```

### Le principe à retenir
- **Tout le code va dans `src/`.**
- Les **pages** (écrans complets) vont dans `src/pages/`.
- Les **composants** (morceaux réutilisables comme un bouton, une carte) vont dans `src/components/`.
- Les **types** (formes des données) vont dans `src/types/`, et devront coller aux
  3 schémas JSON figés avec Marius (le « contrat d'interface », cf. `../CLAUDE.md`).
- Le raccourci `@/` pointe vers `src/`. Exemple : `import App from '@/App'` au lieu
  de chemins relatifs compliqués.

---

## 5. Configurer le backend Supabase (quand vous serez prêts)

Tant que le Hello World suffit, vous pouvez sauter cette étape.

1. Créer un projet sur **supabase.com** (région Europe : `eu-west`).
2. Dans **Project Settings → API**, copier :
   - `Project URL`
   - `anon public key`
3. Ouvrir `.env.local` et coller les valeurs :
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJhbGci...
   ```
4. Relancer `npm run dev`. La page affichera maintenant « Backend configuré ».

### ⚠ Deux pièges à connaître

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

Ces recettes se feront surtout via Claude Code, mais voici la logique.

### Ajouter une page
1. Créer `src/pages/MaPage.tsx` avec un composant React.
2. L'enregistrer dans `src/main.tsx` :
   ```tsx
   <Route path="/ma-page" element={<MaPage />} />
   ```
3. La page est accessible sur `http://localhost:5173/ma-page`.

### Ajouter un composant réutilisable
Créer `src/components/MonComposant.tsx`, puis l'importer là où on en a besoin :
`import MonComposant from '@/components/MonComposant'`.

### Ajouter un style
Utiliser les classes Tailwind directement dans le JSX, par exemple
`className="text-brand-700 font-bold"`. Pas besoin d'écrire de CSS séparé.

---

## 7. Règles de travail

- **Une fonctionnalité = une session Claude Code = un commit** (cf. `../CLAUDE.md`).
- **Jamais de clé sur Git.** Vérifier avec `git status` qu'aucun `.env.local`
  n'apparaît avant de committer.
- **Lancer `npm run build` avant de déployer** : si ça compile en local, ça évite
  les mauvaises surprises en ligne.
- **Le contenu pédagogique (DAG, exercices, cartes) ne vit PAS ici** mais dans des
  fichiers JSON versionnés (dossier `/content` du futur repo), chargés en base par
  un script. Cette app consomme ces données, elle ne les stocke pas en dur.

---

## 8. Prochaines étapes (rappel roadmap)

Cette base correspond au tout début du **Jalon 2** (application avec données
factices). Les étapes suivantes, dans l'ordre :

1. Figer les 3 schémas JSON avec Marius (contrat d'interface).
2. Maquettes des écrans (Claude Design).
3. Session `/plan` pour l'architecture détaillée avant de coder les vrais écrans.
4. Générer des données factices, développer les composants clés (DagView, etc.).
5. Brancher Supabase (auth, tables, RLS), puis déployer sur Netlify.

Détail complet dans `../CLAUDE.md`, section 7 (Roadmap MVP).
