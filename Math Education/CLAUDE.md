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

## 2. État au 21 octobre 2026

### 2.1 Contenu (étape 7 fusionnée et publiée le 21 octobre 2026)

**227 compétences, 1 342 exercices (dont 290 avec figure), 42 cartes mentales, 1 074 cartes défi, 193 super exercices**, tous en `relu_agent` (relus par agents), en attente de la recette de Marius. En cours : cartes mentales de l'étape 7 (MM-B-08, MM-F-01 à 06), exercices du complément cycle 3 (B056 à B058, F069 à F071), puis cartes défi et super exercices des 31 nouvelles compétences.

| Domaine | Compétences | Classes couvertes |
|---|---|---|
| A Numération | 40 | CP à 3e (relatifs, repère, arithmétique, puissances, racine carrée, notation scientifique) |
| B Calcul | 40 | CP à 3e (opérations sur les relatifs, priorités, calcul avec des puissances, programme de calcul, distributivité) |
| C Fractions | 27 | CE1 à 4e (cycle 4 complet : opérations, inverse, quotient, problèmes) |
| D Décimaux | 20 | CE1 à 5e (division par un décimal) |
| E Proportionnalité, pourcentages | 17 | CM1 à 5e |
| F Algèbre | 26 | CM1 à 3e (pensée algébrique du cycle 3, calcul littéral, équations, inéquations) |
| G Espace et géométrie | 30 | CP à 6e |
| P Grandeurs et mesures | 27 | CP à 6e |

**Constat :** le **cycle 3 (CM1 à 6e) et le cycle 2 sont couverts ; le cycle 4 (5e, 4e, 3e) avance** (étape 5 : relatifs et arithmétique ; étape 6 : fractions, puissances, racine carrée, notation scientifique). Plan pour aller au bout de la 3e : §7.

Étapes faites (bilans détaillés dans `Spécifications DAG, Exos, Mindcards/QUALITY.md`) : tranche pilote A et C ; 1 calcul ; 2 décimaux ; 3 proportionnalité ; 4a grandeurs et mesures ; figures (reprise de 30 exercices) ; 4b géométrie ; 5 relatifs et arithmétique (5e à 3e) ; 6 fractions du cycle 4, puissances, racine carrée, notation scientifique (5e à 3e) ; 7 calcul littéral, équations, inéquations (5e à 3e, exercices). DAG seul pour l'instant : 7 bis, pensée algébrique du cycle 3 (6 compétences).

Restes connus sur le contenu :
- tranche pilote **complétée le 20 octobre 2026** : plus aucune compétence sous 6 exercices (bilan dans `QUALITY.md`) ; EX-C030-D-01, E-03, M-02 demandent encore une fraction en `numerique` (à passer en `texte`) ;
- MM-A-01 couvre 12 compétences (règle : 4 à 8) : à scinder lors de cette reprise ;
- le validateur réserve `<` et `>` aux descendants de A006 (CE1), alors que le programme du CP les emploie déjà : à vérifier dans le programme avant de changer la règle ;
- reprise du 20 octobre 2026, relue et contre-relue : citations de A004, A005, A006, A008 (et rubrique de A011), énoncés de C001, C003, C009 sous le plafond du CE1, 6 anciennes cartes remises au niveau (toutes les cartes sont maintenant `relu_agent`), indice faux de EX-A027-D-01 corrigé. Plus aucune anomalie de coordination dans `RELECTURE.md`. Mineur laissé : l'exemple de MM-C-03 (C011) donne 95/60, non simplifié.

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
- **Migrations : jamais par l'outil MCP `apply_migration` (refusé par Gauthier).** Créer le fichier numéroté suivant dans `supabase/migrations/` (rejouable : `if not exists`, `create or replace`, `drop policy if exists`), puis Gauthier le colle dans le SQL Editor. Ne jamais modifier une migration déjà appliquée (dernière appliquée : 0016, le 20 octobre 2026).
- Les outils MCP Supabase `deploy_edge_function`, `get_edge_function` et `execute_sql` en lecture sont acceptés.
- **Migrations 0017 à 0021 appliquées en ligne** (constaté le 21 octobre 2026 ; 0018 : vérifier les professeurs, sinon leurs créneaux disparaissent du catalogue des élèves). `corriger` v14 et `rendre-super` v1 sont déployées : l'ancienne version de l'application, qui écrivait elle-même sa progression, est refusée. **À appliquer : 0022** (en ligne, `publier_contenu` était revenue à la version de 0014, sans les super exercices : `content_super` est vide ; ne pas rejouer 0016, qui rouvrirait l'écriture des passages au navigateur). Puis republier (`publier.py --apply`). **`supabase/cron/rappels.sql` pas encore appliqué** (l'extension `pg_cron` est absente ; secret `CRON_SECRET` à créer, mode d'emploi en tête du fichier).
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

### 4.2 Base (`supabase/migrations/0001` à `0021`, chaque fichier explique son objet)

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

**Edge Functions :** `rapport-hebdo` (`verify_jwt: false`, v1, résumé hebdomadaire au parent, secret `CRON_SECRET`) ; `supprimer-compte` (`verify_jwt: true`, v1, suppression définitive, mot SUPPRIMER) ; `rappel-revision` (`verify_jwt: false`, version 1 : rappels de travail par email, migration 0017 ; secrets `RESEND_*`, `APP_URL`, `CRON_SECRET`) ; `rendre-super` (`verify_jwt: true`, v1, sprint 6 : corrige toute la copie d'un super exercice, compte les points, écrit `super_attempts` et la progression de la porteuse) ; `corriger` (`verify_jwt: true`, version 14 : mode « exercice », qui écrit la tentative et la progression avec `_shared/maitrise.ts`, et mode « positionnement », qui garde le verdict dans `placement_reponses` ; formes réduite, développée, factorisée complète, équation (« x = 7 » refusé), inégalité (« => »), solutions (« S = {…} »), crochets, « P = 6x », unité après une expression ; questions de super exercices `SX-…#qN`, lecture des expressions algébriques (`answer.forme`), signe moins typographique, °C, « +8 °C », « 7,7° » pour des °C, puissances et notation scientifique reconnues sans calcul, fractions relatives, « ÷ », « fois », « cm^2 », « n = 13 », écritures du signe d'une fraction sans réduction ni double signe, tolérance incluse, espaces de milliers au corrigé) ; `accord-parental` (`verify_jwt: false`, le parent n'a pas de compte ; secrets `RESEND_API_KEY`, `RESEND_FROM`, `APP_URL`).

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

MCP `deploy_edge_function`, nom `corriger`, point d'entrée `corriger/index.ts`, fichiers `corriger/index.ts`, `_shared/correction.ts`, `_shared/maitrise.ts` et `_shared/progression.ts`, `verify_jwt: true`. Même chose pour `rendre-super` (point d'entrée `rendre-super/index.ts`, mêmes fichiers partagés). Toute modification de `_shared/maitrise.ts` se redéploie dans les deux.

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

**Sprint 1 clos le 20 octobre 2026.** Tous les points faits et commités ; migrations 0010 et 0011 appliquées ; « Confirm email » activé ; `accord-parental` déployée ; secret `RESEND_API_KEY` posé par Gauthier (test de bout en bout du consentement avec sa propre adresse encore à faire ensemble). Point 4 : la demande d'origine (« Connexion au serveur quand en arrière ») visait l'**image de fond de l'écran de connexion** (`captures/Fenetre_co.jpg`), en place.
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

**Contenu (agents, en parallèle) :** reprise des anomalies CE1 et des 6 cartes en brouillon **faite** le 20 octobre 2026 ; étape 5 du §7 **faite** le 19 octobre 2026 (20 compétences, 120 exercices, 5 cartes, aucune réponse fausse en relecture ; bilan dans `QUALITY.md`). Consignes rangées en modèles : `modeles_agents/consigne_*_etape5.md`. Remettre aussi au propre les 6 cartes en brouillon et les 7 anomalies CE1 (§2.1).

### Sprint 2 : Pédagogie de l'élève

**Avancement au 20 octobre 2026 :**
- fait et commité : point 2 (maîtrise sur 5, `lib/maitrise.ts`, migration 0013 appliquée, scénario d'horloge en tests) ;
- fait et commité : point 1 (correction du test de positionnement à la fin, sans nouvelle fonction serveur : la correction rendue après chaque réponse est conservée), point 3 en partie (série de jours réelle, `lib/serie.ts`), point 5 (astuce et « Tout déplier »), point 6 (chemins proposés, `lib/chemins.ts`, migration 0012 appliquée) ;
- aussi : bouton « ± » sur la saisie numérique à partir de la 5e (le pavé de l'iPhone n'a pas de signe moins) ;
- **point 4 (cartes défi), code fait le 20 octobre 2026** : contenu `content/flashcards/` (schéma `flashcards.schema.json`, `scripts/merge_defis.py`, consigne `modeles_agents/consigne_defis.md`), migration **0014** (`content_flashcards`, `flashcard_progress`, publication), écran `/defi/:skillId` (recto, retourner, « je savais » ou non), révision espacée par carte J+1, J+3, J+7, J+14, J+30 (`lib/defis.ts`), cartes dues dans « À réviser ». **Contenu fait le 20 octobre 2026 : 1 074 cartes défi pour les 196 compétences**, relues et contre-relues (bilan dans `QUALITY.md`), publiées le 20 octobre 2026 ;
- **point 7 (super exercices), code fait le 20 octobre 2026** : contenu `content/super/` (schéma `super.schema.json`, `scripts/merge_super.py`, consigne `modeles_agents/consigne_super.md`), migration **0016** (`content_super` lisible, `content_super_keys` serveur seulement, `super_attempts`), correction d'une question `SX-…#q2` par `corriger`, page d'examen `/super/:id` (énoncé visible, copie rendue d'un bloc, réussite à 70 % des points), proposé une fois la compétence acquise. **Règle du super exercice (décision de Gauthier du 20 octobre 2026, codée le 21 octobre, `lib/maitrise.ts` : `apresEpreuve`, `attendEpreuve`, `viseSansFaute`) : il fait passer au niveau 4, le sans-faute compte pour le 5 ; un super exercice raté ne fait rien redescendre ; compétences sans super exercice (A001, G001, G004) : table d'origine ; progressions déjà au niveau 4 : gardées.** **Contenu fait le 20 octobre 2026 : 193 super exercices, un par compétence** (sauf A001, G001 et G004, sans prérequis), 46 figures, relus par lot (bilan dans `QUALITY.md`), publiés le 20 octobre 2026 ;
- **point 8 (engagement), fait le 20 octobre 2026** : note `Management de Projet/Etude_engagement.md` (28 sources) ; faits : série qui pardonne un jour manqué et « N jours sur les 7 derniers », bilan avec le niveau avant et après, fin de journée qui invite à s'arrêter, interrupteurs de rappels et de résumé masqués tant qu'ils n'envoient rien, rappels désactivés par défaut (migration **0015**). **Fait le 21 octobre 2026 (décision de Gauthier du 20) : rythme choisi par l'élève** (carte « Mon rythme » de `/profil`, « N séances sur 3 cette semaine » dans `/travail`) **et rappels par email** (fonction `rappel-revision`, migration 0017, Cron `supabase/cron/rappels.sql`, page `/rappels/:jeton` du parent ; avant 15 ans le parent accepte, ensuite l'élève active lui-même ; 1 par jour, 3 par semaine, arrêt après 2 sans effet) ;
- limite connue : un élève très en retard voit des chemins très longs (jusqu'à 90 compétences) ; n'afficher que les prochaines étapes.

**Table de maîtrise validée par Gauthier le 20 octobre 2026 :**

| Niveau | Sens | Ce que fait l'application |
|---|---|---|
| 0 | Pas encore travaillée | Dans le plan si c'est une lacune |
| 1 | Un exercice réussi | Dans le plan de travail |
| 2 | Deux exercices différents réussis, aucun de niveau maîtrise | Dans le plan de travail |
| 3 | Rouverte après un contrôle raté, **ou exercices faits et super exercice à réussir** | Dans le plan ; rouverte : un exercice de maîtrise réussi la remonte à 4 (si le super exercice a déjà été réussi) ; sinon c'est **le super exercice réussi qui la fait passer à 4** |
| 4 | Acquise (2 exercices différents réussis, dont 1 de maîtrise, **et le super exercice réussi** s'il existe) ; **débloque les compétences suivantes** | Contrôles à J+3, J+10, J+30 ; 3 contrôles réussis d'affilée **et le super exercice réussi sans faute** la font passer à 5 |
| 5 | Complètement acquise (le plus dur à atteindre ; ne bloque rien) | Plus aucun contrôle |

- Un contrôle : un exercice de la compétence non fait récemment, de niveau entraînement ou maîtrise ; il apparaît dans « À réviser » avec les cartes.
- Contrôle raté : descente à 3, la compétence revient dans le plan.
- Validée par le test d'entrée : niveau 4, contrôles plus espacés (J+14, puis J+45) ; un contrôle réussi ne change rien de visible, un raté rouvre (niveau 3).
- Reprise des progressions existantes : « maîtrisée » devient 4 avec un contrôle à J+3 ; « en cours » devient 1 ou 2 selon les réussites.
- L'élève voit son niveau sur 5 (5 petits ronds) par compétence.

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
   - **Décision de Gauthier (20 octobre 2026) : commencer par un super exercice par compétence**, compléter ensuite. Avancer par domaine et par classe, pas tout d'un coup.
   - **Ce qu'ils travaillent en priorité :** la **compréhension des énoncés** (texte long, données à trier, informations inutiles) et la **convergence des notions** (plusieurs compétences de domaines différents dans un même problème). C'est là que les élèves échouent le plus.
   - **Contenu :** rédigés et relus par agents, comme les exercices ; une consigne propre est à écrire, avec un barème par étape.
   - **Application :** un type d'exercice « super exercice » à plusieurs questions enchaînées, une page d'examen, et le blocage du niveau supérieur tant qu'il n'est pas réussi.
8. **Engagement et recherche :** courte étude documentaire sur l'habitude et la motivation des 8 à 15 ans (autodétermination, rappels, gamification). Livrable : une note de 2 pages et 5 changements d'interface.
   - **Garde-fou :** pas de mécanique manipulatrice sur des mineurs (pas de perte punitive, pas de notifications nocturnes), conformément aux recommandations CNIL pour les mineurs.
   - Rappels : emails d'abord, notifications PWA ensuite.

**Contenu, étape 7 (calcul littéral, domaine F)** : DAG fusionné le 20 octobre 2026 (25 compétences : B054, B055, F002, F003, F006, F010, F012 à F014, F020 à F025, F027, F031, F061 à F068) ; **150 exercices rédigés, relus, corrigés, fusionnés et publiés le 21 octobre 2026** (6 lots, consigne `_travail/brief_etape7.md`, relecture `_travail/brief_relecture_etape7.md`) ; liens ajoutés en relecture : B054 ← D004, B055 ← B007 (B055 ← B041 retiré). Complément cycle 3 (étape 7 bis) : B056, B057, B058, F069, F070, F071, liens B055 ← B056, B054 ← B058, F003 ← F071, F023 ← F069. **Fait le 21 octobre 2026** : 36 exercices du cycle 3 fusionnés (non publiés), cartes défi de l'étape 7 (139) et du cycle 3 fusionnées, cartes mentales MM-B-08, MM-F-01 à MM-F-06, MM-B-09 et MM-F-07 relues, corrigées et fusionnées (non publiées). Restent : super exercices des 31 compétences (4 lots en rédaction, brief `_travail/brief_super_etape7.md`), puis publication et bilan dans `QUALITY.md`. La correction des expressions (S1 à S5 du cartographe) est faite : `answer.forme` (`expression`, `reduite`, `developpee`, `factorisee`, `meme_calcul`, `equation`, `inegalite`, `solutions`), 29 tests dans `src/lib/algebre.test.ts` ; déployée dans `corriger` (version 11).

**Contenu :** **étape 6 du §7 fusionnée et publiée le 20 octobre 2026** : 26 compétences, 156 exercices, 7 cartes, tous relus et contre-relus par agents (bilan dans `QUALITY.md`). Liens ajoutés en relecture : A034 ← B049 (et A032 ← A031 seul). A025 réécrite avec les puissances. A038 n'est plus en évaluation partielle (la notation scientifique se tape) ; seule C035 l'est encore. Prochaine étape de contenu : 7 (calcul littéral, domaine F).

### Sprint 3 : Professeur v1

**Avancement au 21 octobre 2026 (lancé sur décision de Gauthier : « continuer à coder le reste en suivant les sprints ») :** migration **0018** écrite (à appliquer, puis vérifier chaque professeur : `update teachers set verifie_le = now() where id = (select id from profiles where email = '...');`), tests SQL 120 à 130 ; points 1 (offres, `/prof/cours`), 2 (agenda semaine ou mois avec inscrits, `/prof/agenda`), 3 (profil public, `/profil` du prof et `/profs/:id`), 4 (graphe d'un élève qui partage, `/prof/eleves/:id`, et « Que travailler ensemble ? », `lib/suggestions.ts`), 5 en version 1 (lien Jitsi imprévisible par séance, table `seances_visio`, sans page « Séance » temps réel : choix de l'avis critique, à confirmer par Gauthier) et 6 (vérification : `verifie_le`, protégée du client ; un professeur non vérifié est caché des élèves) **codés**. Restent : photo du profil (stockage de fichiers), page « Séance » en temps réel si Gauthier la veut.


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

**Avancement au 21 octobre 2026 :** migration **0019** écrite (à appliquer), tests SQL 140 à 148 ; points 1 (rattachement par l'adresse du consentement, suivi par enfant sur `/parent`), 2 (résumé du dimanche, fonction `rapport-hebdo`, Cron dans `supabase/cron/rappels.sql`, désinscription `/rapport/:jeton`), 3 (exercices, réponses et corrigés pour le parent, `/parent/revision/:skillId`, fonction SQL `corriges_pour_parent`) et 4 (export JSON et suppression définitive, fonction `supprimer-compte`, pour soi ou pour un enfant rattaché ; « Supprimer mon compte » rétabli dans `/profil`) **codés**. Refus du consentement : toujours « en attente », sans blocage (décision du 19 octobre).


1. **Espace parent :** rattachement à un ou plusieurs enfants (le consentement du sprint 1 crée le lien), et suivi de leur progression.
   - **Refus du consentement par le parent** : aujourd'hui le compte reste utilisable « en attente ». Décider avec Gauthier s'il faut le bloquer, le supprimer après un délai, ou relancer le parent (décision du 19 octobre 2026 : ne pas bloquer pour l'instant).
2. **Rapport hebdomadaire par email :** exercices faits, cartes revues, compétences gagnées. Cron Supabase et Resend.
3. **Chemins à faire réviser, avec réponses et corrigés pour le parent.** Décision de Gauthier : on part du principe que l'enfant ne va pas dans l'espace parent. Les réponses et les corrigés y sont donc visibles librement. Il faut une fonction serveur qui ne rend les clés qu'à un compte parent rattaché.
4. **RGPD :** export et suppression des données à la demande du parent.

**Contenu :** étape 8 du §7.

### Sprint 5 : Relation de suivi professeur, élève et parent (offre d'abonnement supérieure)

**Avancement au 21 octobre 2026 :** migration **0020** écrite (à appliquer), tests SQL 160 à 171 ; points 1 (suivi demandé par l'élève depuis `/profs/:id`, accepté ou refusé sur `/prof/eleves`, suivis de l'élève sur `/mes-profs`), 2 (messagerie `/suivi/:id` à trois, le parent lit et écrit, signalement, archive ; l'administrateur lit les messages signalés dans le SQL Editor : `select * from messages_suivi where signale_le is not null`) et 3 (créneaux réservés aux élèves suivis ; le cours individuel se demande dans le fil) **codés**. Point 4 : propositions ci-dessous, **à soumettre à Gauthier**, rien codé.


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

**Avancement au 21 octobre 2026 :** progression côté serveur **codée, testée et déployée** (migration **0021** à appliquer). La règle de maîtrise vit dans `supabase/functions/_shared/maitrise.ts`, que `src/lib/maitrise.ts` réexporte ; `corriger` (mode « exercice ») écrit la tentative et la ligne de progression, `rendre-super` corrige la copie et écrit le passage ; le navigateur ne peut plus écrire ni ses tentatives, ni ses passages, ni son positionnement, ni sa progression, sauf la relecture espacée des cartes (trigger `proteger_progression`) ; `enregistrer_positionnement` n'accepte que les compétences réussies pendant le test et leurs prérequis, et ne touche pas une compétence déjà acquise. La démonstration fait le même calcul localement. Tests SQL 08, 10 et 15 (TEST 190 à 196), contrôle d'intégration mis à jour. Limites connues : deux réponses simultanées sur une même compétence peuvent se chevaucher (l'écran attend la correction) ; les échéances serveur sont posées à 6 h UTC.

- ~~Passer la progression côté serveur (`applyAttempt` dans une Edge Function) : prérequis de tout paiement.~~ Fait (voir ci-dessus).
- Parcours Playwright élève, professeur et parent.
- `/security-review`.
- ~~Montée de react-router 7~~ : faite le 21 octobre 2026 (`react-router-dom` 7.18.4, `npm audit --omit=dev` à 0). react-router 7 demande Node 20 : `NODE_VERSION=20` sur Netlify au sprint final ; le Node 18.18 local suffit pour les tests et le build.
- ~~Polices auto-hébergées~~ : faites le 21 octobre 2026 (`@fontsource-variable/inter` et `fraunces`, axe opsz ; plus aucune requête vers Google Fonts).
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

**Attendus de 5e sans nœud après l'étape 6** : traduire un programme de calcul en une seule expression, distributivité simple sur des exemples numériques ; à placer à l'étape 7 (diviser par un décimal : D026, étape 6). x² = a est aussi renvoyé à l'étape 7.

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

**Réponses du 20 octobre 2026** : sprint 1 clos (le point 4 visait l'image de fond de la connexion) ; Resend configuré ; table de maîtrise validée (sprint 2) ; super exercices : un par compétence pour commencer ; 9 arbitrages de l'étape 6 validés ; tranche pilote complétée au sprint 2.

**Tests à faire avec Gauthier, gardés pour plus tard (demande du 20 octobre 2026) :**
1. Consentement parental de bout en bout : création d'un compte de moins de 15 ans, email Resend reçu sur l'adresse de Gauthier, accord puis refus, modification de date de naissance soumise à accord.
2. Correction en ligne (`corriger` version 12) sur un vrai compte : « 7,7° » pour une température en °C, « n = 13 », « 1,496 fois 10^8 », « 225 cm^2 », « 6/(-10) » acceptés ; « -3/-7 » refusé pour 3/7 ; espaces de milliers dans le corrigé.
3. Maîtrise sur 5 (migration 0013) : 5 ronds visibles, contrôle proposé dans « À réviser », contrôle raté qui rouvre la compétence.
4. Passage manuel complet sur téléphone (iPhone compris) : bouton « ± », saisie d'une fraction en texte, cartes mentales de l'étape 6.
5. Recette de Marius : exemples inhabituels des cartes de puissances (√16 900 = 130, 10¹⁴), convention « 0 est positif et négatif ».
6. Migrations 0014 à 0016 appliquées, contenu publié : un défi (`/defi/<compétence>`), retourner, « je savais » ou non, la carte revient le lendemain dans « À réviser » ; un super exercice (`/super/<id>`) rendu, score et corrigés, passage enregistré ; en relire quelques-uns avec figure sur téléphone (G011, G021, C034).
7. Correction algébrique en ligne (`corriger` version 12) : « 5 + 3x » accepté pour 3x + 5 quand la forme est réduite, « (x+3)(x-3) » pour une factorisation, « x >= -4 », « ±7 ».
8. Écrans d'engagement : série qui pardonne, bilan « niveau 2 → 4 », fin de journée.
9. Règle du super exercice : une compétence aux exercices réussis reste à 3, le super exercice réussi la passe à 4 (bilan de /super), le bouton du panneau de /parcours change de libellé ; un super exercice sans faute après les contrôles donne 5.
10. Rythme et rappels (après la migration 0017 et le Cron) : choisir 3 jours dans /profil, voir « N séances sur 3 » dans /travail ; compte de moins de 15 ans : « Demander à mon parent », email reçu, /rappels/:jeton accepte puis « Ne plus recevoir » ; compte de 15 ans et plus : activation directe, rappel reçu un jour choisi sans séance.
11. Étape 7 sur un vrai compte : saisir « 5 + 3x », « (x+3)(x-3) », « P = 6x », « S = {-4 ; 2} » dans les exercices F, au téléphone compris.
12. Progression côté serveur (après la migration 0021) : un exercice réussi fait monter le niveau, rechargement de la page compris ; un super exercice rendu affiche son score et passe la porteuse à 4 ; le test de positionnement d'un nouveau compte se clôt sans bandeau d'erreur ; une carte mentale revue avance son échéance ; `npm run check:db` vert.

**Réponses du 20 octobre 2026 (soir)** :
- **Étape 7 : Gauthier délègue** (« suivre tes propres recommandations, prendre les initiatives, consigner tous les choix »). Choix du chef de projet, le 20 octobre 2026 :
  1. B054 (programme de calcul en une expression) et B055 (distributivité numérique) en **B** ; F commence avec la lettre.
  2. **Numérotation du v1 gardée** (F002 à F031 quand la notion correspond, nouveaux F061 à F068) ; pas de renumérotation.
  3. **Complément « pensée algébrique du cycle 3 » lancé** (cartographe, `_travail/cycle3_algebre_*`) : 4 à 6 nœuds (motifs, programmes de calcul, égalités à trous, distributivité mentale), prérequis de B054, B055, F003, F023 ; B056+ pour les calculs, F069+ pour la lettre et les motifs.
  4. Découpage du cartographe validé (deux nœuds par notion sur deux classes, double distributivité en 3e, x² = a en F068, cartes MM-B-08 et MM-F-01 à MM-F-06).
  5. **Tout est rédigé maintenant, saisie des expressions comprise** (la correction S1 à S5 est en ligne depuis `corriger` v11) ; au moins un tiers de QCM ou de nombres par compétence à saisie d'expression ; F062 et F065 en évaluation partielle. Consigne : `_travail/brief_etape7.md`, 6 lots.
  6. Liens B049 ← B055 et B051 ← B054 adoptés, arête B049 ← B011 retirée.
  7. Validateur : x² après une lettre → A029 ; ⩽ ⩾ ≤ ≥ → F031 (un seul corrigé touché, SX-A038-01, écrit en mots). La règle « lettre désignant un nombre » n'est pas ajoutée (facultative, risque de faux positifs).
- **Super exercices (décision de Gauthier)** : un super exercice réussi **fait passer la compétence au niveau 4**, et le niveau 4 débloque les compétences suivantes. Le **niveau 5** est le plus dur : il demande plusieurs réussites d'exercices **et** de super exercices sans faute ; il ne bloque rien. Mise en œuvre retenue (§6, sprint 2) : voir « Règle du super exercice ».
- **Engagement** : rythme choisi par l'élève et rappel par email au parent **à coder maintenant** ; puis continuer les sprints dans l'ordre du §6.

**Questions encore ouvertes :**
- les hypothèses du business plan, une fois proposées ;
- le programme du CP emploie `<` et `>` alors que le DAG les introduit au CE1 (A006) : à trancher avec la reprise du domaine A.

---

## 9. Dette et risques à garder en tête

- ~~**Progression falsifiable**~~ : réglé au sprint 6 (migration 0021, à appliquer). Reste falsifiable : la relecture espacée des cartes mentales, sans enjeu.
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
