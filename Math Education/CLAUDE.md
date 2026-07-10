# CLAUDE.md — MATH EDUCATION

> Fichier de contexte unique du projet MATH EDUCATION. Chargé automatiquement au début de chaque session Claude Code travaillant dans ce dossier (et à terme dans le repo GitHub `math-education`). C'est la source de vérité du projet : le tenir à jour rend chaque session immédiatement productive.
>
> Ce fichier ne concerne QUE MATH EDUCATION. Les projets TRADING et CHARTER sont étanches, aucune information de ces projets n'a sa place ici.
>
> Conventions de rédaction et de réponse : français systématique, ton direct et efficace, pas de tirets longs (virgules ou points).

---

## 1. Le projet en bref

MATH EDUCATION est une application web d'apprentissage adaptatif des mathématiques pour les élèves du **CP à la Terminale spécialité**. Sa différenciation repose sur un DAG (graphe orienté acyclique) de **414 compétences réparties en 15 domaines** : le système localise précisément le point de blocage d'un élève (même 2 classes en arrière), puis lui fait travailler uniquement ce qu'il doit.

- **Équipe :** Gauthier (lead développement & produit) et Marius (lead contenu mathématique), co-fondateurs 50/50.
- **Objectif :** MVP en ligne avant **septembre 2026** (rentrée scolaire), puis 1 mois de test utilisateur et recrutement des premiers élèves.
- **Contraintes :** budget max **500€**, disponibilité max **4h/semaine par personne**.
- **Référence maîtresse :** `Management de Projet/MATH_EDUCATION_Roadmap.docx` (v2.0, 7 juillet 2026). En cas de divergence, la Roadmap fait foi. Ce CLAUDE.md en est la synthèse opérationnelle.

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

---

## 3. Le DAG et les 4 briques de données

Le DAG v1.0 (`Spécifications DAG, Exos, Mindcards/skills_dag.json`) contient 414 compétences. Chaque compétence a : `id` (ex. `A001`), `domain`, `label`, `description`, `prerequisites`, `difficulty`, `school_level`, `validation_test`.

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

**Les 4 briques de données du backend :**

| Brique | Contenu | Responsable / statut |
|--------|---------|----------------------|
| `skills_dag.json` | Graphe des 414 compétences. À enrichir : ajouter `exercise_ids`, `mindmap_id`, `mastery_threshold` (ex. 3 réussis sur 4) à chaque compétence. | **Marius** — v1 livrée, à enrichir |
| `exercises.json` | Banque d'exercices par compétence, 3 niveaux de difficulté min., avec corrigés. | **Marius** — à créer |
| `mindmaps.json` | Cartes mentales par compétence / chapitre (structure texte, rendu par l'app). | **Marius** — à créer |
| Progression élève | État d'avancement de chaque élève sur le DAG (maîtrisée / en cours / bloquée). | **Gauthier** — base de données (§6) |

Le contenu reste en **JSON versionné dans Git** (relecture par PR, diff, rollback). L'état des élèves vit en **base de données** (Supabase). Ne pas conserver le format « un fichier JSON par élève » au-delà des tout premiers tests locaux : il ne tient pas avec authentification, accès concurrent et déploiement.

---

## 4. Équipe, rôles et contrat d'interface

| Rôle | Périmètre | Outils Claude principaux |
|------|-----------|--------------------------|
| **Gauthier** — lead dev & produit | Architecture, frontend, base de données, auth, déploiement, moteur de recommandation, sécurité, paiement (itération 2), pilotage. | Claude Code (VS Code), `/plan`, `/security-review`, Claude Design, MCP GitHub & Supabase, Claude in Chrome. |
| **Marius** — lead contenu math | Enrichissement du DAG, exercices + corrigés, cartes mentales, cohérence avec les programmes officiels, recette du contenu. | Claude.ai (Projet dédié), Claude Code (Desktop pour démarrer), agents `exercise-generator` et `math-reviewer`. |

**Contrat d'interface (clé du parallélisme) :** dès la S1, Gauthier et Marius figent les **3 schémas JSON** (`skills_dag` enrichi, `exercises.json`, `mindmaps.json`). Une fois figés, Marius produit le contenu et Gauthier développe l'app sur **données factices** respectant les mêmes schémas. Le merge de la S6 devient une simple substitution de fichiers. Générer des JSON Schemas de validation + un script `npm run validate` que Marius lance sur chaque livraison.

---

## 5. Architecture technique cible (MVP)

MATH EDUCATION est une **application** (comptes, base de données, logique métier), pas un site vitrine. Workflow de référence : Claude Design → `/plan` → Claude Code → Supabase → `/security-review` → déploiement.

| Couche | Choix | Pourquoi |
|--------|-------|----------|
| Frontend | React (Vite) + Tailwind | Rapide à générer, écosystème riche pour visualiser le DAG. |
| Visualisation DAG | react-flow, rendu **par domaine** (pas les 414 nœuds d'un coup) | Lisible, interactif, nœuds colorés selon la maîtrise. |
| Base + Auth | Supabase (tier gratuit) : Postgres + auth email + RLS | Comptes élèves/profs, progression, réservations. RLS = données isolées par élève. |
| Contenu pédagogique | JSON versionnés dans Git, chargés en base par script de seed | Relecture par PR, diff, rollback. |
| Rendu math | KaTeX (LaTeX dans exercices et cartes) | Léger, standard. |
| Cartes mentales | Markmap ou Mermaid mindmap (texte → rendu HTML) | Marius écrit du texte structuré, rendu automatique homogène. |
| Hébergement | GitHub → Netlify (ou Vercel), domaine OVH (~12€/an) | Gratuit, déploiement auto à chaque push. |
| Rappels type Duolingo | n8n auto-hébergé + emails (**itération 2**) | Workflows autonomes 24/24. |

**État actuel du code :** l'application vit dans `Math_Edu_Application/` (Vite + React + TypeScript + Tailwind + react-router, client Supabase déjà câblé). Lancer avec `npm install` puis `npm run dev` (port 5173) ; `npm run build` pour le build de prod. Voir `Math_Edu_Application/README.md`.

**État actuel du design :** direction artistique retenue = **Studio Clair** (edtech premium et épuré : fond blanc cassé, accent indigo/violet #6366F1, titres serif Fraunces + UI Inter). Maquette MVP en cours dans Claude Design, 7 écrans : connexion/rôle, onboarding + test de positionnement, profil, espace de travail, lecteur d'exercice, carte mentale, calendrier de cours. Prompt maître et brief : `Spécifications site web et BD/PROMPT_Claude_Design.md` et `Brief_Design_MVP.md`. Workflow : Claude Design → export → ré-import dans `Math_Edu_Application` (données factices) → session `/plan` pour brancher auth Google + tables + RLS.

**App mobile (vision produit) :** le site web doit être accompagné d'une application mobile où l'élève révise ses cours, fait ses exos quotidiens, consulte son profil et réserve des cours. Recommandation pour un dev solo à 4h/semaine : viser d'abord une **PWA installable** (même base de code React), et n'envisager React Native / Expo qu'après le MVP web. Conséquence design : composants mobile-first et pouce-compatibles dès la maquette.

---

## 5bis. Variables d'environnement et déploiement

**Piège n°1 du déploiement.** Les clés API et l'URL Supabase vivent dans un fichier `.env.local` **en local** (gitignoré, jamais sur Git) ET doivent être recopiées dans les **Variables d'environnement de Netlify / Vercel** au moment du déploiement. C'est la source n°1 de bugs : tout marche en local, plus rien en ligne, simplement parce que les variables n'ont pas été configurées sur le service de déploiement. Checklist déploiement : reporter chaque variable `VITE_*` dans l'interface du service avant le premier build en ligne.

**Variables du projet :**

| Variable | Description | Secret ? |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | URL du projet Supabase | Non (publique) |
| `VITE_SUPABASE_ANON_KEY` | Clé anon publique, protégée par les politiques RLS | Non (publique) |
| `service_role` (clé) | Accès admin total, **jamais** exposée | **Oui — jamais côté client** |

Seules les variables préfixées `VITE_` sont exposées au frontend par Vite. La clé `service_role` ne doit jamais figurer dans le code client ni dans un `VITE_*` : elle reste côté serveur uniquement (scripts de seed, fonctions edge). Modèle de fichier : `.env.example` (versionné, valeurs vides) ; copie locale : `.env.local` (gitignoré).

**⚠ Piège classique : les RLS Supabase.** Supabase active par défaut la Row Level Security (RLS) sur toutes les tables. Tant qu'aucune politique explicite n'est définie, l'accès est **bloqué** : l'app affiche « pas de données » alors que la base est bien remplie. La parade : demander à Claude Code de « configurer les politiques RLS appropriées pour mon application », copier les règles générées dans Supabase, et l'app fonctionne. Politiques cibles (cf. §6) : un élève ne lit/écrit que ses propres lignes ; un professeur lit la progression de ses élèves inscrits ; le contenu est en lecture seule pour tous les authentifiés.

---

## 6. Modèle de données

Contenu en JSON versionné, état élève en base :

| Table | Colonnes clés |
|-------|---------------|
| `profiles` | `id` (auth), `role` (eleve/prof/admin), `prenom`, `niveau_scolaire`, `email_parent`, `consentement_parental_at` |
| `skill_progress` | `user_id`, `skill_id`, `status` (locked/available/in_progress/mastered), `score`, `attempts`, `next_review_at`, `updated_at` |
| `exercise_attempts` | `user_id`, `exercise_id`, `skill_id`, `answer`, `is_correct`, `duration_s`, `created_at` |
| `content_skills` / `content_exercises` / `content_mindmaps` | Miroir en base des JSON `/content`, rechargé par script de seed à chaque release |
| `availability_slots`, `bookings` (**itération 2**) | `prof_id`, `start_at`, `end_at`, `capacity` (=3), `status` ; booking : `slot_id`, `eleve_id`, `paid_at` |

**Piège RLS à demander explicitement à Claude Code :** un élève ne lit/écrit que ses propres lignes ; un professeur lit la progression des élèves inscrits à ses cours ; le contenu est en lecture seule pour tous les authentifiés. Clés Supabase dans `.env`, `.gitignore` dès le premier commit, variables aussi configurées côté Netlify.

Générer le SQL de création + politiques RLS + script de seed en une session `/plan` dédiée, puis committer dans `/app/supabase/migrations`.

---

## 7. Roadmap MVP (juillet → septembre 2026, 9 semaines)

Deux pistes en parallèle (contenu = Marius, application = Gauthier), deux synchronisations majeures : schémas en S1, merge en S6.

| Semaine | Jalon | Gauthier | Marius |
|---------|-------|----------|--------|
| S1 (7-13/07) | Semaine 0 + schémas JSON figés | Outillage, schémas, maquettes Claude Design | Outillage, agents, revue DAG v1 |
| S2-S3 | J1 contenu pilote / J2 squelette app | Frontend + auth + tables Supabase (données factices) | DAG v2 enrichi + exos & cartes sur 2 domaines pilotes |
| S4 | J3 premier déploiement | Pipeline GitHub → Netlify, domaine, app en ligne (dummy) | Production de contenu en série |
| S5-S6 | J4 merge site + DAG | Moteur de progression & recommandation, import vrai contenu | Fin domaines prioritaires + recette croisée |
| S7-S8 | J5 phase de test | `/security-review`, corrections, analytics | Recette pédagogique, ajustement difficulté |
| S9 (fin août-sept.) | J6 premiers élèves (gratuit) | Onboarding, suivi bugs | Suivi qualité, feedback élèves |

**Semaine 0 (outillage, une demi-journée chacun) :** abonnement Claude Pro min. chacun ; repo GitHub privé `math-education` (`/app`, `/content`, `/docs`, `/scripts`) ; ce CLAUDE.md à la racine du repo ; Projet Claude partagé « MATH EDUCATION » (DAG, schémas, programmes Eduscol). Gauthier : VS Code + Claude Code, comptes Netlify + Supabase (`math-education-dev`, région eu-west), MCP GitHub & Supabase. Marius : Claude Desktop + accès repo, programmes Eduscol CP → Terminale, agents `exercise-generator` et `math-reviewer`.

**Jalon 1 — Contenu (Marius, S1-S6).** Enrichir le DAG (champs `exercise_ids`, `mindmap_id`, `mastery_threshold`) ; script Python (networkx) qui vérifie acyclicité, nœuds orphelins, prérequis inexistants, incohérences de niveau, à chaque modif ; croiser chaque domaine avec les programmes Eduscol. Générer la banque d'exercices (cible : **5 exercices × 3 niveaux** par compétence sur les domaines prioritaires) via l'agent `exercise-generator`, relue par `math-reviewer` + Marius. Cartes mentales en Markdown hiérarchique → `mindmaps.json`. **Domaines pilotes : A (Numération) et C (Fractions)** pour roder le format avant d'industrialiser.

**Jalon 2 — App données factices (Gauthier, S1-S4).** Maquettes Claude Design (landing, inscription, dashboard élève avec DAG coloré, écran exercice, carte mentale, profil). Session `/plan` pour l'architecture avant le code. `dummy_content/` conforme aux schémas. Composants clés : `DagView` (react-flow, vert maîtrisé / orange en cours / gris verrouillé), `ExercisePlayer` (KaTeX + feedback), `MindmapView` (Markmap), `Dashboard`. Supabase : auth avec rôles, tables, RLS.

**Jalon 3 — Déploiement (Gauthier, S4).** Git → GitHub → Netlify → domaine. Déploiement auto sur `main`, previews Netlify sur chaque PR. Checklist : test mobile réel (majorité du trafic sera mobile), images WebP, Lighthouse > 85.

**Jalon 4 — Moteur adaptatif (Gauthier + Marius, S5-S6).** Script de seed (JSON validés → tables `content_*`). Positionnement initial : test adaptatif ~10 questions descendant le DAG par dichotomie. **Règle de déblocage :** une compétence est proposable si tous ses prérequis sont maîtrisés ; maîtrisée si `mastery_threshold` atteint ; en cas d'échec répété, l'app redescend sur les prérequis (c'est LA disruption, à soigner). **Révision espacée (Leitner au MVP) :** `next_review_at` à J+1, J+3, J+7, J+21 ; au MVP, un encart « à réviser aujourd'hui » sur le dashboard (emails en itération 2). Cette brique mérite sa propre session `/plan` + tests unitaires. Recette croisée par Marius via 3 personas (CE2 tables, 4e fractions, Terminale bac).

**Jalon 5 — Phase de test (S7-S8).** `/security-review` complet avant le moindre élève réel (injection, clés, RLS, permissions). Tests end-to-end Playwright sur les parcours critiques. Bêta fermée famille & amis : **5 à 10 élèves** de niveaux variés, 1 semaine, formulaire de feedback. Observer un élève en direct au moins deux fois. Analytics minimales (Plausible ou PostHog).

**Jalon 6 — Premiers élèves, phase gratuite (S9 → rentrée).** Ouverture première semaine de septembre. Cible : **20-30 élèves gratuits** pendant 4-6 semaines contre feedback. Canaux : entourage, groupes Facebook/WhatsApp de parents, professeurs du réseau, post LinkedIn. Landing page dédiée. Critères de passage au payant : ≥ 40% d'inscrits actifs en semaine 3, ≥ 5 compétences validées par élève actif, retours qualitatifs positifs.

---

## 8. Itération 2 (octobre → décembre 2026)

À ne **PAS** démarrer avant la fin du Jalon 6. Ordre de valeur (chaque bloc livrable indépendamment) :

1. **Retravail DAG & contenu** à partir des données de la bêta (taux d'échec anormaux, granularité). — Marius
2. **Paiement** abonnement 9,99€/mois via Stripe (Checkout + webhooks). Review humaine par un dev expérimenté avant prod, non négociable. — Gauthier
3. **Rappels type Duolingo** : emails de révision + résumé hebdo aux parents, via n8n auto-hébergé. — Gauthier
4. **Espace professeur v1** : agenda de dispos, réservation 20€/1h30 (max 3 élèves), vue DAG des élèves + suggestions. Visio via lien externe (Meet/Zoom), ne pas développer sa propre visio. — Gauthier + Marius
5. **Gamification** : streaks, badges par domaine, objectifs hebdo. — Gauthier
6. **Cartes mentales premium** imprimables / partageables (MCP Canva ou Claude Design). — Marius

---

## 9. Agents Claude Code à créer

- **`exercise-generator`** (déclencheur `/exos [id_compétence]`) : à partir d'une compétence du DAG, génère N exercices au format `exercises.schema.json`, énoncé (LaTeX autorisé), 3 niveaux (découverte / entraînement / maîtrise), réponse attendue, corrigé détaillé, 2 distracteurs pour les QCM. Ton adapté au niveau scolaire.
- **`math-reviewer`** : relit chaque lot, vérifie l'exactitude mathématique, la conformité au niveau et au schéma, signale tout exercice douteux.

**Règle d'or :** aucun exercice ne part en production sans **double validation (agent `math-reviewer` + relecture humaine de Marius)**. Les LLM font des erreurs de calcul, la relecture humaine n'est pas optionnelle. Travailler par lots (`/exos A001..A010`), une PR par domaine, Gauthier fait tourner le script de validation de schéma sur chaque PR.

---

## 10. Boîte à outils Claude : quel outil pour quelle tâche

| Tâche | Outil | Mode d'emploi |
|-------|-------|---------------|
| Analyse pédagogique, comparaison programmes, gabarits | Claude.ai + Projet partagé | Verser DAG, schémas, programmes Eduscol dans le Projet. |
| Génération d'exercices en série | Claude Code + agent `exercise-generator` | `/exos [ids]` par lots de 10, PR par domaine. |
| Contrôle qualité math | Agent `math-reviewer` + relecture humaine | Passe sur chaque lot, taux d'erreur suivi dans `/content/QUALITY.md`. |
| Maquettes UI, landing page | Claude Design | Brief précis (cible, ton, références), itérer avant de coder. |
| Architecture, base, moteur adaptatif | Claude Code `/plan` | Une session `/plan` par brique majeure, valider avant de coder. |
| Développement quotidien | Claude Code (VS Code) | Une fonctionnalité = une session = un commit. |
| Audit sécurité | `/security-review` | Avant chaque mise en ligne, avant la bêta, après toute feature touchant les données. |
| GitHub / Supabase | MCP GitHub & Supabase | Issues, PR, inspection de tables en conversation. |
| Tests exploratoires en ligne | Claude in Chrome | Dérouler les parcours élève/prof. |
| Automatisations (itération 2) | n8n + skill n8n-as-code | Décrire le workflow, importer le JSON généré. |

---

## 11. Conventions et Definition of Done

- **Langue :** français partout (code, contenu, commits, doc).
- **IDs de compétences :** format lettre de domaine + numéro sur 3 chiffres (`A001`, `F042`…).
- **3 schémas JSON figés** en S1, validés par `npm run validate` sur chaque livraison de contenu.
- **Une fonctionnalité = une session Claude Code = un commit.** Messages de commit clairs (Gauthier est seul à coder, tout doit être reprenable).
- **Une PR par domaine** de contenu ; Gauthier valide le schéma, Marius valide le fond.
- **Definition of Done d'une compétence :** nœud DAG à jour + ≥ 5 exercices validés + carte mentale liée + testée dans l'app.
- Si le taux d'erreur d'un lot d'exercices dépasse ~5%, revoir le prompt de génération avant de continuer.

---

## 12. Risques et points de vigilance

| Risque | Parade |
|--------|--------|
| **Erreurs mathématiques** dans le contenu généré (détruisent la confiance des parents) | Double validation systématique (`math-reviewer` + humain), 100% sur les domaines pilotes, suivi du taux d'erreur, réponses numériques vérifiées par script quand possible. |
| **RGPD & mineurs** (quasi tous les utilisateurs) | Consentement parental requis (<15 ans en France), champ email parent, minimisation des données, hébergement UE (Supabase eu-west), page de confidentialité, à valider avant le passage payant. |
| **Paiement & données sensibles** | Review par un développeur expérimenté avant activation Stripe (itération 2), non négociable. Budgéter quelques centaines d'euros. |
| **Effet tunnel** (414 compétences × exos × cartes = jamais fini) | MVP sur domaines prioritaires seulement (A, C en pilote, puis B, E, F) ; les autres affichent « bientôt disponible ». Mieux vaut 5 domaines excellents que 15 médiocres. |
| **Dérive du périmètre MVP** | Rien de l'itération 2 ne démarre avant la fin du Jalon 6. Ce fichier fait foi. |
| **Dépendance à un seul dev** (Gauthier) | Tout passe par GitHub, commits clairs, ce CLAUDE.md à jour pour reprise immédiate. |

---

## 13. Rituels et organisation

- **Point hebdo (30 min)** : démo de ce qui marche, blocages, engagement de la semaine suivante. Compte-rendu de 5 lignes dans `/docs/weekly/`.
- **Une PR = une revue croisée** (au minimum : Gauthier valide le schéma, Marius valide le fond).
- **`/update` en fin de session** Claude Code pour tenir le contexte et l'historique du projet à jour.
- **Structure repo cible :** `/app` (code), `/content` (DAG, exercices, cartes + `QUALITY.md`), `/docs` (`/weekly`), `/scripts` (validation, seed), `/app/supabase/migrations`.
- **Prochain pas concret :** Gauthier lance la session `/plan` des schémas JSON et les partage à Marius ; Marius crée l'agent `exercise-generator` et produit le premier lot A001-A010. Rendez-vous au point hebdo.

---

## 14. Ressources

**Fichiers locaux (dossier `Math Education/`) :**
- `Spécifications DAG, Exos, Mindcards/skills_dag.json` — DAG v1.0 (414 compétences, 15 domaines).
- `Programme mathématiques/` — programmes officiels Eduscol (Maternelle → Lycée voie GT), référence pour valider la couverture du DAG.
- `Spécifications site web et BD/WebsiteDesign_For_Claude.pptx` — brief design du site.
- `Management de Projet/MATH_EDUCATION_Roadmap.docx` — roadmap complète v2.0 (source maîtresse).

**Drive MATH EDUCATION :**
- Dossier principal : https://drive.google.com/drive/folders/1DxYYFS_vUnBxq6DvOQacioksAp2Gnh7g
- DAG/ (ID 1l6Rtk6ceXVk_nIjUH85khic1fX8qixm5)
  - `skills_dag.json` v1 : https://drive.google.com/file/d/178wH1na-FKRE6BFFzio95Vaz77wW6Dbc
  - Graphe Mermaid du DAG : https://docs.google.com/document/d/1gOsOq8hoGoM1wOrPoeZie2w-55UK3xvsj094N6T6NoU
  - Visualisation DAG (PNG) : https://drive.google.com/file/d/1Bnx9n89LTsVi_FXqp7bvmqZPlnIzD14M
- Claude Cowork Use/ (ID 1DFcKBIs1FXRbZDZriKEIKZmZ3f6UUhwj) — ressources de référence Claude Code.
