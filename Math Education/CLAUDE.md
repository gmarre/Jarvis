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
- **Calendrier :** décision de Gauthier (19 octobre 2026) : **le déploiement vient en dernier**, une fois tous les points du backlog et tout le contenu jusqu'à la 3e terminés (sprint final, §6). La bêta fermée (5 à 10 élèves) suit le déploiement : l'objectif « fin novembre 2026 » n'est plus tenable et sera replanifié à ce moment.
- **Modèle économique visé :** abonnement élève 9,99 €/mois ; cours avec professeur 20 € les 1 h 30, 3 élèves maximum. **Rien n'est encaissé pendant la bêta** (`/abonnement` est informatif). Pas de paiement tant que la progression est écrite par le navigateur (§9).

---

## 2. État au 19 octobre 2026

### 2.1 Contenu (étape 5 fusionnée le 19 octobre 2026)

**170 compétences, 967 exercices (dont 262 avec figure), 35 cartes mentales**, tous en `relu_agent` (relus par agents), en attente de la recette de Marius.

| Domaine | Compétences | Classes couvertes |
|---|---|---|
| A Numération | 28 | CP à 3e (relatifs, repère, arithmétique du cycle 4) |
| B Calcul | 31 | CP à 4e (opérations sur les relatifs, priorités) |
| C Fractions | 18 | CE1 à 3e (cycle 4 très partiel : 4 compétences) |
| D Décimaux | 19 | CE1 à 6e |
| E Proportionnalité, pourcentages | 17 | CM1 à 5e |
| G Espace et géométrie | 30 | CP à 6e |
| P Grandeurs et mesures | 27 | CP à 6e |

**Constat :** le **cycle 3 (CM1 à 6e) et le cycle 2 sont couverts ; le cycle 4 (5e, 4e, 3e) commence** (étape 5 : relatifs et arithmétique). Plan pour aller au bout de la 3e : §7.

Étapes faites (bilans détaillés dans `Spécifications DAG, Exos, Mindcards/QUALITY.md`) : tranche pilote A et C ; 1 calcul ; 2 décimaux ; 3 proportionnalité ; 4a grandeurs et mesures ; figures (reprise de 30 exercices) ; 4b géométrie ; 5 relatifs et arithmétique (5e à 3e).

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
- les « flammes » (série de jours) sont **codées en dur à 6** (`WorkspacePage.tsx`, `streakDays`) ;
- consentement parental et accord du parent pour les mineurs : en base (0011) et fonction `accord-parental` déployée ; **aucun email ne part tant que le secret `RESEND_API_KEY` n'est pas posé** (la fonction le dit à l'élève) ;
- **refus du parent : le compte reste utilisable « en attente »** (décision de Gauthier, 19 octobre 2026 : on ne bloque pas pour l'instant, à reprendre au sprint 4) ;
- « Supprimer mon compte » n'efface rien : masqué hors démonstration jusqu'au sprint 4 ;
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
- **Migrations : jamais par l'outil MCP `apply_migration` (refusé par Gauthier).** Créer le fichier numéroté suivant dans `supabase/migrations/` (rejouable : `if not exists`, `create or replace`, `drop policy if exists`), puis Gauthier le colle dans le SQL Editor. Ne jamais modifier une migration déjà appliquée (dernière appliquée : 0011, le 19 octobre 2026).
- Les outils MCP Supabase `deploy_edge_function`, `get_edge_function` et `execute_sql` en lecture sont acceptés.
- Ne pas contourner un refus du classifieur de sécurité.

**Avant chaque commit :** `cd Math_Edu_Application && npm test && npm run lint && npm run build` (lint à zéro avertissement). Après une migration : **`npm run test:sql`** (PGlite, Postgres en WebAssembly, sans Docker : Gauthier ne veut pas de Docker Desktop). `supabase/tests/run.sh` reste pour qui a Docker.

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
  - Types : `demi_droite`, `droite_graduee` (relatifs, horizontale ou verticale, flèches de déplacement, écarts), `repere` (quatre quadrants), `regle`, `horloge`, `quadrillage` (axe, robot, chemin), `partage`, `bandes`, `monnaie`, `geometrie`, `rapporteur`, `solide`, `cubes`.
  - Le générateur refuse une figure qui trompe l'œil : angle codé droit qui ne l'est pas, angle presque droit, points presque alignés, longueurs codées égales qui ne le sont pas.
  - L'app affiche la figure en `<img>` data URI, donc aucun script ne peut s'exécuter.

### 4.2 Base (`supabase/migrations/0001` à `0011`, chaque fichier explique son objet)

**Tables :**
- `profiles` (rôle, niveau, email parent, consentement, préférences) ;
- `skill_progress` ;
- `exercise_attempts` (écriture seule) ;
- `placement_results` (historisé) ;
- `teachers`, `availability_slots`, `bookings`, vue `slots_disponibles` (places calculées, jamais stockées) ;
- `parent_links` (seulement `token_hash`) ;
- contenu publié : `content_skills`, `content_exercises`, `content_mindmaps`, `content_exercise_keys` (illisible pour les élèves, seule la fonction `corriger` la lit), `content_publications` ;
- recette : `content_reviewers`, `content_reviews` ;
- accord parental : `modifications_profil` (demandes d'un mineur soumises au parent, jeton haché).

**Colonnes protégées du client** (trigger) : `role` (choisi une seule fois, `role_choisi_le`, 0010), `consentement_parental_at`, `email`, `cree_le`, `abonnement` ; pour un mineur, `date_naissance` (0011). Un changement de parent ou une date sous 15 ans remet le consentement à zéro.

**Edge Functions :** `corriger` (`verify_jwt: true`, version 6 : signe moins typographique et °C) ; `accord-parental` (`verify_jwt: false`, le parent n'a pas de compte ; secrets `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`).

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

Modèles de consignes : `Spécifications DAG, Exos, Mindcards/modeles_agents/consigne_*_etape5.md` (les plus récentes, cycle 4, avec la consigne des cartes) et `consigne_*_etape4b.md` (toutes les règles de figures).

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
- **Tests SQL** : PGlite n'a qu'une connexion ; le lanceur remet la session à zéro entre deux fichiers, comme psql. Un test qui vise un compte supprimé par un test précédent ne rend aucune ligne et ne peut pas échouer (arrivé au test 62).
- **Codes d'échappement Unicode** (antislash, u, quatre chiffres) : l'outil Write, les heredocs Python et les paramètres d'outils MCP les transforment en caractères. Pour en écrire un dans un fichier, passer par `chr(92)`.
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

### Sprint 1 : Compte, profil, style graphique et mobile (priorité absolue)

**Avancement au 19 octobre 2026 (soir)** : points 1, 2, 3, 5, 6, 7, 8 et 10 faits et commités (palette bleu du logo validée par Gauthier, photo sur l'écran de connexion) ; migrations 0010 et 0011 appliquées ; « Confirm email » activé ; `accord-parental` déployée ; tests SQL verts sous PGlite.
**Reste :** point 4 (capture de la fenêtre de reconnexion, toujours absente : `captures/Fenetre_co.jpg` est la photo de connexion) ; Gauthier pose le secret `RESEND_API_KEY` (Supabase, Edge Functions, Secrets), puis test de bout en bout du consentement avec son propre email (sans domaine, Resend n'écrit qu'au titulaire du compte).
Décisions prises en route : la page publique du parent est `/accord/:jeton` (consentement et modifications), pas `/consentement/:token` ; les pastilles de QCM gardent leur lettre d'origine (11 corrigés citent « la proposition c »).

**Application**
1. **Avatar en haut à droite cliquable vers `/profil`** (bug, `AppShell.tsx` : l'avatar de l'en-tête n'est pas un lien). Vérifier aussi l'en-tête desktop.
2. **Modifier ses données dans `/profil`.**
   - **Décision :** pour un **mineur**, changer sa date de naissance ou son email exige l'**accord du parent** (validation par le parent rattaché) ; pour un **majeur**, non.
   - **Date de naissance :** si elle passe sous 15 ans, le consentement parental redevient exigé.
   - **Email :** via `supabase.auth.updateUser`, avec confirmation sur la nouvelle adresse.
   - **Mot de passe :** ancien mot de passe redemandé, nouveau saisi deux fois.

   `email`, `role` et `consentement` restent protégés côté base : passer par l'Auth Supabase ou une fonction serveur, jamais par l'écriture directe du profil.
3. **Création de compte par email :**
   - mot de passe saisi deux fois, avec règles minimales affichées (au moins 8 caractères) ;
   - **email de validation obligatoire** : réactiver « Confirm email » dans Supabase et tester le chemin complet dans un navigateur.
   - **Limite à connaître :** sans domaine, l'envoi d'emails est bridé. Le SMTP par défaut de Supabase n'envoie que quelques emails par heure, et Resend n'écrit qu'à l'adresse du compte tant qu'aucun domaine n'est vérifié. Cela suffit pour les tests en développement. Le SMTP Resend sur le domaine se branche au sprint final.

   L'administrateur peut créer un compte déjà confirmé depuis le tableau de bord Supabase (Authentication, Add user, « Auto confirm »). L'écrire dans un mémo admin.
4. **Reconnexion au retour d'arrière-plan.** Gauthier a une capture de la fenêtre obtenue à la connexion, **mais elle n'est pas arrivée dans la conversation du 19 octobre** : la lui redemander (à enregistrer dans `Management de Projet/captures/`) avant de coder ce point (§8). Interprétation retenue en attendant :
   - quand l'onglet revient au premier plan, rafraîchir la session et le contenu ;
   - si le serveur ne répond pas, le dire et réessayer, au lieu de laisser l'app figée.
5. **Rôle Professeur ou Parent choisi à l'inscription Google** : fonction serveur qui fixe le rôle une seule fois, tant que le profil est incomplet (aujourd'hui le trigger refuse).
6. **Mélanger les propositions de QCM à l'affichage**, sans toucher aux clés.
7. **Logo et style graphique.** Le logo source est `Math_Edu_Application/logos/logo-racine-source.png` (variantes dans `public/brand/`, voir `logos/LISEZMOI.md`). Il se compose :
   - d'un fond bleu vif ;
   - d'un symbole racine carrée formant un « R », avec des racines blanches et des feuilles vertes ;
   - de symboles mathématiques colorés : π orange, ÷ vert, × rouge-orangé, √ bleu clair, + jaune ;
   - du mot « RACINE » en capitales blanches arrondies.

   À faire :
   - renommer le fichier sans espaces ;
   - produire les variantes : symbole seul, fond transparent, favicon, icônes PWA de 192 et 512 px ;
   - **reprendre la palette** de la direction artistique (aujourd'hui accent indigo #6366F1) à partir du bleu du logo et de ses couleurs d'accent, uniquement par les jetons de `tailwind.config.js` ;
   - vérifier les contrastes (WCAG AA).

   Montrer une maquette à Gauthier avant de tout basculer. **Photos sur la page de connexion** : libres de droits, compressées (WebP), avec un texte alternatif.
8. **Téléphone et tablette :**
   - passe responsive écran par écran (360, 768 et 1024 px) ;
   - **procédure de test sur un vrai téléphone**, sans déploiement (repoussé au sprint final) : `npm run dev -- --host` sur le réseau local, puis l'adresse affichée ouverte sur le téléphone connecté au même Wi-Fi. Certaines API ne marchent qu'en HTTPS : prévoir un certificat local (plugin `@vitejs/plugin-basic-ssl`) si besoin, et écrire la procédure pas à pas pour Gauthier.
9. **Déploiement et référencement : déplacés au sprint final** (décision de Gauthier).
10. **Consentement parental par email** (obligation légale avant 15 ans), codé et testé maintenant avec les limites d'envoi ci-dessus ; la mise en service réelle se fait au sprint final :
    - Edge Function `send-parent-consent` avec Resend ;
    - jeton haché, valable 7 jours ;
    - page `/consentement/:token` et bouton « Renvoyer » limité en fréquence.

**Contenu (agents, en parallèle) :** étape 5 du §7 **faite** le 19 octobre 2026 (20 compétences, 120 exercices, 5 cartes, aucune réponse fausse en relecture ; bilan dans `QUALITY.md`). Consignes rangées en modèles : `modeles_agents/consigne_*_etape5.md`. Remettre aussi au propre les 6 cartes en brouillon et les 7 anomalies CE1 (§2.1).

### Sprint 2 : Pédagogie de l'élève

1. **Correction du test de positionnement :** à la fin du test (pas pendant, pour ne pas casser le rythme), l'élève revoit chaque question, sa réponse, la bonne réponse et le corrigé. Il faut une fonction serveur qui rend les clés **après** le test seulement.
2. **Maîtrise exigeante et notée sur 5** (méthode validée par Gauthier le 19 octobre 2026). Aujourd'hui une compétence est maîtrisée avec 3 réussites sur les 4 dernières tentatives (`mastery_threshold`).
   - **Règle d'acquisition :** au moins 2 exercices différents réussis, dont un de niveau maîtrise.
   - **Niveau de maîtrise de 0 à 5 par compétence**, visible par l'élève, qui fixe la fréquence des contrôles :
     - **5/5** : complètement acquis, plus de révision ;
     - **4/5** : un contrôle très rarement ;
     - plus bas : des contrôles de plus en plus fréquents.

     Un contrôle réussi fait monter le niveau, un raté le fait descendre (à 3 ou moins, la compétence revient dans le plan de travail).
   - **Les compétences validées par le test d'entrée sont aussi contrôlées de temps en temps.** Un contrôle réussi ne change rien pour l'élève. Un raté rouvre la compétence.
   - Écrire la table exacte niveau → intervalle de révision avant de coder, et la faire valider.

   À porter dans `dag.ts`, avec ses tests, et dans `skill_progress` (nouvelle colonne, par migration). Prévoir la reprise des progressions existantes.
3. **Révisions et flammes réelles :**
   - calcul de la série de jours depuis `exercise_attempts`, au lieu du 6 en dur ;
   - file « à réviser » visible (exercices et cartes dont l'échéance est passée) ;
   - **scénario de test** qui avance l'horloge (Vitest, fausses dates) pour prouver la révision espacée et les flammes, puisque Gauthier n'a pas pu la valider à la main.
4. **Cartes « défi » (recto et verso)** : cycle de l'élève découvrir (carte arbre), exercice simple, carte recto et verso à retrouver, exercices de plus en plus durs.
   - **Contenu :** 4 à 6 cartes question-réponse par compétence, **écrites par agents** (décision de Gauthier) à partir des cartes mentales, et relues comme les exercices. Nouveau fichier `content/flashcards/<compétence>.json` et nouveau schéma.
   - **Application :** mode « défi » avec auto-évaluation (« je savais / je ne savais pas ») et une file de révision espacée propre aux cartes.
5. **Cartes mentales :** indication visible au premier affichage (« Touche un rond pour déplier ») et bouton « Tout déplier ».
6. **Chemins proposés :**
   - remplacer l'écart entre « Chemin » et « Graphe » par **plusieurs chemins proposés selon la classe**, qui traversent les domaines (par exemple « Consolider les fractions », « Préparer la géométrie de 6e ») ;
   - l'élève en choisit un ou plusieurs ;
   - le bouton « Graphe » est rendu visible en haut de `/parcours`.

   Les chemins sont calculés depuis le DAG (lacunes et objectifs de la classe), pas écrits à la main.
7. **« Super exercices » (problèmes transverses de 15 à 20 min) :** ils bloquent l'accès au niveau supérieur et demandent plusieurs domaines à la fois. Jamais proposés pendant le test d'entrée.
   - **Volume** (décision de Gauthier) : **au minimum 1 par classe et par domaine, et viser 4 à 5**.
   - **Interprétation retenue :** « 1 par classe par compétence » est compris comme par classe et par domaine. Un super exercice par compétence ferait plus de 750 problèmes longs, hors de portée ; le confirmer avec Gauthier au lancement.
   - **Ce qu'ils travaillent en priorité :** la **compréhension des énoncés** (texte long, données à trier, informations inutiles) et la **convergence des notions** (plusieurs compétences de domaines différents dans un même problème). C'est là que les élèves échouent le plus.
   - **Contenu :** rédigés et relus par agents, comme les exercices ; une consigne propre est à écrire, avec un barème par étape.
   - **Application :** un type d'exercice « super exercice » à plusieurs questions enchaînées, une page d'examen, et le blocage du niveau supérieur tant qu'il n'est pas réussi.
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
   - **Décision : Jitsi Meet** (open source, gratuit, sans compte), avec un lien unique et difficile à deviner, généré par séance et visible des seuls inscrits.
   - **Pendant le cours :** une page « Séance » ouverte à côté de la visio. Le professeur y choisit une carte ou un exercice, et les élèves de la séance le voient s'afficher. Il faut une diffusion temps réel, Supabase Realtime, sur une table `seance_etat`.

   *Avis critique :* une version 1 sans temps réel est possible : le professeur partage son écran et les élèves ouvrent le lien de l'exercice.
6. **Vérification des professeurs** avant d'ouvrir l'offre à des inconnus : validation manuelle par l'administrateur, avec un rôle `prof` accordé par l'admin.

**Contenu :** étape 7 du §7.

### Sprint 4 : Parents

1. **Espace parent :** rattachement à un ou plusieurs enfants (le consentement du sprint 1 crée le lien), et suivi de leur progression.
   - **Refus du consentement par le parent** : aujourd'hui le compte reste utilisable « en attente ». Décider avec Gauthier s'il faut le bloquer, le supprimer après un délai, ou relancer le parent (décision du 19 octobre 2026 : ne pas bloquer pour l'instant).
2. **Rapport hebdomadaire par email :** exercices faits, cartes revues, compétences gagnées. Cron Supabase et Resend.
3. **Chemins à faire réviser, avec réponses et corrigés pour le parent.** Décision de Gauthier : on part du principe que l'enfant ne va pas dans l'espace parent. Les réponses et les corrigés y sont donc visibles librement. Il faut une fonction serveur qui ne rend les clés qu'à un compte parent rattaché.
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

### Sprint final : déploiement et référencement (après tous les sprints et tout le contenu jusqu'à la 3e)

Décision de Gauthier : on déploie une fois tout le reste fait. **Gauthier connaît mal le sujet** : produire un **guide pas à pas**, avec chaque clic, chaque écran et chaque valeur à saisir, et le dérouler avec lui. Contenu :
1. dépôt GitHub privé dédié `math-education`, avec accès pour Marius ;
2. achat du domaine (OVH, environ 12 €/an, nom à choisir avec Gauthier) ;
3. Netlify relié au dépôt, avec les variables `VITE_*` recopiées **avant** le premier build, et `NODE_VERSION` ;
4. DNS du domaine vers Netlify, puis HTTPS ;
5. Resend avec le domaine vérifié (SPF, DKIM), branché comme SMTP de Supabase Auth et utilisé par les Edge Functions d'emails ;
6. URL de redirection de Supabase Auth et de Google OAuth sur le domaine ;
7. passage de l'écran Google en Production (exige la politique de confidentialité) ;
8. PWA installable ;
9. **référencement** : landing statique séparée sur la racine du domaine (Astro ou HTML), application sur `/app`, politique de confidentialité, mentions légales, `sitemap.xml`, Google Search Console. Ne pas migrer la SPA pour le SEO ;
10. Supabase Pro, ou ping hebdomadaire actif ;
11. vérification finale sur téléphone, tablette et ordinateur.

### Business (à mener en parallèle, sans code)

1. **Business plan : c'est à Claude de proposer** (Gauthier n'a pas d'hypothèses arrêtées). Livrable : un document à part, pas dans ce fichier, avec :
   - les **coûts réels** recherchés et datés : Supabase Pro, Netlify, domaine, Resend, Sentry et PostHog gratuits, publicité sur les réseaux (Meta, TikTok), référencement, frais Stripe ;
   - **2 ou 3 offres** cohérentes et chiffrées (par exemple gratuit limité, élève, élève avec professeur, famille) ;
   - un prix par offre, la répartition élève et professeur sur un cours, le coût d'acquisition et le taux de conversion supposés, chacun justifié par une source ou un comparable (Kartable, Superprof, Mathia…) ;
   - le point mort et trois scénarios (prudent, central, ambitieux) sur 24 mois, dans la limite d'un budget de départ de 500 €.

   Présenter les hypothèses à Gauthier pour validation avant de figer les chiffres.
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

**Attendus de 5e sans nœud après l'étape 5** (relevés par le cartographe) : diviser par un décimal, traduire un programme de calcul en une seule expression, distributivité simple sur des exemples numériques. À placer à l'étape 6 ou 7.

**Arbitrages déjà pris, à reconduire :**
- algorithmique et programmation (Scratch) : hors évaluation, sauf un nœud de lecture si le programme l'impose ;
- seuil de maîtrise : `{3, 4}` ;
- 6 exercices par compétence.

**Ensuite, le lycée** (seconde, première et terminale spécialité, programmes déjà extraits dans `_travail/programmes/`) : domaines H (géométrie analytique), I (trigonométrie), J (fonctions), M (suites), N (analyse), O (espace et vecteurs), K et L (statistiques et probabilités). **À ne pas commencer avant que le collège soit fini et testé par de vrais élèves.**

---

## 8. Décisions de Gauthier et questions restantes

**Réponses du 19 octobre 2026** (déjà reportées dans le backlog) :
1. Retour d'arrière-plan : une capture de la fenêtre existe, **non reçue**. **À redemander au début du sprint 1.**
2. Logo : fourni dans `Math_Edu_Application/logos/`. Le style graphique est à dériver du logo (§6, sprint 1, point 7).
3. Accord du parent pour changer date de naissance ou email : **oui pour un mineur, non pour un majeur**.
4. Maîtrise : méthode validée, avec un **niveau de maîtrise sur 5** et des contrôles réguliers, y compris sur ce que le test d'entrée a validé.
5. Super exercices : au minimum 1 par classe et par domaine, viser 4 à 5. Ils portent sur la compréhension des énoncés et la convergence des notions. L'interprétation est à confirmer au lancement.
6. Cartes défi : écrites par agents.
7. Réponses visibles par le parent : librement dans l'espace parent.
8. Visio : Jitsi.
9. Business plan : à proposer par Claude.
10. Domaine, dépôt dédié et déploiement : au sprint final, avec un guide pas à pas.

**Réponses du 19 octobre 2026 (soir)** : palette du logo validée ; refus du parent : on ne bloque pas pour l'instant (sprint 4) ; 13 arbitrages de l'étape 5 validés ; pas de Docker Desktop (tests SQL sous PGlite).

**Questions encore ouvertes :**
- la capture du point 1 ;
- la table niveau de maîtrise → intervalle de révision (sprint 2) ;
- l'interprétation du volume de super exercices (sprint 2) ;
- les hypothèses du business plan, une fois proposées.

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
