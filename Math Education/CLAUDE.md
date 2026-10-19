# CLAUDE.md, MATH EDUCATION (« Racine »)

> Contexte chargé à chaque session Claude Code dans ce dossier. **Il fait foi** sur l'état du projet et sur ce qui reste à faire (mis à jour le 19 octobre 2026). `Math_Edu_Application/ROADMAP.md` est historique (29 septembre 2026) : ne plus s'y fier pour l'avancement.
>
> Projet étanche : rien de TRADING ni de CHARTER ici, et **jamais de fichier « Charter Diving » dans un commit**.
>
> Règles de réponse : français, ton direct, pas de tirets longs.

---

## 1. Le projet en bref

Application web d'apprentissage adaptatif des mathématiques, CP à Terminale à terme. Un DAG de compétences permet de trouver la lacune racine d'un élève (même deux classes en arrière) et de ne lui faire travailler que ce qui manque. Exercices sur 3 niveaux, cartes mentales, révision espacée.

- **Équipe :** Gauthier (dev et produit, il pilote avec Claude) et Marius (contenu mathématique ; il mène la recette du contenu dans l'app, Gauthier n'y valide rien).
- **Contraintes :** budget total **500 €**, **4 h par semaine et par personne**. Quand une option est plus propre mais plus longue, la plus courte gagne.
- **Calendrier :** bêta fermée gratuite de 5 à 10 élèves **fin novembre 2026**, ouverture en **janvier 2027**.
- **Modèle économique visé :** abonnement élève 9,99 €/mois ; cours avec professeur 20 € les 1 h 30, 3 élèves maximum. **Rien n'est encaissé pendant la bêta** (`/abonnement` est informatif). Pas de paiement tant que la progression est écrite par le navigateur (§9).

---

## 2. État au 19 octobre 2026

### 2.1 Contenu (publié en base, commit 8574078)

**150 compétences, 847 exercices (dont 241 avec figure), 30 cartes mentales**, tous en `relu_agent` (relus par agents), en attente de la recette de Marius.

| Domaine | Compétences | Classes couvertes |
|---|---|---|
| A Numération | 17 | CP à CM2 |
| B Calcul | 22 | CP à 6e |
| C Fractions | 18 | CE1 à 3e (cycle 4 très partiel : 4 compétences) |
| D Décimaux | 19 | CE1 à 6e |
| E Proportionnalité, pourcentages | 17 | CM1 à 5e |
| G Espace et géométrie | 30 | CP à 6e |
| P Grandeurs et mesures | 27 | CP à 6e |

**Constat :** le **cycle 3 (CM1 à 6e) et le cycle 2 sont couverts ; le cycle 4 (5e, 4e, 3e) est presque vide.** Plan pour aller au bout de la 3e : §7.

Étapes faites (bilans détaillés dans `Spécifications DAG, Exos, Mindcards/QUALITY.md`) : tranche pilote A et C ; 1 calcul ; 2 décimaux ; 3 proportionnalité ; 4a grandeurs et mesures ; figures (reprise de 30 exercices) ; 4b géométrie.

Restes connus sur le contenu :
- 6 cartes anciennes en `brouillon` : MM-A-01, MM-A-02, MM-C-01 à MM-C-04 ;
- 7 compétences CE1 signalées « anomalie de coordination » dans `RELECTURE.md` (A004, A005, A006, A008, C001, C003, C009) ;
- C009 dépasse le plafond de mots du CE1.

### 2.2 Application

React 18, Vite, TypeScript, Tailwind ; Supabase (Postgres, Auth Google et email, RLS, Edge Functions) ; Vitest (279 tests). **Tourne en local seulement : rien n'est déployé.**

Écrans : `/connexion`, `/bienvenue`, `/test` (positionnement), `/travail` (plan du jour), `/parcours` (chemin et graphe), `/exercice/:id`, `/cartes`, `/cartes/:id`, `/cours` (réservation élève), `/prof/cours` (créneaux prof), `/parent` (page d'attente), `/profil`, `/abonnement`, `/recette`.

Ce qui marche :
- authentification Google et email ;
- progression en base, avec cloisonnement RLS ;
- contenu lu depuis la base, avec cache local par publication ;
- **correction côté serveur** (Edge Function `corriger`, version 5) : les réponses ne sont ni dans le bundle ni lisibles par l'élève ;
- figures SVG ;
- réservation de créneaux, avec capacité garantie par la base ;
- mode recette pour Marius.

Ce qui est faux ou absent aujourd'hui (repris dans le backlog §6) :
- l'avatar en haut à droite (mobile) n'est pas cliquable ;
- les « flammes » (série de jours) sont **codées en dur à 6** (`WorkspacePage.tsx`, `streakDays`) ;
- les propositions de QCM s'affichent dans l'ordre du fichier, jamais mélangées ;
- aucun email n'est envoyé : consentement parental impossible, alors que c'est une obligation légale avant 15 ans ;
- un compte Google ne peut pas choisir « Professeur » ou « Parent » : le trigger `proteger_colonnes_profil` refuse le changement de rôle ;
- la progression est écrite par le navigateur, donc falsifiable ;
- pas de vérification des professeurs ;
- l'espace parent est vide ;
- le test de positionnement ne montre pas de correction à la fin ;
- le passage d'une compétence à « maîtrisée » n'a jamais été vérifié en conditions réelles.

---

## 3. Règles de travail (à respecter sans qu'on les redise)

**Sécurité et opérations**
- `SUPABASE_SERVICE_ROLE_KEY` : jamais affichée, jamais préfixée `VITE_`, lue seulement par les scripts locaux depuis `.env.local`.
- Le fichier Google `client_secret_*.json` n'est jamais commité.
- **Migrations : jamais par l'outil MCP `apply_migration` (refusé par Gauthier).** Créer le fichier numéroté suivant dans `supabase/migrations/` (rejouable : `if not exists`, `create or replace`, `drop policy if exists`), puis Gauthier le colle dans le SQL Editor. Ne jamais modifier une migration déjà appliquée (dernière appliquée : 0009).
- Les outils MCP Supabase `deploy_edge_function`, `get_edge_function` et `execute_sql` en lecture sont acceptés.
- Ne pas contourner un refus du classifieur de sécurité.

**Avant chaque commit :** `cd Math_Edu_Application && npm test && npm run lint && npm run build` (lint à zéro avertissement). Après une migration : `bash supabase/tests/run.sh` depuis Git Bash (Docker Desktop lancé).

**Trois règles de conception :**
1. Jamais de bouton inerte : un bouton non branché ne s'affiche pas.
2. Jamais de texte mensonger : l'écran n'annonce pas ce que le code ne fait pas.
3. Jamais d'échec silencieux : une écriture ratée est dite à l'élève (`SyncErrorBanner`).

**Conventions :**
- français partout (code, contenu, commits) ;
- commentaires qui disent **pourquoi** ;
- couleurs uniquement via les jetons de `tailwind.config.js` ;
- cibles tactiles d'au moins 44 px ;
- mobile d'abord.

**Commits :** une fonctionnalité, un commit. Fin du message :
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

---

## 4. Architecture et contrats

### 4.1 Code

- **Le moteur vit dans `src/lib/`, pur et testé.**
  - `dag.ts` : progression, maîtrise, `isCleared` (une compétence sans exercice est franchie, transitivement) ;
  - `placement.ts` : test de positionnement adaptatif ;
  - `exercise.ts` : réexporte la correction partagée.

  Toute modification de `dag.ts`, `placement.ts` ou `exercise.ts` vient avec un test.
- **`src/data/repository.ts` est la seule couture avec la base.** Une mutation par intention (`saveAttempt`, `saveProgress`, `savePlacement`, `createBooking`, `saveReview`…), jamais de sauvegarde en bloc.
  - Deux implémentations : `supabaseRepository` et `mockRepository` (mode démonstration sans clés, `VITE_USE_MOCK=true`).
  - `mockRepository.test.ts` est la spécification exécutable du contrat.
- **Aucun module ne lit le contenu au niveau du fichier** : il est installé avant la session (`installerContenu`).
  - Un élève ne reçoit que des `PublicExercise`, sans réponse.
  - La correction passe par `repository.corriger`, qui appelle l'Edge Function.
- **Correction** : `supabase/functions/_shared/correction.ts` est **le même fichier** pour le serveur et l'application.
  - Il normalise largement : accents, ponctuation, unités en toutes lettres (« cm carrés », « degrés »), durées « 1 h 05 / 1:05 », virgule ou point.
  - **Une règle modifiée doit être redéployée** (§5.3), sinon le serveur et l'app divergent.
- **Figures :** décrites en JSON (`content/figures/<id>.json`) et dessinées en SVG par `scripts/figures.py`.
  - Types : `demi_droite`, `regle`, `horloge`, `quadrillage` (axe, robot, chemin), `partage`, `bandes`, `monnaie`, `geometrie`, `rapporteur`, `solide`, `cubes`.
  - Le générateur refuse une figure qui trompe l'œil : angle codé droit qui ne l'est pas, angle presque droit, points presque alignés, longueurs codées égales qui ne le sont pas.
  - L'app affiche la figure en `<img>` data URI, donc aucun script ne peut s'exécuter.

### 4.2 Base (`supabase/migrations/0001` à `0009`, chaque fichier explique son objet)

**Tables :**
- `profiles` (rôle, niveau, email parent, consentement, préférences) ;
- `skill_progress` ;
- `exercise_attempts` (écriture seule) ;
- `placement_results` (historisé) ;
- `teachers`, `availability_slots`, `bookings`, vue `slots_disponibles` (places calculées, jamais stockées) ;
- `parent_links` (seulement `token_hash`) ;
- contenu publié : `content_skills`, `content_exercises`, `content_mindmaps`, `content_exercise_keys` (illisible pour les élèves, seule la fonction `corriger` la lit), `content_publications` ;
- recette : `content_reviewers`, `content_reviews`.

**Colonnes protégées du client** (trigger) : `role`, `consentement_parental_at`, `email`, `cree_le`, `abonnement`.

**Fonctions d'autorisation** en `security definer`, pour éviter la récursion RLS : `peut_lire_eleve`, `est_prof_de`, `est_parent_de`, `role_actuel`, `nb_places_prises`. Aucune n'est appelable par `anon`.

**Le contenu :** Git est la source, la base ne fait que le servir. Seule écriture : `publier_contenu`, appelée par `scripts/publier.py`.

---

## 5. Procédures

### 5.1 Produire du contenu (circuit d'une étape, détaillé dans `PLAN_CONTENU.md`)

1. **Cartographe** (agent) : nœuds du DAG d'après le programme (`_travail/programmes/*.txt`), citations exactes, prérequis, découpage en cartes. **Arbitrage de Gauthier** (questions groupées) avant toute rédaction.
2. **Rédacteurs** (agents `exercise-generator`, un lot chacun, 6 exercices par compétence : 2 D, 2 E, 2 M). Chaque réponse est recalculée par script, les saisies sont rejouées contre `correction.ts`, et les figures sont regardées à 360 px.
3. **Relecteurs indépendants** (`math-reviewer`) : un rapport par lot. Ensuite : corrections par le rédacteur d'origine, puis contre-relecture par le relecteur d'origine (**garder les mêmes agents** d'un bout à l'autre).
4. **Cartes mentales** : même circuit.
5. **Fusion :**
   - `merge_dag.py`, `merge_lot.py --figures <dossier> [--remplacer]`, `merge_dag.py --mindmaps` ;
   - `set_review_status.py --status relu_agent --skill <id>` et `--cartes <ids>` ;
   - `build_review_sheet.py`, `contenu.py export-app` ;
   - npm test, lint, build ;
   - bilan dans `QUALITY.md`, compteurs dans ce fichier ;
   - commit, puis `publier.py --apply`.

Modèles de consignes : `Spécifications DAG, Exos, Mindcards/modeles_agents/consigne_*_etape4b.md`. Ce sont les plus complètes, avec toutes les règles de figures.

**Python :** recréer un venv (`python -m venv venv`, `pip install -r scripts/requirements.lock.txt`), puis lancer avec `PYTHONIOENCODING=utf-8`. Validation : `scripts/validate_content.py` ; un lot seul : `scripts/check_lot.py`.

**Règles de contenu tirées des relectures (toutes au validateur ou dans les consignes) :**
- notations contrôlées par classe : `<>`, ×, ÷, virgule, %, ², ³, ° ;
- vocabulaire interdit selon la classe : « produit en croix », « formule » et « tableau de conversion » avant la 6e, « rapporteur » avant la 6e, [AB] seul avant la 6e ;
- figure indispensable, et « peut-on répondre en regardant la figure sans la lire ? » ;
- un « vérifier » porte sur la figure, sans « car » ni « donc » ;
- une lettre citée dans une proposition n'est jamais la pastille d'une autre ;
- les étapes d'un corrigé n'utilisent que des opérations couvertes par les prérequis ;
- dans les cartes, aucun couple de données repris d'un exercice de la même carte.

### 5.2 Recette du contenu (Marius)

1. Créer un compte élève dédié.
2. L'inscrire comme relecteur dans le SQL Editor :
   ```sql
   insert into content_reviewers (user_id) select id from auth.users where email = '...' on conflict (user_id) do nothing;
   ```
3. Marius juge dans `/recette`.
4. Reporter les verdicts : `python scripts/recette.py --apply`. Accepté devient `valide` ; invalidé devient `brouillon` et part dans `RECETTE.md`, à reprendre par les agents.

### 5.3 Déployer l'Edge Function `corriger`

MCP `deploy_edge_function`, nom `corriger`, point d'entrée `corriger/index.ts`, fichiers `corriger/index.ts` et `_shared/correction.ts`, `verify_jwt: true`.

**Piège :** dans les paramètres d'outil, une séquence `\uXXXX` devient un caractère littéral. Envoyer les caractères spéciaux tels quels, ou par code.

Contrôle : un appel avec la clé anonyme doit répondre **401 « Connexion requise »**. Projet Supabase : `crazwnfjyzaxirbmwnkn`.

### 5.4 Pièges connus

- **Supabase gratuit en pause après 7 jours sans activité** : « Restore project » dans le tableau de bord. Avant la bêta : plan Pro, ou activité hebdomadaire (workflow `supabase-keepalive.yml`).
- **Docker bloqué** (`no route to host`) : arrêter les processus `com.docker.*`, `wsl --shutdown`, relancer Docker Desktop.
- **Tester le SQL en propriétaire de table ne teste rien** : toute assertion tourne sous `set role authenticated` avec un JWT.
- **Une règle valable pour tous doit être `security definer`.**
- **`crypto.randomUUID()` n'existe qu'en HTTPS** (test sur téléphone en http local) : utiliser `lib/id.ts`.
- **Variables `VITE_*` à recopier dans Netlify avant le premier build.**
- **Node** : `supabase-js` exige Node 22 ou plus pour les scripts. Cible Node 24 (`winget install --id OpenJS.NodeJS.LTS --source winget`, VS Code fermé).
- **Google OAuth en mode Testing** (100 utilisateurs). La Production exige une politique de confidentialité en ligne.

---

## 6. Backlog priorisé (source : `Management de Projet/Reste_a_faire.md`, rien n'y est omis)

**Principe :** chaque sprint mêle **application** et **contenu** (agents), pour que les deux avancent ensemble.
- 4 h par semaine : un sprint dure environ 2 semaines.
- **Au début de chaque sprint, poser à Gauthier les questions du §8 qui le concernent, puis lui présenter le plan avant de coder.**
- Un point marqué « avis critique » porte une alternative à lui soumettre.

### Sprint 1 : Compte, profil et mise en ligne (avant la bêta, priorité absolue)

**Application**
1. **Avatar en haut à droite cliquable vers `/profil`** (bug, `AppShell.tsx` : l'avatar de l'en-tête n'est pas un lien). Vérifier aussi l'en-tête desktop.
2. **Modifier ses données dans `/profil`.**
   - **Date de naissance :** si elle passe sous 15 ans, le consentement parental redevient exigé.
   - **Email :** via `supabase.auth.updateUser`, avec confirmation sur la nouvelle adresse.
   - **Mot de passe :** ancien mot de passe redemandé, nouveau saisi deux fois.

   `email`, `role` et `consentement` restent protégés côté base : passer par l'Auth Supabase ou une fonction serveur, jamais par l'écriture directe du profil.
3. **Création de compte par email :**
   - mot de passe saisi deux fois, avec règles minimales affichées (au moins 8 caractères) ;
   - **email de validation obligatoire** : réactiver « Confirm email » dans Supabase et configurer un SMTP (Resend) ; tester le chemin complet dans un navigateur.

   L'administrateur peut créer un compte déjà confirmé depuis le tableau de bord Supabase (Authentication, Add user, « Auto confirm »). L'écrire dans un mémo admin.
4. **Reconnexion au retour d'arrière-plan** (formulation à confirmer, §8 Q1). Interprétation retenue en attendant :
   - quand l'onglet revient au premier plan, rafraîchir la session et le contenu ;
   - si le serveur ne répond pas, le dire et réessayer, au lieu de laisser l'app figée.
5. **Rôle Professeur ou Parent choisi à l'inscription Google** : fonction serveur qui fixe le rôle une seule fois, tant que le profil est incomplet (aujourd'hui le trigger refuse).
6. **Mélanger les propositions de QCM à l'affichage**, sans toucher aux clés.
7. **Logo et style graphique** : intégrer les fichiers que Gauthier fournira (§8 Q2), en adaptant les jetons Tailwind sans écrire de couleur en dur. **Photos sur la page de connexion** : libres de droits, compressées (WebP), avec un texte alternatif.
8. **Téléphone et tablette :**
   - passe responsive écran par écran (360, 768 et 1024 px) ;
   - **procédure de test sur un vrai téléphone** : soit le site déployé (étape 9), soit `npm run dev -- --host` sur le réseau local, en sachant que certaines API ne marchent qu'en HTTPS.
9. **Déploiement :**
   - dépôt privé dédié `math-education` (Marius doit y avoir accès) ;
   - Netlify, avec les variables `VITE_*` ;
   - domaine OVH, environ 12 €/an, choisi par Gauthier ;
   - HTTPS et PWA installable.

   **Référencement Google** : landing statique séparée sur la racine du domaine (Astro ou HTML), app sur `/app`, plus politique de confidentialité, mentions légales, sitemap et Search Console. Ne pas migrer la SPA pour le SEO.
10. **Consentement parental par email** (obligation légale avant 15 ans) :
    - Edge Function `send-parent-consent` avec Resend ;
    - jeton haché, valable 7 jours ;
    - page `/consentement/:token` et bouton « Renvoyer » limité en fréquence.

**Contenu (agents, en parallèle) :** étape 5 du §7 (nombres relatifs et arithmétique). Remettre aussi au propre les 6 cartes en brouillon et les 7 anomalies CE1 (§2.1).

### Sprint 2 : Pédagogie de l'élève

1. **Correction du test de positionnement :** à la fin du test (pas pendant, pour ne pas casser le rythme), l'élève revoit chaque question, sa réponse, la bonne réponse et le corrigé. Il faut une fonction serveur qui rend les clés **après** le test seulement.
2. **Maîtrise exigeante (« réussir plusieurs fois, dans plusieurs contextes »).** Aujourd'hui une compétence est maîtrisée avec 3 réussites sur les 4 dernières tentatives (`mastery_threshold`). Nouvelle règle, à valider avec Gauthier :
   - au moins **2 exercices différents** réussis, **dont un de niveau maîtrise** ;
   - puis une **révision espacée réussie** (J+3 puis J+10) pour passer de « acquise » à « ancrée ».

   Avec tests dans `dag.ts`.
3. **Révisions et flammes réelles :**
   - calcul de la série de jours depuis `exercise_attempts`, au lieu du 6 en dur ;
   - file « à réviser » visible (exercices et cartes dont l'échéance est passée) ;
   - **scénario de test** qui avance l'horloge (Vitest, fausses dates) pour prouver la révision espacée et les flammes, puisque Gauthier n'a pas pu la valider à la main.
4. **Cartes « défi » (recto et verso)** : cycle de l'élève découvrir (carte arbre), exercice simple, carte recto et verso à retrouver, exercices de plus en plus durs.
   - **Contenu :** 4 à 6 cartes question-réponse par compétence, écrites par agents à partir des cartes mentales et relues comme les exercices. Nouveau fichier `content/flashcards/<compétence>.json` et nouveau schéma.
   - **Application :** mode « défi » avec auto-évaluation (« je savais / je ne savais pas ») et une file de révision espacée propre aux cartes.
5. **Cartes mentales :** indication visible au premier affichage (« Touche un rond pour déplier ») et bouton « Tout déplier ».
6. **Chemins proposés :**
   - remplacer l'écart entre « Chemin » et « Graphe » par **plusieurs chemins proposés selon la classe**, qui traversent les domaines (par exemple « Consolider les fractions », « Préparer la géométrie de 6e ») ;
   - l'élève en choisit un ou plusieurs ;
   - le bouton « Graphe » est rendu visible en haut de `/parcours`.

   Les chemins sont calculés depuis le DAG (lacunes et objectifs de la classe), pas écrits à la main.
7. **« Super exercices » (examens transverses de 15 à 20 min) :** nœuds-jalons du DAG qui bloquent l'accès au niveau supérieur et demandent plusieurs domaines à la fois.
   - Jamais proposés pendant le test d'entrée.
   - **Contenu :** un jalon par fin de cycle et par grand bloc, rédigé et relu par agents (exercices à plusieurs étapes).
   - **Application :** un type de nœud « jalon » et une page d'examen.

   *Avis critique :* commencer par 3 jalons (fin CM2, fin 6e, fin 3e) avant d'en multiplier.
8. **Engagement et recherche :** courte étude documentaire sur l'habitude et la motivation des 8 à 15 ans (autodétermination, rappels, gamification). Livrable : une note de 2 pages et 5 changements d'interface.
   - **Garde-fou :** pas de mécanique manipulatrice sur des mineurs (pas de perte punitive, pas de notifications nocturnes), conformément aux recommandations CNIL pour les mineurs.
   - Rappels : emails d'abord, notifications PWA ensuite.

**Contenu :** étape 6 du §7.

### Sprint 3 : Professeur v1

1. **Offres de cours :** le professeur crée des types de cours, chacun avec :
   - un titre ;
   - une ou plusieurs compétences ;
   - un niveau ;
   - une **durée de 30 min** (aide aux devoirs) **à 2 h** ;
   - un nombre de places (3 au maximum) ;
   - un prix affiché (non encaissé).

   Il publie des créneaux pour une offre, et l'élève choisit librement ou non. Nouvelle migration (`course_offers`, lien depuis `availability_slots`).
2. **Calendrier du professeur :** vue semaine et mois de ses cours à venir, avec les inscrits.
3. **Profil public du professeur :** expérience, méthode, matières et niveaux, photo. L'élève y accède en cliquant sur l'icône du professeur.
4. **DAG des élèves inscrits :**
   - le professeur voit le DAG de chaque élève de son cours (la RLS `est_prof_de` le permet déjà, avec partage autorisé par l'élève) ;
   - **suggestions automatiques** de cartes, d'exercices et de super exercices adaptés au groupe (lacunes communes) ;
   - réutiliser `DagGraph`, `DagPath` et `SkillDetailPanel`.
5. **Visioconférence :** ne pas développer de visio.
   - *Recommandation :* **Jitsi Meet** (open source, gratuit, sans compte), avec un lien unique généré par séance ; à défaut, un champ URL Meet ou Zoom saisi par le professeur.
   - **Pendant le cours :** une page « Séance » ouverte à côté de la visio. Le professeur y choisit une carte ou un exercice, et les élèves de la séance le voient s'afficher. Il faut une diffusion temps réel, Supabase Realtime, sur une table `seance_etat`.

   *Avis critique :* une version 1 sans temps réel est possible : le professeur partage son écran et les élèves ouvrent le lien de l'exercice.
6. **Vérification des professeurs** avant d'ouvrir l'offre à des inconnus : validation manuelle par l'administrateur, avec un rôle `prof` accordé par l'admin.

**Contenu :** étape 7 du §7.

### Sprint 4 : Parents

1. **Espace parent :** rattachement à un ou plusieurs enfants (le consentement du sprint 1 crée le lien), et suivi de leur progression.
2. **Rapport hebdomadaire par email :** exercices faits, cartes revues, compétences gagnées. Cron Supabase et Resend.
3. **Chemins à faire réviser, avec réponses et corrigés pour le parent.**
   - *Avis critique :* un enfant peut se servir du compte parent pour lire les réponses.
   - Réponses visibles seulement dans l'espace parent, sur un exercice que l'enfant a déjà tenté, ou en mode « fiche à imprimer » (§8 Q7).
4. **RGPD :** export et suppression des données à la demande du parent.

**Contenu :** étape 8 du §7.

### Sprint 5 : Relation de suivi professeur, élève et parent (offre d'abonnement supérieure)

1. Rubriques **« Mes élèves »** (professeur) et **« Mes professeurs »** (élève), créées quand le professeur accepte un suivi.
2. **Messagerie sécurisée sur le site :** questions de cours et d'exercices. **Le parent voit tous les échanges et peut écrire au professeur** : c'est la protection contre les abus, dans les deux sens. Pas de pièce jointe libre au début ; signalement et archivage.
   - *Avis critique :* jamais d'échange privé entre un adulte et un mineur hors de la vue du parent.
3. **Cours réservés :** le professeur crée une séance visible seulement par ses élèves. L'élève peut demander un cours individuel ou un cours pour les élèves de ce professeur.
4. **Propositions à soumettre à Gauthier pour enrichir ce suivi :**
   - devoirs assignés par le professeur (une liste de compétences, avec échéance) ;
   - bilan mensuel automatique ;
   - objectif de la période fixé ensemble ;
   - note privée du professeur sur l'élève.

**Contenu :** étapes 9 et 10 du §7.

### Sprint 6 : Avant les premiers élèves réels

- Passer la progression côté serveur (`applyAttempt` dans une Edge Function) : prérequis de tout paiement.
- Parcours Playwright élève, professeur et parent.
- `/security-review`.
- Montée de react-router 7 (2 vulnérabilités modérées sans correctif en 6.x).
- Polices auto-hébergées.
- Supabase Pro : pas de mise en pause, et la protection contre les mots de passe compromis est disponible.

### Business (à mener en parallèle, sans code)

1. **Revoir le business plan :**
   - coûts : hébergement, Supabase Pro, Netlify, domaine, emails, publicité sur les réseaux, référencement ;
   - **2 ou 3 offres** chiffrées (gratuit limité, élève, élève avec professeur, famille) ;
   - point mort, avec des hypothèses explicites (§8 Q9).

   Livrable : un document à part, pas dans ce fichier.
2. **Vision long terme, une version « classe » pour les professeurs de mathématiques** : niveau de chaque élève, forces et faiblesses, devoirs personnalisés.
   - *À étudier :* la vente aux établissements passe par le **GAR** (Gestionnaire d'accès aux ressources du ministère) et des contraintes RGPD fortes.
   - C'est un autre produit : ne rien développer avant que l'offre élève fonctionne.

---

## 7. Contenu jusqu'à la fin de la 3e, puis le lycée

Le DAG v1 (`skills_dag.json`, 414 compétences, niveaux souvent faux) ne sert que de mémoire. Chaque étape repart du programme officiel (`_travail/programmes/5eme.txt`, `3eme-4eme.txt`), avec le circuit du §5.1 et les mêmes lettres de domaine que le v1 quand elles correspondent.

Toute nouvelle lettre exige une migration qui élargit les contraintes `A-P`, et la mise à jour de `ID_EXERCICE` dans `corriger/index.ts`.

| Étape | Contenu (cycle 4 : 5e, 4e, 3e) | Domaines | Outils de dessin à prévoir |
|---|---|---|---|
| 5 | Nombres relatifs (repérage, opérations), arithmétique (multiples, diviseurs, nombres premiers, décomposition) | A, B | droite graduée négative (étendre `demi_droite`), repère du plan |
| 6 | Fractions (opérations, cycle 4 complet), puissances, racine carrée, notation scientifique | C, A | aucun |
| 7 | Calcul littéral, développer et factoriser, équations, inéquations, mises en équation | F (Algèbre) | aucun |
| 8 | Géométrie du cycle 4 : symétrie centrale, parallélogramme, angles et parallèles, triangles égaux et semblables, Pythagore, Thalès, trigonométrie, translation, rotation, homothétie, repérage, sphère et sections. Grandeurs du cycle 4 : volumes, grandeurs composées, agrandissement et réduction | G, P | `geometrie` déjà prêt ; repère et transformations à ajouter ; `solide` pour sphère et sections |
| 9 | Proportionnalité du cycle 4 et fonctions (linéaires, affines, lecture graphique, tableaux de valeurs) | E, J (Fonctions) | courbes dans un repère |
| 10 | Statistiques (moyenne, médiane, étendue, diagrammes) et probabilités | K, L | diagrammes en barres et circulaires, arbres |
| 11 | Super exercices de fin de cycle (CM2, 6e, 3e) et cartes défi pour tout le collège | transverse | aucun |

**Arbitrages déjà pris, à reconduire :**
- algorithmique et programmation (Scratch) : hors évaluation, sauf un nœud de lecture si le programme l'impose ;
- seuil de maîtrise : `{3, 4}` ;
- 6 exercices par compétence.

**Ensuite, le lycée** (seconde, première et terminale spécialité, programmes déjà extraits dans `_travail/programmes/`) : domaines H (géométrie analytique), I (trigonométrie), J (fonctions), M (suites), N (analyse), O (espace et vecteurs), K et L (statistiques et probabilités). **À ne pas commencer avant que le collège soit fini et testé par de vrais élèves.**

---

## 8. Questions à poser à Gauthier (au début du sprint concerné)

Elles viennent de `Reste_a_faire.md`, que Gauthier a demandé de clarifier avant d'implémenter. Proposer chaque fois l'option recommandée en premier.

1. *(Sprint 1)* « Connexion au serveur quand en arrière (le vider auto) » : qu'est-ce qui se passe exactement ? Une page figée au retour sur l'onglet, une déconnexion, ou le projet Supabase en pause ? Que faut-il « vider » ?
2. *(Sprint 1)* « Le logo et le style graphique suivant » : **aucun fichier n'est joint dans `Reste_a_faire.md`**. Où sont-ils ? Faut-il en créer (Claude Design) ?
3. *(Sprint 1)* Changer sa date de naissance ou son email : faut-il l'accord du parent pour un mineur ?
4. *(Sprint 2)* Nouvelle règle de maîtrise (§6, sprint 2, point 2) : la valider ou l'ajuster. Faut-il aussi réviser la progression existante des comptes de test ?
5. *(Sprint 2)* Super exercices : combien, à quelles bornes ? Bloquants ou seulement conseillés au début ?
6. *(Sprint 2)* Cartes défi : écrites par agents (recommandé) ou dérivées automatiquement des cartes mentales ?
7. *(Sprint 4)* Réponses visibles par le parent : dans quelles conditions (§6, sprint 4, point 3) ?
8. *(Sprint 3 et 5)* Visio : Jitsi par lien (recommandé), champ URL libre, ou autre ? Séance en temps réel dès la version 1 ou plus tard ?
9. *(Business)* Hypothèses du business plan : prix, budget marketing mensuel, coût d'acquisition visé, part élève et professeur sur un cours.
10. *(Sprint 1)* Domaine à acheter (nom), et accord pour créer le dépôt GitHub dédié.

---

## 9. Dette et risques à garder en tête

- **Progression falsifiable** (écrite par le navigateur) : bloquant avant tout paiement (sprint 6).
- **RGPD et mineurs :** consentement avant 15 ans (sprint 1), export et suppression (sprint 4), hébergement UE.
- **Accessibilité :** le texte alternatif d'une figure ne donne pas la réponse, donc **un élève aveugle ne peut pas faire les 241 exercices à figure**. À traiter avec Marius.
- **Interface jamais testée de bout en bout** : Playwright au sprint 6. D'ici là, chaque sprint finit par un passage manuel dans un navigateur, sur téléphone compris.
- **Effet tunnel :** mieux vaut le collège excellent que le lycée bâclé. Rien de l'« itération 2 » (paiement, classe entière) avant de vrais élèves.
- **Erreurs mathématiques :** le circuit à double relecture et le recalcul par script sont non négociables. Un lot dont plus de 5 % des exercices ont un défaut bloquant impose de revoir la consigne.
- **Poids du bundle** (148 ko gzippés au premier chargement) ; cache du contenu en `localStorage` (environ 5 Mo), à passer sur IndexedDB au-delà de quelques milliers d'exercices.
- **Dessins encore absents :** règle et équerre posées, pictogrammes pour le plan du CP, patron du pavé, vues d'un assemblage de cubes.

---

## 10. Où trouver quoi

| Besoin | Fichier |
|---|---|
| Plan et circuit du contenu | `Spécifications DAG, Exos, Mindcards/PLAN_CONTENU.md` |
| Bilans qualité, leçons par étape | `Spécifications DAG, Exos, Mindcards/QUALITY.md` |
| Méthode DAG (niveaux, scissions) | `Spécifications DAG, Exos, Mindcards/CORRECTIONS_DAG_v2.md`, `PRINCIPES_PEDAGOGIQUES.md` |
| Contenu source | `Spécifications DAG, Exos, Mindcards/content/` (dag, exercices, cartes, figures) |
| Schémas JSON figés | `Spécifications DAG, Exos, Mindcards/schemas/` |
| Scripts | `scripts/` : `contenu.py`, `validate_content.py`, `check_lot.py`, `merge_*.py`, `figures.py`, `publier.py`, `recette.py`, `set_review_status.py`, `build_review_sheet.py` |
| Agents | `.claude/agents/exercise-generator.md`, `math-reviewer.md` |
| Travail en cours des agents | `_travail/` (lots, rapports, programmes extraits) |
| Code et commandes | `Math_Edu_Application/GUIDE.md`, `README.md` |
| Demandes de Gauthier | `Management de Projet/Reste_a_faire.md` (intégré au §6) |
| Historique, à ne pas suivre | `Math_Edu_Application/ROADMAP.md`, `Management de Projet/MATH_EDUCATION_Roadmap.docx` |
