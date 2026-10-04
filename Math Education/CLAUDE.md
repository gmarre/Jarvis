# CLAUDE.md — MATH EDUCATION

> Fichier de contexte du projet MATH EDUCATION, chargé automatiquement au début de chaque session Claude Code travaillant dans ce dossier. Il porte le **savoir durable** : vision, DAG, modèle économique, architecture, contrats, procédures manuelles, pièges connus et décisions déjà tranchées.
>
> **L'avancement sprint par sprint vit dans `Math_Edu_Application/ROADMAP.md`**, pour qu'un seul fichier ait à être mis à jour à chaque livraison. En cas de divergence sur « où on en est », c'est `ROADMAP.md` qui fait foi.
>
> Ce fichier ne concerne QUE MATH EDUCATION. Les projets TRADING et CHARTER sont étanches, aucune information de ces projets n'a sa place ici.
>
> Conventions de rédaction et de réponse : français systématique, ton direct et efficace, pas de tirets longs (virgules ou points).

---

## 1. Le projet en bref

MATH EDUCATION est une application web d'apprentissage adaptatif des mathématiques pour les élèves du **CP à la Terminale spécialité**. Nom de produit : **Racine**. Sa différenciation repose sur un DAG (graphe orienté acyclique) de **414 compétences réparties en 15 domaines** : le système localise précisément le point de blocage d'un élève (même 2 classes en arrière), puis lui fait travailler uniquement ce qu'il doit.

- **Équipe :** Gauthier (lead développement & produit) et Marius (lead contenu mathématique), co-fondateurs 50/50.
- **Contraintes :** budget max **500€**, disponibilité max **4h/semaine par personne**. Ces deux chiffres commandent toutes les décisions techniques du projet. Quand une option est « plus propre mais plus longue », c'est presque toujours la plus courte qui gagne.
- **Objectif révisé :** bêta fermée de 5 à 10 élèves **fin novembre 2026**, ouverture aux premiers élèves en **janvier 2027** (retour des vacances de Noël, second créneau naturel de l'année scolaire). La cible d'origine, un MVP avant la rentrée de septembre 2026, n'a pas été tenue.
- **Le planning du `.docx` est dépassé.** `Management de Projet/MATH_EDUCATION_Roadmap.docx` (v2.0, 7 juillet 2026) découpait le travail en jalons 1 à 6 sur 9 semaines de juillet à septembre 2026. Sa vision produit reste valable, son planning non.

---

## 2. Le produit

**Vision :** on trouve exactement où ça bloque, et on débloque. À l'inscription, un test de positionnement estime la frontière de maîtrise de l'élève sur le DAG. L'app propose ensuite un parcours ciblé : exercices adaptés (3 niveaux de difficulté), cartes mentales pour ancrer le cours, et révision espacée façon Duolingo.

**Différenciateur :**
- Diagnostic précis : remontée à la lacune racine dans le DAG, même si elle remonte 2 classes en arrière.
- Travail ciblé uniquement sur les lacunes (pas de redite inutile).
- Révision espacée pour mémorisation à long terme.
- Personnalisation totale par élève (DAG individuel).

**Modèle économique :**
- **Abonnement élève : 9,99€/mois** (parcours adaptatif + rappels réguliers), accès plateforme sans cours.
- **Cours particuliers : 20€ / 1h30**, réservables via un calendrier de disponibilités professeurs, max **3 élèves par cours**. Pendant le cours, le professeur voit le DAG de chaque élève et reçoit des suggestions d'exercices et de cartes mentales.
- Abonnement professeur : à définir (ne pas cumuler avec la commission cours).

**Où en est la monétisation :** nulle part, et c'est voulu. La plateforme est gratuite pendant la bêta. L'écran `/abonnement` informe du tarif à venir sans rien encaisser. Stripe est en itération 2. **Ne pas activer de paiement avant que la progression soit écrite côté serveur.** Depuis le 4 octobre 2026, la correction est côté serveur et l'élève ne lit plus les réponses ; mais c'est encore le navigateur qui écrit la progression (`skill_progress`), donc un élève déterminé peut la falsifier. Acceptable pendant une bêta gratuite, pas pour un service payant (§13).

---

## 3. Le DAG et les 4 briques de données

Le DAG v1.0 (`Spécifications DAG, Exos, Mindcards/skills_dag.json`) contient 414 compétences. Chaque compétence a : `id` (ex. `A001`), `domain`, `label`, `description`, `prerequisites`, `difficulty`, `school_level`, `validation_test`, et depuis la v2 `exercise_ids`, `mindmap_id`, `mastery_threshold`.

**Les 15 domaines :**

| ID | Domaine | Nb | ID | Domaine | Nb |
|----|---------|----|----|---------|----|
| A | Numération | 25 | I | Trigonométrie | 20 |
| B | Calcul numérique | 35 | J | Fonctions | 35 |
| C | Fractions | 25 | K | Statistiques | 15 |
| D | Décimaux | 15 | L | Probabilités | 25 |
| E | Proportionnalité | 25 | M | Suites | 15 |
| F | Algèbre | 60 | N | Analyse | 35 |
| G | Géométrie plane | 44 | O | Espace et vecteurs | 20 |
| H | Géométrie analytique | 20 | | | |

**Les 4 briques, état au 30 septembre 2026 :**

| Brique | Contenu | État |
|--------|---------|------|
| `skills_dag.json` | Graphe enrichi (`exercise_ids`, `mindmap_id`, `mastery_threshold`) | **75 compétences** au 4 octobre 2026 : A Numération 17, B Calcul 21 (CP à 6e), C Fractions 18, D Décimaux 19 (CE1 à 6e). Intégrité vérifiée : aucun cycle, aucun prérequis fantôme, niveaux et citations contrôlés. |
| `exercises.json` | Banque d'exercices, 3 niveaux, avec corrigés | **396 exercices**, tous en `relu_agent` (voir `QUALITY.md`). Chaque compétence en a au moins 3. |
| `mindmaps.json` | Cartes mentales en Markdown hiérarchique | **14 cartes**, chaque compétence est couverte. |

**L'extension du contenu suit `Spécifications DAG, Exos, Mindcards/PLAN_CONTENU.md`** : un domaine à la fois, d'après le programme officiel, DAG, exercices et cartes ensemble, produits et relus par agents. Étapes 1 (calcul) et 2 (décimaux) faites, étape 3 (proportionnalité) ensuite.
| Progression élève | État d'avancement sur le DAG | **En base Supabase**, tables et politiques RLS actives. |

**Plus aucune compétence sans exercice.** Les 12 compétences A et C de l'ancienne liste avaient été remplies par Marius (7 ou 8 exercices chacune). Les trois dernières, B001, B005 et B006, l'ont été le 3 octobre 2026 : B005 était la lacune racine d'un élève CM1 typique, dont le plan du jour restait vide. Le code continue de contourner une compétence vide, ce qui redeviendra utile quand le DAG grandira : `placement.trous.test.ts` le vérifie sur un contenu troué exprès.

**Relecture humaine : suspendue par décision de Gauthier (3 octobre 2026).** Le contenu relu par agent est considéré comme acceptable. Le tri humain se fera lors d'un **test complet de l'application**, où chaque exercice et chaque carte sera accepté ou invalidé. Prévu pour outiller ce test : un « mode recette » dans l'app, qui enregistre les verdicts en base, et un script qui les reporte dans le contenu.

**Défaut systémique côté application :** dans les 44 QCM existants, la bonne réponse est toujours la proposition « a », et `AnswerInput` affiche les choix dans l'ordre du fichier. Un élève peut répondre juste sans lire. Correctif : mélanger les propositions à l'affichage.

Le contenu reste en **JSON versionné dans Git** (relecture par PR, diff, rollback) : **Git est la source, la base ne fait que le servir**. Décision du 3 octobre 2026 : Postgres (Supabase, déjà en place) pour la diffusion, ni base de graphe, ni base documents, ni CMS. Raisons : le DAG ne dépassera pas ~1 000 nœuds, `jsonb` absorbe la partie document, et tout le circuit de production par agents repose sur des fichiers.

**Le contenu est découpé en petits fichiers** (`content/dag/<domaine>.json`, `content/exercices/<domaine>/<compétence>.json`, `content/cartes/<carte>.json`), parce qu'à terme 5 000 à 10 000 exercices ne tiennent pas dans un seul fichier, ni dans un diff, ni dans le contexte d'un agent. **Tous les scripts passent par `scripts/contenu.py`**, qui charge et écrit ce découpage et recalcule les compteurs. L'application reçoit encore trois fichiers assemblés : `python scripts/contenu.py export-app` après chaque livraison, puis `npm test`.

---

## 4. Équipe, rôles et contrat d'interface

| Rôle | Périmètre | Outils Claude principaux |
|------|-----------|--------------------------|
| **Gauthier** — lead dev & produit | Architecture, frontend, base de données, auth, déploiement, moteur de recommandation, sécurité, paiement (itération 2), pilotage. | Claude Code (VS Code), `/plan`, `/security-review`, Claude Design, MCP GitHub & Supabase, Claude in Chrome. |
| **Marius** — lead contenu math | Enrichissement du DAG, exercices + corrigés, cartes mentales, cohérence avec les programmes officiels, recette du contenu. | Claude.ai (Projet dédié), Claude Code (Desktop), agents `exercise-generator` et `math-reviewer`. |

**Contrat d'interface (clé du parallélisme) :** les **3 schémas JSON** sont figés (`Spécifications DAG, Exos, Mindcards/schemas/`). Marius produit le contenu, Gauthier développe contre ces schémas. Validation par `scripts/validate_content.py` sur chaque livraison.

---

## 5. Architecture technique

MATH EDUCATION est une **application** (comptes, base de données, logique métier), pas un site vitrine.

### 5.1 La stack et son état

| Couche | Choix | État |
|--------|-------|------|
| Frontend | React 18 + Vite 5 + TypeScript + Tailwind 3 | En place |
| Routage | react-router 6, 13 routes avec gardes de rôle | En place |
| Visualisation DAG | react-flow, rendu **par domaine** (jamais les 414 nœuds d'un coup) | En place |
| Rendu math | KaTeX | En place |
| Cartes mentales | Markmap (Markdown hiérarchique vers rendu) | En place |
| Base + Auth | Supabase : Postgres, **auth Google + email**, RLS | **Branché et validé**, recette navigateur le 3 octobre 2026 (§8.1) |
| Tests | Vitest (moteur, repository), Docker + Postgres jetable (migrations et RLS) | En place |
| Contenu pédagogique | JSON versionnés dans Git (la source), publiés en base par `scripts/publier.py`, lus par l'application depuis la base | **En place** depuis le 4 octobre 2026 : `src/content/chargement.ts`, cache local par publication ; les JSON locaux ne servent plus qu'au mode démonstration et aux tests |
| Logique serveur | Supabase Edge Functions (Deno) : correction des réponses, emails, cron | **`corriger` en place** (4 octobre 2026, `supabase/functions/`) ; emails au sprint 2b |
| Emails transactionnels | **Resend**, gratuit jusqu'à 3 000 emails/mois | **Sprint 2b** |
| État serveur | **TanStack Query** | **Sprint 3**, pas avant |
| Hébergement | GitHub → Netlify, domaine OVH (~12€/an) | **Sprint 4** |
| Supervision | **Sentry** (erreurs) et **PostHog** (analytics + session replay), tiers gratuits | **Sprint 4** |
| Tests end-to-end | **Playwright** | **Sprint 6** |
| Paiement | **Stripe** Checkout + webhooks (1,5 % + 0,25€) | **Itération 2** |

Toutes ces briques restent en TypeScript, y compris les Edge Functions (Deno). **Le manque n'a jamais été la stack, c'était l'absence totale de backend.**

### 5.2 Les trois principes d'architecture

1. **Le moteur vit dans `src/lib/`, il est pur et testé.** Aucun composant React, aucune dépendance au navigateur. C'est ce qui permettra de déplacer la correction côté serveur au sprint 3 sans réécrire une ligne du moteur.
2. **Aucun composant ne contient de donnée en dur.** Tout passe par `src/data/` (accès aux données) ou `src/content/` (contenu pédagogique). Le contenu est installé par le repository avant toute session : **aucun module ne lit `skills`, `exercises` ou `domains` au niveau du fichier**, seulement dans une fonction, sinon il les verrait vides. La carte « Élèves à suivre » de l'espace professeur, qui affichait des élèves factices, a été retirée le 3 octobre 2026. Elle reviendra avec l'espace professeur v1, sur de vraies données.
3. **`src/data/repository.ts` est la seule couture avec la base.** Il expose une mutation par intention, jamais une sauvegarde en bloc.

### 5.3 Le contrat du repository

L'ancienne interface exposait `save(session)` : le provider réécrivait la session entière à chaque changement d'état. Acceptable contre `localStorage`, **intenable contre Postgres**, où une seule réponse d'exercice aurait réécrit les 38 lignes de progression et tout l'historique des tentatives.

L'interface actuelle :

```
Authentification
  getSession()                      -> Session | null
  onAuthChange(cb)                  -> unsubscribe
  signInWithGoogle()
  signInWithPassword(email, mdp)
  signUp(input)
  signOut()
  completeProfile(patch)            -> Profile   (retour OAuth, écran /bienvenue)

Mutations, une par intention
  updateProfile(patch)              -> Profile
  saveAttempt(attempt, progress)    -> 1 upsert progression + 1 insert tentative
  saveProgress(progress)            -> révision espacée
  savePlacement(result, progress[])  -> insert résultat + upsert en lot
  createBooking(slotId, skillId)    -> Booking
  deleteBooking(bookingId)
  createSlots(slots)                -> AvailabilitySlot[]

Lecture
  getCatalog()                      -> Catalog
```

Deux implémentations respectent ce contrat : `supabaseRepository` (la vraie) et `mockRepository` (démonstration hors ligne et tests). Le choix se fait dans `data/index.ts` : Supabase dès que les clés sont là, le mock sinon. `VITE_USE_MOCK=true` force le mock malgré des clés valides.

`mockRepository.test.ts` sert de **spécification exécutable** du contrat : c'est la référence quand un comportement diverge entre le mode démonstration et la production.

**Gestion des erreurs.** L'état local avance avant la confirmation du serveur, c'est ce qui rend l'interface vive. Le revers est qu'une écriture qui échoue laisserait l'élève croire que son travail est enregistré. Chaque mutation lève, le provider attrape, et `SyncErrorBanner` le dit à l'élève. On ne restaure pas l'état précédent : lui retirer son avancement sous les yeux serait pire que de l'avertir.

### 5.4 Design

Direction artistique **Studio Clair** (fond blanc cassé, accent indigo #6366F1, titres serif Fraunces, UI Inter), implémentée depuis les maquettes Claude Design. Le design system vit dans `src/components/ui/` (Button, Card, Badge, Field, Notice, EmptyState, Progress, Avatar, Toggle, Segmented). Les couleurs sont des jetons de `tailwind.config.js` : **ne jamais écrire une couleur en dur.**

Contraintes non négociables du brief : **cibles tactiles jamais sous 44px** (le public commence à 6 ans), mobile-first, anneau de focus visible au clavier. Un seul `AppShell` sert desktop et mobile, la navigation ne doit pas diverger entre les deux surfaces.

### 5.5 App mobile

Viser d'abord une **PWA installable** (même base de code React). iOS 16.4 et au-delà supporte les notifications push pour une PWA installée, donc les rappels façon Duolingo sont faisables sans passer par les stores. React Native ou Expo seulement si la présence sur l'App Store devient un argument commercial.

**Sur le SEO :** le jour où la landing doit ranker, **ne pas migrer l'application**. Ajouter une landing statique séparée (Astro, ou du HTML) sur la racine du domaine, et garder la SPA sur `/app`.

---

## 6. Variables d'environnement et clés

Dans `.env.local`, ignoré par Git. Modèle : `.env.example`.

| Variable | Rôle | Envoyée au navigateur |
|----------|------|------------------------|
| `VITE_SUPABASE_URL` | URL du projet | oui, publique |
| `VITE_SUPABASE_ANON_KEY` | Clé publishable (ex « anon »), protégée par les RLS | oui, publique |
| `VITE_USE_MOCK` | `true` force les données factices malgré des clés valides | oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète. Scripts locaux uniquement (`check:db`, seed du sprint 3) | **non, jamais** |

**Le préfixe `VITE_` n'est pas cosmétique :** tout ce qui le porte est embarqué dans le JavaScript envoyé au navigateur. La clé `service_role` contourne **toutes** les politiques RLS : dans le bundle, elle donnerait à n'importe quel visiteur un accès total en lecture et en écriture.

Où les trouver : **Project Settings → API**. La publishable key va dans `VITE_SUPABASE_ANON_KEY`, la `service_role` (appelée « secret key » dans la nouvelle interface, préfixe `sb_secret_`) dans `SUPABASE_SERVICE_ROLE_KEY`.

Sans clés, l'application bascule automatiquement en **mode démonstration** plutôt que de planter. C'est voulu : un oubli de variables au déploiement se voit immédiatement au lieu d'afficher une page blanche.

**Piège n°1 du déploiement :** recopier chaque variable `VITE_*` dans les Variables d'environnement de Netlify **avant** le premier build en ligne. C'est la source n°1 de bugs, tout marche en local et rien en ligne.

---

## 7. Modèle de données

Le schéma complet et commenté vit dans **`Math_Edu_Application/supabase/migrations/`**. Chaque fichier explique ce qu'il fait, pourquoi, et quel bug il corrige.

### 7.1 Les tables

| Table | Rôle |
|-------|------|
| `profiles` | 1-1 avec `auth.users`. Rôle (eleve/prof/parent), prénom, niveau, email parent, consentement, préférences de confidentialité, abonnement (jsonb). Créée par un trigger à l'inscription. |
| `skill_progress` | Progression sur le DAG, clé `(user_id, skill_id)`. `recent boolean[]` porte la fenêtre glissante des dernières tentatives. |
| `exercise_attempts` | Historique des tentatives. **En écriture seule** : une tentative est un fait, elle ne se réécrit ni ne s'efface. |
| `placement_results` | Résultat du test de positionnement, **historisé** (un passage = une ligne). Comparer deux positionnements à six mois d'écart est exactement ce qu'un parent voudra voir. |
| `teachers` | Profil public d'un professeur. Créée automatiquement quand un profil devient `prof`. |
| `availability_slots` | Créneaux ouverts. **Pas de colonne `places_prises`** : c'est un compte dérivé, le stocker garantirait une dérive. |
| `bookings` | Réservations, `unique (slot_id, eleve_id)`. La capacité est garantie par un trigger avec verrou de ligne. |
| `parent_links` | Rattachement parent/enfant et jeton de consentement. **`token_hash` seulement**, jamais le jeton en clair : un accès en lecture suffirait sinon à confirmer le consentement à la place du parent. |
| `slots_disponibles` (vue) | Créneaux avec `places_prises` calculé. **C'est cette vue que lit l'app**, pas la table. |
| `content_skills` / `content_exercises` / `content_mindmaps` | Le contenu publié depuis Git (migration 0005, 4 octobre 2026). Lecture pour tout compte connecté, aucune écriture client. Les propositions de QCM y sont **sans misconception**. |
| `content_exercise_keys` | Réponse, corrigé et misconceptions, séparés des énoncés. **Illisible pour les élèves** depuis la migration 0006 : seule l'Edge Function `corriger` la lit (clé `service_role`), et ne rend la clé d'un exercice qu'avec la correction d'une réponse. |
| `content_publications` | Une ligne par publication : date, commit Git source, comptes. |
| `content_reviewers` | Comptes autorisés à rendre des verdicts de recette. S'écrit à la main dans le SQL Editor (§10.6) ; un compte ne lit que sa propre ligne. |
| `content_reviews` | Verdicts de recette (migration 0008) : un par relecteur et par exercice ou carte, `accepte` ou `invalide` (commentaire obligatoire), `traite_le` posé par `scripts/recette.py`. Chaque relecteur ne lit et n'écrit que les siens. Pas de clé étrangère vers le contenu, que chaque publication remplace. |
| `publier_contenu(contenu, commit)` | Seule écriture du contenu : réservée à `service_role`, remplace tout en une transaction. Appelée par `scripts/publier.py`, qui valide d'abord et refuse les modifications non commitées. |

### 7.2 Les fonctions d'autorisation

Toutes en `security definer` avec `set search_path = public`, pour éviter la récursion RLS (voir §11).

**Droits d'exécution (migration 0007).** Aucune fonction `security definer` n'est appelable par `anon`. `authenticated` n'exécute que les trois dont il a besoin : `peut_lire_eleve` et `role_actuel` (appelées par les politiques RLS sous le rôle du lecteur) et `nb_places_prises` (vue `slots_disponibles`, en `security_invoker`). Les fonctions de trigger et `est_prof_de` / `est_parent_de` ne sont appelables par personne : un trigger se déclenche sans ce droit, et `peut_lire_eleve` les appelle avec les droits de son propriétaire. **Une nouvelle fonction n'est plus appelable par `anon` par défaut** ; si `authenticated` doit l'appeler (politique RLS, vue en `security_invoker`), il garde le droit par défaut de Supabase, sinon le retirer dans sa migration comme pour `publier_contenu`. Vérifié par `supabase/tests/04_droits_fonctions.sql`.

| Fonction | Rôle |
|----------|------|
| `est_prof_de(eleve)` | Vrai si l'élève est inscrit à un créneau de ce professeur **et** a autorisé le partage. Les deux conditions. |
| `est_parent_de(eleve)` | Vrai si le rattachement parent/enfant est **confirmé**. |
| `role_actuel()` | Rôle du compte courant, sans lire `profiles` depuis une politique. |
| `peut_lire_eleve(eleve)` | Soi-même, son professeur sous conditions, son parent rattaché. |
| `nb_places_prises(slot)` | Compte réel des réservations, indépendamment du RLS du lecteur. |
| `refuse_surbooking()` | Trigger, refuse une place au-delà de la capacité, avec verrou de ligne. |
| `proteger_colonnes_profil()` | Trigger, interdit au client de modifier les colonnes sensibles. |
| `creer_profil_pour_nouvel_utilisateur()` | Trigger sur `auth.users`, crée la ligne `profiles`. |
| `creer_ligne_teacher_si_prof()` | Trigger, crée la ligne `teachers` au passage à `prof`. |

### 7.3 Les colonnes que le client ne peut pas modifier

Le RLS autorise un utilisateur à mettre à jour **sa** ligne de `profiles`, donc toutes ses colonnes. Un trigger en protège cinq, et ne s'applique qu'aux requêtes portant un JWT utilisateur (`auth.role() = 'authenticated'`), les appels `service_role` passant outre :

| Colonne | Pourquoi |
|---------|----------|
| `role` | Un élève se déclarerait `prof`, puis ouvrirait des créneaux payants. Escalade de privilège. |
| `consentement_parental_at` | **Un mineur se confirmerait à lui-même l'accord de son parent.** C'est la protection légale des moins de 15 ans qui tomberait. |
| `email`, `cree_le` | L'identité vient de `auth.users`, pas du client. |
| `abonnement` | Sera posé par le webhook Stripe, côté serveur. |

### 7.4 Règle sur les migrations

**Ne jamais modifier une migration déjà appliquée.** On en crée une nouvelle, numérotée. Sinon la base et le dépôt divergent et plus personne ne sait ce qui tourne. Chaque fichier doit être **rejouable** (`if not exists`, `create or replace`, `drop policy if exists` avant chaque `create policy`), parce qu'il s'applique par copier-coller dans le SQL Editor, sans outil qui garde la trace de ce qui a déjà tourné.

---

## 8. Où on en est

Le travail se fait par **sprints courts et livrables seuls**. Le détail de chacun, ses prérequis et son état exact sont dans **`Math_Edu_Application/ROADMAP.md`**, qui fait foi.

| Sprint | Objet | État |
|--------|-------|------|
| **1** | Audit et déblocage : test de positionnement en cul-de-sac, gardes de rôle, boutons morts, mise en place de Vitest | **Livré** |
| **2a** | Auth Google et email, schéma Postgres, RLS, réécriture du repository en mutations | **Livré** |
| **2b** | Node 24, domaine, Resend, consentement parental enfin obtenable | À faire |
| **3** | Contenu en base, correction des réponses côté serveur, TanStack Query | En cours : contenu en base et lu depuis la base (phases 1 et 2, 4 octobre 2026) ; reste la correction côté serveur |
| **4** | Dépôt dédié, Netlify, domaine, PWA, landing et politique de confidentialité | À faire |
| **5** | Espace parent (consentement, export et suppression RGPD, suivi) | À faire |
| **6** | Playwright, `/security-review`, avant le premier élève réel | À faire |

### 8.1 Recette manuelle du 3 octobre 2026

Les six vérifications manuelles de `ROADMAP.md` §1 ont été déroulées dans le navigateur, et **toutes passent** : inscription Google, persistance après vidage du stockage local, cloisonnement entre élèves, écritures granulaires (un upsert et un insert par réponse), refus du mauvais mot de passe, capacité refusée par la base sur une 4e réservation concurrente.

Elles ont fait sortir ce que les tests automatiques ne voyaient pas :

| # | Constat | Gravité | État |
|---|---------|---------|------|
| 1 | Le fournisseur Google n'était **pas activé** sur le projet Supabase. `check:db` crée ses comptes par email et ne pouvait pas le voir. | Bloquant | Réglé (configuration) |
| 2 | **L'inscription par email casse dès que « Confirm email » est activé** : `signUp` ne renvoie pas de session, l'écriture du profil part sans JWT, le RLS filtre tout, `.single()` lève « Cannot coerce the result to a single JSON object ». Compte créé à moitié, message incompréhensible. | **Bloquant avant la bêta** | Corrigé : l'inscription email ne demande plus que l'identité, puis passe par `/bienvenue` comme Google. `signUp` rend `null` quand le compte attend sa confirmation. |
| 3 | La lacune racine d'un élève CM1 typique est **B005, qui n'a aucun exercice** : son plan du jour est vide dès la première session. | **Bloquant produit** | Corrigé : 19 exercices pour B001, B005 et B006, relus par agent, en attente de Marius |
| 4 | Le dimanche était invisible côté élève (`DAYS_SHOWN = 6`), alors que le prof peut y publier un créneau. | Bloquant | Corrigé |
| 5 | Un jour sans aucun créneau affiche « complet » dans l'en-tête de la grille élève. | Texte mensonger | Corrigé (`lib/schedule.ts`, « aucun créneau ») |
| 6 | Un refus de capacité affiche « Vérifie ta connexion », alors que c'est une règle métier. Le message est aussi sans accent (« creneau »). | Texte mensonger | Corrigé : `RepositoryError.refus` distingue refus de règle et panne, le bandeau adapte son conseil, le catalogue est relu |
| 7 | La colonne `nom` reçoit le prénom quand le nom est inconnu (`nom \|\| prenom`). | Mineur | Corrigé (le nom reste vide). La ligne déjà en base n'est pas corrigée. |
| 8 | La liste des jours côté prof part du lundi de la semaine en cours : publication possible sur un jour passé. | Confirmé | Corrigé : jours à partir d'aujourd'hui, heures passées désactivées |
| 9 | Une réponse sur une compétence déjà maîtrisée renvoie un upsert de la ligne inchangée. | Mineur | Plus tard |
| 10 | **Sur `/bienvenue`, choisir « Professeur » ou « Parent » échoue** : le trigger `proteger_colonnes_profil` refuse tout changement de `role` depuis le client. Un compte Google ne peut donc être qu'élève. Trouvé en relisant le code, pas en recette. | Bloquant pour les profs | À trancher : fonction serveur qui fixe le rôle une seule fois, tant que le profil est incomplet |

**Ajouts de la même session, à la demande de Gauthier :** un professeur choisit ses débuts de cours **au quart d'heure, de 8h à 20h** (la maquette imposait 14h à 18h à l'heure pile). Deux cours d'un même professeur ne peuvent plus se chevaucher (règle dans `lib/schedule.ts`, contrôlée par l'interface seulement, pas par la base). La grille élève affiche tous les créneaux d'une même heure, et non plus le premier. La carte « Élèves à suivre » (élèves factices) est retirée.

**Reste non testé en conditions réelles :** le passage d'une compétence de « en cours » à « maîtrisée ». Couvert par Playwright au sprint 6.

**« Confirm email » est désactivé en développement** sur le projet Supabase. Le constat n°2 est corrigé dans le code, mais le chemin avec confirmation n'a pas encore été déroulé dans un navigateur : le faire avant la bêta.

### 8.2 Prochaines étapes

Dans l'ordre :

1. **Correctifs de recette : codés le 3 octobre 2026** (constats 2, 5, 6, 7, 8, 188 tests au vert). Reste : un passage navigateur sur l'inscription email, la réactivation de « Confirm email » pour tester le chemin avec confirmation, puis `ROADMAP.md` mis à jour. Constat n°10 à trancher.
2. **Contenu : fait le 3 octobre 2026** pour B001, B005 et B006 (19 exercices), puis l'étape 1 du plan de contenu (domaine B complet). Reste le mélange des propositions de QCM côté application (défaut systémique, §3).
3. **Node 24** (procédure §10.3), à faire VS Code fermé.
4. **Domaine** (OVH), choix et achat par Gauthier, en parallèle.
5. **Sprint 2b** : migration 0005 (jeton de consentement haché, expiration 7 jours), Edge Function `send-parent-consent` avec Resend en mode test, page `/consentement/:token`, boutons « Renvoyer » avec limitation de débit.
6. **Nettoyage** des comptes de test (prof, `+eleve1` à `+eleve3`, comptes des testeurs) et du créneau du 4 octobre, après re-test du constat n°2.

**Proposition de recentrage, à valider :** environ 32h de dev d'ici fin novembre ne couvrent pas les sprints 2b à 6. Avant la bêta gratuite, ne garder que 2b (obligation légale), 4 (mise en ligne) et un 6 réduit (`/security-review` et un parcours Playwright). Le reste du sprint 3 (progression écrite par le navigateur, acceptable tant que c'est gratuit) et le sprint 5 (export et suppression RGPD traitables à la main pendant la bêta) passent entre la bêta et janvier.

---

## 9. Itération 2, après la bêta

À ne **PAS** démarrer avant que de vrais élèves utilisent l'application. Ordre de valeur, chaque bloc livrable indépendamment :

1. **Retravail DAG & contenu** à partir des données de la bêta (taux d'échec anormaux, granularité). — Marius
2. **Paiement** abonnement 9,99€/mois via Stripe (Checkout + webhooks). Review humaine par un dev expérimenté avant prod, non négociable. **Prérequis : correction des réponses côté serveur.** — Gauthier
3. **Rappels type Duolingo** : emails de révision, résumé hebdo aux parents. — Gauthier
4. **Espace professeur v1** : fiche élève avec son DAG et suggestions de séance, gestion réelle des créneaux (modifier, supprimer, récurrence, fuseau), compte-rendu de séance envoyé au parent, revenus via Stripe Connect, vérification des professeurs, lien visio par séance. **Ne pas développer sa propre visio**, un champ URL Meet ou Zoom suffit. — Gauthier + Marius
5. **Gamification** : streaks, badges par domaine, objectifs hebdo. — Gauthier
6. **Cartes mentales premium** imprimables et partageables. — Marius

Les composants de la fiche élève existent déjà et sont réutilisables : `DagGraph`, `DagPath`, `SkillDetailPanel`. Il manque la route et la lecture de la progression d'un autre utilisateur, que les politiques RLS autorisent déjà sous condition de partage.

---

## 10. Procédures manuelles

Ce qui ne s'automatise pas depuis le code, et qu'il faut refaire à l'identique le jour où on recommence.

### 10.1 Créer ou reconfigurer le projet Supabase (30 min)

1. **supabase.com** → New project. Région **Europe** (eu-west-1 Irlande ou eu-west-3 Paris) : l'hébergement UE est une promesse affichée sur l'écran de connexion, pas un détail.
2. **Noter le mot de passe de la base dans un gestionnaire de mots de passe.** Il n'est plus affiché ensuite, et il servira au script de seed.
3. Project Settings → API → copier `Project URL` et la publishable key dans `.env.local`.
4. Authentication → Providers → activer **Email**. Décocher « Confirm email » en développement, le rallumer avant la bêta, **et seulement après la correction du constat n°2 du §8.1**.
5. Authentication → URL Configuration → noter la **Callback URL** (`https://<ref>.supabase.co/auth/v1/callback`).
6. SQL Editor → New query → coller **chaque migration dans l'ordre** → Run.
7. Vérifier : `npm run check:supabase` puis `npm run check:db`.

### 10.2 Créer les identifiants Google OAuth (30 min)

1. **console.cloud.google.com** → nouveau projet, nom `Racine`.
2. APIs & Services → **OAuth consent screen** → type **External**, laissé en mode **Testing**. En Testing on a droit à 100 utilisateurs de test sans validation Google, largement assez pour la bêta. **Passer en Production exigera une politique de confidentialité en ligne**, prévue au sprint 4.
3. Nom de l'app (`Racine`), email de support, et s'ajouter comme **Test user** avec les testeurs. : master-dev-web@racine-510506.iam.gserviceaccount.com
4. Scopes : **uniquement** `email`, `profile`, `openid`. Rien de plus, ce sont des mineurs.
5. Credentials → OAuth client ID → **Web application**. Authorized redirect URI = la Callback URL de l'étape 10.1.5.
6. Coller `Client ID` et `Client Secret` dans Supabase → Authentication → Providers → **Google**.

**Garder email et mot de passe comme chemin de plein droit :** les comptes Google supervisés par Family Link, donc ceux des moins de 13 ans, peuvent être empêchés de se connecter à un service tiers. Google ne doit jamais être le seul accès.

### 10.3 Monter la version de Node

`supabase-js` initialise son client realtime dès `createClient()` et exige un **WebSocket natif**, absent avant Node 22. L'application n'est pas touchée (le navigateur en a un), mais **tout script Node l'est**.

Cible : **Node 24 LTS**, pas 22. Node 22 finit en avril 2027, Node 24 tient jusqu'en 2028, et `supabase-js` demande 22 minimum : 24 satisfait la contrainte avec un horizon plus long.

1. Fermer VS Code et tous les terminaux, sinon l'installateur bute sur des fichiers verrouillés.
2. `winget install --id OpenJS.NodeJS.LTS --source winget`. L'installateur MSI remplace la version en place. Le `--source winget` évite l'invite d'acceptation du Microsoft Store.
3. Vérifier `node -v` et `npm -v`.
4. `Remove-Item -Recurse -Force node_modules` puis `npm install`. Le `package-lock.json` est en `lockfileVersion: 3`, npm 11 ne le réécrira pas.
5. Mettre `.nvmrc` à la version installée, et `engines` à `>=22` (le plancher réel imposé par `supabase-js`, pas la version exacte).
6. Relancer les quatre vérifications, et aligner `NODE_VERSION` sur Netlify au sprint 4.

**Si Node 18 doit être conservé** pour un autre projet : `winget install CoreyButler.NVMforWindows`. À savoir, contrairement à `nvm` sous Linux et macOS, **`nvm-windows` ne lit pas `.nvmrc`**, il faut taper `nvm use 24`.

### 10.4 Déployer une Edge Function

Le code vit dans `supabase/functions/` : `corriger/index.ts` (point d'entrée) et `_shared/correction.ts`, **le même fichier que l'application importe** (`src/lib/exercise.ts` le réexpose). Une règle de correction modifiée doit donc être redéployée, sinon le serveur et le mode démonstration divergent.

- Par Claude : outil MCP `deploy_edge_function`, nom `corriger`, point d'entrée `corriger/index.ts`, fichiers `corriger/index.ts` et `_shared/correction.ts`, `verify_jwt` à true.
- À la main : `npx supabase login`, puis `npx supabase functions deploy corriger --project-ref crazwnfjyzaxirbmwnkn` depuis `Math_Edu_Application/`.

Contrôle sans compte : un appel avec la clé anonyme doit répondre 401 « Connexion requise ». `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` sont fournies par Supabase à l'exécution, rien à configurer.

**Ordre à respecter** quand une migration retire un droit dont l'ancienne version de l'application avait besoin (cas de la 0006) : fonction déployée d'abord, application ensuite, migration en dernier.

### 10.5 Les quatre niveaux de vérification

Du plus isolé au plus réel. Comprendre ce que chacun prouve évite de croire qu'on a testé ce qu'on n'a pas testé.

| Commande | Ce qu'elle prouve | Ce qu'elle ne prouve pas |
|----------|-------------------|--------------------------|
| `npm test` | Le moteur et le repository sont corrects | Rien sur Supabase, elle n'y touche pas |
| `npm run test:sql` | Le SQL et les politiques sont corrects (Docker). **Sous Windows, lancer `bash supabase/tests/run.sh` depuis Git Bash** : `npm` y appelle le bash de WSL, qui ne voit pas Docker Desktop. | Pas qu'ils sont appliqués sur le vrai projet |
| `npm run check:supabase` | Le projet réel répond, les tables sont là, l'anonyme est bloqué | Rien sur les triggers |
| `npm run check:db` | Triggers, RLS, escalade de privilège, capacité, sur le vrai projet | **Rien sur l'interface** |

Aucun des quatre ne teste le navigateur. Avant tout commit : `npm test && npm run lint && npm run build`.

### 10.6 Mener une recette du contenu

La recette consiste à parcourir le contenu dans l'application, comme un élève, et à accepter ou invalider chaque exercice et chaque carte. **C'est Marius qui la mène** (lead contenu) ; Gauthier n'y valide rien. Les nouveaux contenus s'y ajoutent au fil des étapes : chaque publication les fait apparaître dans `/recette`, en « à juger ».

1. **Un compte élève dédié** (par exemple `prenom+recette@...`), profil complété : ses réponses font bouger sa progression, autant ne pas abîmer un vrai compte.
2. **L'inscrire comme relecteur**, dans le SQL Editor :
   ```sql
   insert into content_reviewers (user_id)
   select id from auth.users where email = 'adresse+recette@exemple.fr'
   on conflict (user_id) do nothing;
   ```
   Rejouable : relancée sur un compte déjà inscrit, elle ne fait rien.
   Le retirer : `delete from content_reviewers where user_id = (select id from auth.users where email = '...');`
3. **Dans l'application**, une entrée « Recette » apparaît dans la navigation : la page `/recette` liste, compétence par compétence, ce qui reste à juger. Chaque écran d'exercice et de carte porte un panneau « Accepter / Invalider… ». Un refus exige un commentaire : c'est la consigne que liront les agents. Un verdict peut être changé tant qu'on veut.
4. **Reporter les verdicts dans le contenu** : `python scripts/recette.py` (simulation), puis `--apply`. Accepté devient `valide`, invalidé redevient `brouillon` et part dans `Spécifications DAG, Exos, Mindcards/RECETTE.md` avec le commentaire. Puis commit, et `python scripts/publier.py --apply`.
5. **Faire reprendre** la liste de `RECETTE.md` par les agents (circuit de `PLAN_CONTENU.md`) ; l'élément corrigé repasse en `relu_agent` et sera rejugé.

---

## 11. Pièges connus et leçons apprises

**Docker Desktop qui ne répond plus (`Internal Server Error` sur `docker info`).** Constaté le 4 octobre 2026 : le service Windows de Docker tourne, mais ne joint plus le moteur dans sa machine virtuelle WSL (journal `%LOCALAPPDATA%\Docker\log\host\com.docker.backend.exe.log` : `connect tcp 192.168.65.7:2375: no route to host`). Typique après une mise en veille. Attendre ne sert à rien. Remède, sans perte d'images ni de conteneurs : quitter Docker Desktop (ou arrêter les processus `com.docker.*`), `wsl --shutdown`, relancer Docker Desktop ; le moteur répond en une quinzaine de secondes.

**Tester le SQL en propriétaire de table ne teste rien.** Deux bugs de production sont venus de là, et tous deux de la même famille : une règle qui doit valoir pour tout le monde s'exécutait dans le contexte de sécurité du lecteur. Un trigger non `security definer` faisait `select ... for update` sur une table dont la politique UPDATE excluait l'élève, donc il ne voyait pas le créneau et **aucune réservation n'était possible**. Une vue `security_invoker` comptait des réservations filtrées par le RLS du lecteur, donc **un créneau complet s'affichait comme disponible**. Le harnais local n'avait rien vu parce qu'il tournait en propriétaire de table, ce qui contourne entièrement le RLS. **Toute assertion SQL doit tourner sous `set role authenticated` avec un JWT.**

**Une règle qui doit être vraie pour tous est `security definer`.** C'est le corollaire du point précédent.

**Les politiques RLS qui se lisent entre elles partent en récursion infinie**, avec une erreur illisible. C'est la première cause de perte de temps sur Supabase. Toutes les jointures d'autorisation sont donc isolées dans les fonctions du §7.2.

**Un fichier SQL interrompu peut passer pour vert.** `ON_ERROR_STOP` arrête le fichier en cours de route, et un harnais naïf déclare le test réussi alors que des assertions n'ont jamais tourné. Chaque fichier de test finit par une sentinelle `TEST FIN` dont l'absence fait échouer le harnais.

**La racine `/rest/v1/` renvoie 401 avec une clé publishable**, car l'OpenAPI n'est servi qu'à la `service_role`. Ce 401 ne signale **aucune panne**. Le workflow de maintien en éveil interrogeait cette route et aurait envoyé une fausse alerte chaque semaine.

**Le tier gratuit Supabase met un projet en pause après une semaine d'inactivité**, puis finit par le supprimer. Un projet a été perdu comme ça en septembre 2026 : son nom de domaine ne résolvait plus en DNS. `.github/workflows/supabase-keepalive.yml` fait une requête hebdomadaire et alerte par email. À savoir : GitHub désactive les workflows planifiés après 60 jours sans commit sur le dépôt.

**`crypto.randomUUID()` n'existe qu'en contexte sécurisé.** Servir l'application sur une IP de réseau local en http, ce qui est exactement la façon de tester sur un téléphone, le rend indéfini, et l'app planterait à la première réponse d'exercice, **uniquement sur mobile**. D'où `lib/id.ts` et son repli.

**React ne garantit pas qu'un updater de `setState` tourne avant le retour de la fonction appelante.** Sortir un résultat d'un updater par mutation d'une variable externe marche par accident, grâce à l'optimisation « eager state », et casse dès qu'une autre mise à jour est en file. Calculer **avant** `setState`.

**Des clés mortes sont pires que pas de clés.** Avec des clés invalides, l'application tente de se connecter et échoue à chaque écriture, sans repli sur les données factices. Vider les variables vaut mieux que laisser des valeurs périmées.

**Ne jamais mettre en avant un raccourci de démonstration.** L'écran de connexion plaçait « compte de démonstration » exactement là où l'utilisateur cherche Google. Les entrées de démonstration sont désormais en bas et invisibles dès que les clés sont présentes.

---

## 12. Décisions tranchées, à ne pas rejouer

| Décision | Raison |
|----------|--------|
| **On ne change pas de langage ni de framework** | React, TypeScript, Tailwind et Supabase sont le bon choix à 4h/semaine avec 500€. Migrer vers Next.js, Remix, Rails ou Django coûterait des semaines et ne résoudrait aucun des manques, qui sont tous des fonctionnalités absentes. |
| **Supabase en tier gratuit, plus un ping hebdomadaire** | Le Pro à 25 $/mois est reporté au moment où de vrais élèves seront dessus. Sur 500€ de budget total, c'est 300€/an. |
| **Sprint 2 scindé en 2a et 2b** | Auth, schéma, RLS, repository et emails dans un seul chantier ne tient pas en 4h/semaine. |
| **Pas de TanStack Query avant le sprint 3** | Apprendre Supabase Auth, les RLS et TanStack Query en même temps est le meilleur moyen de ne rien finir. Le cache devient réellement nécessaire quand le contenu vient de la base. |
| **Page `/abonnement` informative, Stripe en itération 2** | Le modèle est arrêté, mais la plateforme est gratuite pendant la bêta. On informe, on n'encaisse pas, et on le dit. |
| **Espace parent au minimum légal d'abord** | Consentement, export et suppression sont des obligations RGPD non tenues. Le reste est du confort. |
| **Écran Google en mode Testing** | 100 utilisateurs de test sans validation Google. La Production attend la politique de confidentialité du sprint 4. |
| **PWA avant React Native** | Même base de code, et le push fonctionne sur iOS 16.4+. |
| **Le SEO n'imposera pas de migrer l'app** | Landing statique séparée sur la racine, SPA sur `/app`. |
| **Node 24 plutôt que 22** | 22 finit en avril 2027, 24 tient jusqu'en 2028. Éviter de refaire l'opération dans un an. |
| **`places_prises` calculé, jamais stocké** | Un compteur incrémenté à la main dérive immanquablement. |
| **La capacité est une règle de la base, pas de l'interface** | Deux élèves réservant la dernière place au même instant passeraient tous les deux. |

---

## 13. Dette technique connue

**react-router, 2 vulnérabilités modérées.** Open redirect via un antislash dans `<Link>` et `useNavigate`, et injection de constructeur dans l'hydratation SSR. La branche 6.x **n'a aucun correctif** : seule la 7.18.4 corrige, et c'est une montée majeure. Le cas qui concernait l'application, la redirection après connexion, est couvert par `lib/redirect.ts` et ses tests. Migration à décider au sprint 4.

**Progression écrite par le navigateur.** Depuis la phase 3 (4 octobre 2026), les réponses ne sont plus ni dans le bundle (`grep -l '"solution_steps"' dist/assets/*.js` ne doit rien trouver), ni lisibles en base (migration 0006), ni dans le cache local (`racine.contenu.v2`, la v1 est effacée). La correction est faite par l'Edge Function `corriger`. **Reste :** c'est le client qui écrit `skill_progress`, `exercise_attempts` et `placement_results`, donc un élève qui manipule les requêtes peut se déclarer une compétence maîtrisée. Le corriger demande de déplacer `applyAttempt` dans la fonction et de retirer l'écriture directe de ces tables, et pour le positionnement de rejouer le test côté serveur. Indispensable avant un abonnement payant, pas avant la bêta gratuite.

**Taille du contenu : levé le 4 octobre 2026.** Le chunk principal était monté à 133 ko gzippés (75 compétences, 396 exercices). Depuis la phase 2, l'application lit le contenu dans la base (`src/content/chargement.ts`), une fois par appareil et par publication, et le chunk principal est à **24 ko gzippés**. Reste à surveiller : le cache est dans le `localStorage` (environ 5 Mo) ; au-delà de quelques milliers d'exercices, il faudra le passer sur IndexedDB. Sans cache, l'application relit simplement tout à chaque chargement. Une nouvelle publication n'est vue qu'au rechargement de la page.

**Advisor de sécurité Supabase : 4 avertissements restants, tous acceptés** (après la migration 0007, 4 octobre 2026 ; il y en avait 21).
- `content_exercise_keys` sans politique : voulu, personne d'autre que `service_role` ne doit la lire (migration 0006).
- `peut_lire_eleve`, `role_actuel`, `nb_places_prises` exécutables par `authenticated` : nécessaire, les politiques RLS et la vue `slots_disponibles` les appellent sous le rôle du lecteur. Elles ne rendent que ce que la personne connectée sait déjà.
- Protection contre les mots de passe compromis (HaveIBeenPwned) désactivée : **réservée au plan Pro** de Supabase. À activer au passage en plan payant, au plus tard avant l'ouverture publique. En attendant, garder une longueur minimale de mot de passe d'au moins 8 caractères dans les réglages Auth.

**Poids du bundle.** `supabase-js` a fait passer le premier chargement de 92 à **148 ko gzippés**, dont un client realtime inutilisé. Les chunks vendor sont séparés pour rester en cache entre deux déploiements, ce qui aide les visites suivantes mais pas la première. Le réduire demanderait d'importer `@supabase/auth-js` et `@supabase/postgrest-js` séparément, au prix d'une API moins standard. À trancher au sprint 4 avec la cible Lighthouse.

**Polices Google chargées depuis le CDN**, alors que l'écran de connexion affiche « Données hébergées dans l'Union européenne ». À auto-héberger au sprint 4, ce qui supprime aussi deux requêtes bloquantes.

**Aucune vérification des professeurs.** N'importe qui s'inscrit comme `prof` et publie des créneaux payants. Bloquant avant d'ouvrir l'offre de cours à des inconnus.

**Détails :** `streakDays` est en dur dans `WorkspacePage`, et les exercices d'une compétence sont toujours servis dans le même ordre (ni mélange ni tirage).

---

## 14. Agents Claude Code

- **`exercise-generator`** (déclencheur `/exos [id_compétence]`) : génère N exercices au format `exercises.schema.json`, énoncé (LaTeX autorisé), 3 niveaux (découverte / entraînement / maîtrise), réponse attendue, corrigé détaillé, 2 distracteurs pour les QCM. Ton adapté au niveau scolaire.
- **`math-reviewer`** : relit chaque lot, vérifie l'exactitude mathématique, la conformité au niveau et au schéma, signale tout exercice douteux.

**Règle d'or :** aucun exercice ne part en production sans **relecture `math-reviewer` indépendante de l'auteur**. La relecture humaine de Marius est remplacée, pour l'instant, par le test complet de l'application (décision du 3 octobre 2026, §3). Les LLM font des erreurs de calcul. Travailler par lots, une PR par domaine, `validate_content.py` sur chaque PR. Taux d'erreur suivi dans `QUALITY.md` (17,4 % puis 4,5 % puis 2,9 % sur trois tours). Si un lot dépasse ~5 %, revoir le prompt de génération avant de continuer.

Deux points appris de la relecture : le champ `choices[].misconception` décrit l'erreur de raisonnement que révèle chaque distracteur, **ne pas la jeter**, c'est la matière première du diagnostic fin. Et `mastery_threshold` vaut `{required: 2, out_of: 3}` dans la tranche pilote faute d'exercices, la cible étant `{3, 4}` : **toujours lire la valeur du fichier, ne jamais la coder en dur.**

---

## 15. Boîte à outils Claude

| Tâche | Outil | Mode d'emploi |
|-------|-------|---------------|
| Analyse pédagogique, comparaison programmes | Claude.ai + Projet partagé | Verser DAG, schémas, programmes Eduscol dans le Projet. |
| Génération d'exercices en série | Claude Code + `exercise-generator` | `/exos [ids]` par lots de 10, PR par domaine. |
| Contrôle qualité math | `math-reviewer` + relecture humaine | Passe sur chaque lot, taux suivi dans `QUALITY.md`. |
| Maquettes UI, landing page | Claude Design | Brief précis (cible, ton, références), itérer avant de coder. |
| Architecture, base, moteur adaptatif | Claude Code `/plan` | Une session `/plan` par brique majeure, valider avant de coder. |
| Développement quotidien | Claude Code (VS Code) | Une fonctionnalité = une session = un commit. |
| Audit sécurité | `/security-review` | Avant chaque mise en ligne, avant la bêta, après toute feature touchant les données. |
| GitHub / Supabase | MCP GitHub & Supabase | Issues, PR, inspection de tables en conversation. |
| Tests exploratoires en ligne | Claude in Chrome | Dérouler les parcours élève / prof / parent. |
| Automatisations (itération 2) | n8n | Décrire le workflow, importer le JSON généré. |

---

## 16. Conventions et Definition of Done

**Langue et nommage**
- Français partout : code, contenu, commits, documentation.
- IDs de compétences : lettre de domaine + numéro sur 3 chiffres (`A001`, `F042`).
- Les commentaires de code expliquent **pourquoi**, pas quoi. Un commentaire qui paraphrase la ligne suivante est du bruit.

**Avant chaque commit**
```bash
cd "Math Education/Math_Edu_Application"
npm test && npm run lint && npm run build
```
Le lint est réglé sur **zéro warning toléré**, c'est volontaire. Après toute modification de `supabase/migrations/`, ajouter `npm run test:sql`.

**Trois règles de conception non négociables**
- **Jamais de bouton inerte.** Un bouton non branché ne s'affiche pas : mieux vaut absent que mort.
- **Jamais de texte mensonger.** L'écran n'annonce pas ce que le code ne fait pas (« un email a été envoyé » alors que rien n'en envoie).
- **Jamais de correction silencieuse.** Une écriture qui échoue est dite à l'utilisateur : un élève qui a travaillé pour rien doit l'apprendre.

**Tests**
- Toute modification de `lib/dag.ts`, `placement.ts` ou `exercise.ts` s'accompagne d'un test. Ces trois fichiers décident de ce qu'un élève voit et de ce qui est compté juste.
- Toute assertion SQL tourne sous `set role authenticated` avec un JWT, jamais en propriétaire de table.
- Un test qui ne tombe pas sur le code buggé ne prouve rien : le vérifier en retirant temporairement le correctif.

**Definition of Done**
- D'une compétence : nœud DAG à jour + ≥ 5 exercices doublement validés + carte mentale liée + testée dans l'app.
- D'une fonctionnalité : une session = un commit, message clair, vérifications au vert, et `ROADMAP.md` à jour si le sprint avance.

---

## 17. Risques et points de vigilance

| Risque | Parade |
|--------|--------|
| **Erreurs mathématiques** dans le contenu généré (détruisent la confiance des parents) | Double validation systématique, 100 % sur les domaines pilotes, suivi du taux d'erreur, réponses numériques vérifiées par script. |
| **RGPD & mineurs** (quasi tous les utilisateurs) | Consentement parental requis avant 15 ans, hébergement UE, minimisation, export et suppression, politique de confidentialité. **Aujourd'hui le consentement est impossible à obtenir faute d'emails : blocage réglementaire n°1, sprint 2b.** |
| **Progression falsifiable par un élève** | Réponses protégées depuis le 4 octobre 2026 (correction côté serveur). La progression, elle, est encore écrite par le navigateur : à passer côté serveur **avant** tout abonnement payant. |
| **Paiement & données sensibles** | Review par un développeur expérimenté avant activation Stripe, non négociable. |
| **Effet tunnel** (414 compétences × exos × cartes = jamais fini) | Domaines prioritaires seulement (A, C en pilote, puis B, E, F) ; les autres affichent « bientôt disponible ». Mieux vaut 5 domaines excellents que 15 médiocres. |
| **Dérive du périmètre** | Rien de l'itération 2 ne démarre avant que de vrais élèves utilisent l'app. |
| **Perte du projet Supabase** (déjà arrivé) | Ping hebdomadaire par GitHub Actions, avec alerte email. |
| **Interface jamais testée** | Les quatre vérifications automatiques ne touchent pas au navigateur. Playwright au sprint 6, et les six parcours manuels avant le 2b. |
| **Dépendance à un seul dev** | Tout passe par GitHub, commits clairs, et `ROADMAP.md` tenu à jour pour reprise immédiate. |

---

## 18. Rituels et organisation

- **Point hebdo (30 min)** : démo de ce qui marche, blocages, engagement de la semaine suivante.
- **Une PR = une revue croisée** : Gauthier valide le schéma, Marius valide le fond.
- **Fin de chaque sprint : mettre à jour `Math_Edu_Application/ROADMAP.md`.** C'est ce qui permet de reprendre après une interruption, et le projet en connaîtra (4h/semaine, vacances scolaires).
- **Structure actuelle du dépôt :** l'application vit dans `Math Education/Math_Edu_Application/`, à l'intérieur du dépôt personnel `Jarvis`. **Cible au sprint 4 :** un dépôt privé dédié `math-education`, pour que Marius y ait accès et que les previews Netlify fonctionnent. Le workflow `.github/workflows/` déménagera avec.

---

## 19. Ressources

**Documents de l'application (`Math_Edu_Application/`) :**
- **`ROADMAP.md`** — où on en est, ce qui reste, les six vérifications manuelles. **Fait foi sur l'avancement.**
- `GUIDE.md` — comment travailler sur le code : commandes, structure, recettes.
- `README.md` — résumé technique court.
- `supabase/migrations/` — le schéma, chaque fichier expliquant son objet et le bug qu'il corrige.
- `supabase/tests/` — harnais SQL rejouable en une commande, plus le script d'intégration contre le vrai projet.

**Contenu et spécifications (`Math Education/`) :**
- `Spécifications DAG, Exos, Mindcards/` — DAG, schémas JSON figés, `QUALITY.md` (suivi du taux d'erreur), `RELECTURE.md`, `CORRECTIONS_DAG_v2.md` (à lire avant de toucher au DAG : les niveaux du domaine C ont été corrigés de plusieurs années d'après les programmes officiels).
- `Programme mathématiques/` — programmes officiels Eduscol, référence pour valider la couverture du DAG.
- `scripts/validate_content.py` — validation des livraisons de contenu.
- `scripts/contenu.py` — lecture et écriture du contenu découpé, export vers l'application.
- `Spécifications DAG, Exos, Mindcards/PLAN_CONTENU.md` — plan d'extension par domaine et circuit des agents.

**Documents historiques, à ne pas prendre pour l'état actuel :**
- `Management de Projet/MATH_EDUCATION_Roadmap.docx` — roadmap v2.0 de juillet 2026. Vision produit valable, planning dépassé.
- `Spécifications site web et BD/Brief_Design_MVP.md` et `PROMPT_Claude_Design.md` — briefs de design d'origine.

**Drive MATH EDUCATION :**
- Dossier principal : https://drive.google.com/drive/folders/1DxYYFS_vUnBxq6DvOQacioksAp2Gnh7g
- DAG/ (ID 1l6Rtk6ceXVk_nIjUH85khic1fX8qixm5)
  - `skills_dag.json` v1 : https://drive.google.com/file/d/178wH1na-FKRE6BFFzio95Vaz77wW6Dbc
  - Graphe Mermaid du DAG : https://docs.google.com/document/d/1gOsOq8hoGoM1wOrPoeZie2w-55UK3xvsj094N6T6NoU
  - Visualisation DAG (PNG) : https://drive.google.com/file/d/1Bnx9n89LTsVi_FXqp7bvmqZPlnIzD14M
