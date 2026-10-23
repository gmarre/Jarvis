# CLAUDE.md, MATH EDUCATION (« Racine »)

> Socle chargé à chaque session : règles, état en bref, index. **Il ne reçoit jamais d'historique** (plafond 10 Ko). L'avancement s'écrit dans `pilotage/SPRINT.md` (importé en bas de ce fichier) ; tout le reste se lit à la demande (§5).
>
> Projet étanche : rien de TRADING ni de CHARTER ici, et **jamais de fichier « Charter Diving » dans un commit**.
>
> Règles de réponse : français, ton direct, pas de tirets longs.

---

## 1. Le projet en bref

Application web d'apprentissage adaptatif des mathématiques, CP à Terminale à terme. Un DAG de compétences permet de trouver la lacune racine d'un élève (même deux classes en arrière) et de ne lui faire travailler que ce qui manque. Exercices sur 3 niveaux, cartes mentales, cartes défi, super exercices, révision espacée.

- **Équipe :** Gauthier (dev et produit, il pilote avec Claude) et Marius (contenu mathématique ; il mène la recette du contenu dans l'app, Gauthier n'y valide rien).
- **Contraintes :** budget total **500 €**, **4 h par semaine et par personne**. Quand une option est plus propre mais plus longue, la plus courte gagne.
- **Calendrier :** le déploiement vient en dernier (bloc D), une fois le contenu jusqu'à la 3e et le backlog terminés ; la bêta fermée (5 à 10 élèves) suit et sera replanifiée à ce moment.
- **Modèle économique visé :** abonnement élève 9,99 €/mois ; cours avec professeur 20 € les 1 h 30, 3 élèves maximum. **Rien n'est encaissé pendant la bêta** (`/abonnement` est informatif).

## 2. État en bref (23 octobre 2026, détail dans `pilotage/ETAT.md`)

- **Contenu :** 273 compétences, 1 654 exercices, 65 cartes mentales, 1 475 cartes défi, 270 super exercices, tous `relu_agent`, recette de Marius à venir. Étapes 1 à 8 rédigées et publiées (23 octobre 2026).
- **Application :** React, Supabase ; **tourne en local seulement, rien n'est déployé.** Progression écrite côté serveur (`corriger` v17, `rendre-super` v3).
- **En attente de Gauthier :** Cron `supabase/cron/rappels.sql` (`pg_cron` absent, secret `CRON_SECRET` à créer). Dernière migration appliquée : 0024 (23 octobre 2026, vérifiée en base).

## 3. Règles de travail (à respecter sans qu'on les redise)

**Sécurité et opérations**
- `SUPABASE_SERVICE_ROLE_KEY` : jamais affichée, jamais préfixée `VITE_`, lue seulement par les scripts locaux depuis `.env.local`.
- Le fichier Google `client_secret_*.json` n'est jamais commité.
- **Migrations : jamais par l'outil MCP `apply_migration` (refusé par Gauthier).** Fichier numéroté suivant, rejouable, que Gauthier colle dans le SQL Editor ; jamais modifier une migration appliquée. Procédure : skill `migration`.
- Outils MCP Supabase acceptés : `deploy_edge_function`, `get_edge_function`, `execute_sql` en lecture.
- Ne pas contourner un refus du classifieur de sécurité.

**Avant chaque commit :** `cd Math_Edu_Application && npm test && npm run lint && npm run build` (lint à zéro avertissement). Après une migration : `npm run test:sql`. Un écran touché : `npm run test:e2e`.

**Trois règles de conception :**
1. Jamais de bouton inerte : un bouton non branché ne s'affiche pas.
2. Jamais de texte mensonger : l'écran n'annonce pas ce que le code ne fait pas.
3. Jamais d'échec silencieux : une écriture ratée est dite à l'élève (`SyncErrorBanner`).

**Conventions :** français partout (code, contenu, commits) ; commentaires qui disent **pourquoi** ; couleurs uniquement via les jetons de `tailwind.config.js` ; cibles tactiles d'au moins 44 px ; mobile d'abord.

**Commits :** une fonctionnalité, un commit. Fin du message :
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

**Agents :** chaque agent écrit son rapport complet dans un fichier de `_travail/` et ne rend que 10 lignes. Le relecteur livre aussi sa copie corrigée (pas de retour chez un rédacteur). Garder les mêmes agents d'un bout à l'autre d'une étape.

## 4. Organisation du travail

- **Feuille de route en blocs** : A contenu, B mobile, C application, D sprint final. Sprints courts numérotés A1, A2… (`pilotage/FEUILLE_DE_ROUTE.md`). Un seul sprint en cours, décrit dans `pilotage/SPRINT.md`.
- **Une session, un seul bloc** (contenu ou application) : le contexte n'est chargé qu'une fois.
- **Ouverture d'un sprint :** poser à Gauthier les questions ouvertes qui le concernent (`pilotage/DECISIONS.md`), présenter le plan avant de coder.
- **Clôture d'un sprint :** skill `cloture-sprint`.
- **Toute décision** de Gauthier ou arbitrage du chef de projet : une ligne datée dans `pilotage/DECISIONS.md`.
- **Toute livraison qui demande un test manuel :** une ligne dans `pilotage/TESTS_MANUELS.md`.
- Chaque fait vit dans un seul fichier : on met à jour, on ne recopie pas.

## 5. Où trouver quoi (lire seulement quand c'est utile)

| Besoin | Fichier | Quand le lire |
|---|---|---|
| Sprint en cours | `pilotage/SPRINT.md` | toujours (importé ci-dessous) |
| Reste à faire jusqu'à la fin, étape par étape | `pilotage/FEUILLE_DE_ROUTE.md` | pour planifier, ouvrir ou clore un sprint |
| État détaillé (compteurs, écrans, migrations, fonctions en ligne, limites) | `pilotage/ETAT.md` | pour un bilan ou avant de toucher la base |
| Décisions prises et questions ouvertes | `pilotage/DECISIONS.md` | avant de trancher ou de reposer une question |
| Tests manuels à faire avec Gauthier | `pilotage/TESTS_MANUELS.md` | séance de test, fin de sprint |
| Règles de l'application (architecture, base, pièges) | `.claude/rules/app.md` | avant de toucher `Math_Edu_Application/` |
| Règles du contenu (circuit, validateur, recette) | `.claude/rules/contenu.md` | avant de toucher le contenu, `scripts/` ou `_travail/` |
| Procédures pas à pas | skills `etape-contenu`, `migration`, `deployer-fonction`, `cloture-sprint` | à l'appel |
| Plan du contenu | `Spécifications DAG, Exos, Mindcards/PLAN_CONTENU.md` | |
| Bilans qualité | `Spécifications DAG, Exos, Mindcards/QUALITY.md` (index), puis `qualite/<étape>.md` | jamais en entier |
| Méthode DAG | `CORRECTIONS_DAG_v2.md`, `PRINCIPES_PEDAGOGIQUES.md` | |
| Contenu source, schémas | `Spécifications DAG, Exos, Mindcards/content/`, `schemas/` | |
| Agents | `.claude/agents/exercise-generator.md`, `math-reviewer.md` | |
| Travail en cours des agents | `_travail/` (étapes closes dans `_travail/archive/`) | |
| Code et commandes | `Math_Edu_Application/GUIDE.md`, `README.md` | |
| Business, engagement, maquettes | `Management de Projet/` (`Business_plan.md`, `bp_scenarios.py`, `Etude_engagement.md`, `maquettes/`, `captures/`) | |
| Historique, à ne pas suivre | `pilotage/archive/` (ancien CLAUDE.md complet avec les sprints 1 à 6, `Reste_a_faire.md`, ROADMAP, fiches RELECTURE) | jamais, sauf recherche ciblée |

Les fichiers de `.claude/rules/` se chargent d'eux-mêmes quand on touche les dossiers visés, à condition que la session soit ouverte dans `Math Education`. Sinon, les lire à la main.

---

@pilotage/SPRINT.md
