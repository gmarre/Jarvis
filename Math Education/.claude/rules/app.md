---
paths:
  - "Math_Edu_Application/**"
---

# Règles de l'application (Math_Edu_Application)

> Chargé quand on touche l'application. Commandes détaillées : `Math_Edu_Application/GUIDE.md`. État en ligne (migrations, versions des fonctions) : `pilotage/ETAT.md`.

## Code

- **Le moteur vit dans `src/lib/`, pur et testé.**
  - `dag.ts` : progression, `isCleared` (une compétence sans exercice est franchie, transitivement) ;
  - `placement.ts` : test de positionnement adaptatif ;
  - `exercise.ts` : réexporte la correction partagée ;
  - `maitrise.ts` réexporte `supabase/functions/_shared/maitrise.ts` (règle de maîtrise sur 5, table dans `pilotage/DECISIONS.md`) ; aussi `serie.ts`, `chemins.ts`, `defis.ts`, `suggestions.ts`, `algebre.test.ts`.

  Toute modification de `dag.ts`, `placement.ts`, `exercise.ts` ou `maitrise.ts` vient avec un test.
- **`src/data/repository.ts` est la seule couture avec la base.** Une mutation par intention (`saveAttempt`, `savePlacement`, `createBooking`, `saveReview`…), jamais de sauvegarde en bloc.
  - Deux implémentations : `supabaseRepository` et `mockRepository` (mode démonstration sans clés, `VITE_USE_MOCK=true`, qui fait le même calcul de progression localement).
  - `mockRepository.test.ts` est la spécification exécutable du contrat.
- **Aucun module ne lit le contenu au niveau du fichier** : il est installé avant la session (`installerContenu`).
  - Un élève ne reçoit que des `PublicExercise`, sans réponse.
  - La correction passe par `repository.corriger`, qui appelle l'Edge Function.
- **Correction** : `supabase/functions/_shared/correction.ts` est **le même fichier** pour le serveur et l'application. Il normalise largement : accents, ponctuation, unités en toutes lettres, durées, virgule ou point, formes algébriques (`answer.forme` : `expression`, `reduite`, `developpee`, `factorisee`, `meme_calcul`, `equation`, `inegalite`, `solutions`), π, puissances, notation scientifique. **Une règle modifiée doit être redéployée** (skill `deployer-fonction`), sinon le serveur et l'app divergent.
- **Progression côté serveur** : `corriger` (mode « exercice ») écrit la tentative et la progression ; `rendre-super` corrige la copie d'un super exercice et écrit le passage ; le navigateur ne peut écrire ni tentatives, ni passages, ni positionnement, ni progression, sauf la relecture espacée des cartes (trigger `proteger_progression`). `enregistrer_positionnement` n'accepte que les compétences réussies du premier coup pendant le test et leurs prérequis.
- **Figures** : décrites en JSON (`content/figures/<id>.json`), dessinées en SVG par `scripts/figures.py`, affichées en `<img>` data URI (aucun script ne peut s'exécuter).

## Base (`supabase/migrations/`, chaque fichier explique son objet)

**Tables :**
- `profiles` (rôle, niveau, email parent, consentement, préférences, rythme) ; `modifications_profil` (demandes d'un mineur soumises au parent, jeton haché) ;
- `skill_progress` (niveau sur 5, échéances) ; `exercise_attempts` ; `placement_results`, `placement_reponses` ; `super_attempts` ; `flashcard_progress` ;
- `teachers` (`verifie_le`, protégée du client), `course_offers`, `availability_slots`, `bookings`, vue `slots_disponibles` (places calculées, jamais stockées), `seances_visio` ;
- `parent_links` (seulement `token_hash`) ; `suivis`, `messages_suivi` (signalement, archive) ;
- envois : `rappels`, `rappels_envois`, `rapports_envois` ;
- contenu publié : `content_skills`, `content_exercises`, `content_mindmaps`, `content_flashcards`, `content_super`, `content_exercise_keys` et `content_super_keys` (illisibles pour les élèves, seules les fonctions les lisent), `content_publications` ;
- recette : `content_reviewers`, `content_reviews`.

**Colonnes protégées du client** (trigger) : `role` (choisi une seule fois, `role_choisi_le`), `consentement_parental_at`, `email`, `cree_le`, `abonnement` ; pour un mineur, `date_naissance`. Un changement de parent ou une date sous 15 ans remet le consentement à zéro. `email`, `role` et consentement passent par l'Auth Supabase ou une fonction serveur, jamais par l'écriture directe du profil.

**Fonctions d'autorisation** en `security definer`, pour éviter la récursion RLS : `peut_lire_eleve`, `est_prof_de`, `est_parent_de`, `role_actuel`, `nb_places_prises`. Aucune n'est appelable par `anon`.

**Le contenu :** Git est la source, la base ne fait que le servir. Seule écriture : `publier_contenu`, appelée par `scripts/publier.py`.

**Nouvelle lettre de domaine :** migration qui élargit les contraintes `A-P`, et mise à jour de `ID_EXERCICE` dans `corriger/index.ts`.

## Administration (SQL Editor ou tableau de bord, par Gauthier)

- Vérifier un professeur : `update teachers set verifie_le = now() where id = (select id from profiles where email = '...');`
- Lire les messages signalés : `select * from messages_suivi where signale_le is not null;`
- Créer un compte déjà confirmé : Authentication, Add user, « Auto confirm ».
- Inscrire un relecteur de contenu : `.claude/rules/contenu.md`, « Recette du contenu ».

## Tests

- Avant chaque commit : `npm test && npm run lint && npm run build` (lint à zéro avertissement).
- Après une migration : `npm run test:sql` (PGlite, Postgres en WebAssembly, sans Docker). `supabase/tests/run.sh` reste pour qui a Docker.
- Un écran touché : `npm run test:e2e` (Playwright 1.61, mode démonstration, ordinateur et téléphone ; fichiers en `.cjs`, car Node 18.18 ne transpile pas leur TypeScript).
- `npm run check:db` : contrôle d'intégration contre la base en ligne.

## Pièges connus

- **Tests SQL** : PGlite n'a qu'une connexion ; le lanceur remet la session à zéro entre deux fichiers. Un test qui vise un compte supprimé par un test précédent ne rend aucune ligne et ne peut pas échouer.
- **Tester le SQL en propriétaire de table ne teste rien** : toute assertion tourne sous `set role authenticated` avec un JWT.
- **Une règle valable pour tous doit être `security definer`.**
- **Une politique de lecture qui relit sa propre table casse un upsert ... RETURNING** (0024).
- **Codes d'échappement Unicode** (antislash, u, quatre chiffres) : l'outil Write, les heredocs Python et les paramètres d'outils MCP les transforment en caractères. Pour en écrire un dans un fichier, passer par `chr(92)`.
- **`crypto.randomUUID()` n'existe qu'en HTTPS** (test sur téléphone en http local) : utiliser `lib/id.ts`.
- **Supabase gratuit en pause après 7 jours sans activité** : « Restore project » dans le tableau de bord.
- **Node** : `supabase-js` exige Node 22 ou plus pour les scripts ; react-router 7 demande Node 20 au build Netlify ; le Node 18.18 local suffit pour les tests et le build. Cible Node 24 (`winget install --id OpenJS.NodeJS.LTS --source winget`, VS Code fermé).
- **Variables `VITE_*` à recopier dans Netlify avant le premier build.**
- **Emails sans domaine** : le SMTP par défaut de Supabase n'envoie que quelques emails par heure, et Resend n'écrit qu'à l'adresse du compte. L'administrateur peut créer un compte déjà confirmé (Authentication, Add user, « Auto confirm »).
- **Téléphone sans déploiement** : `npm run dev -- --host`, puis l'adresse affichée ouverte sur le téléphone connecté au même Wi-Fi.
