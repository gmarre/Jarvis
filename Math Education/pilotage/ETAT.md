# État détaillé du projet

> Mis à jour le 23 octobre 2026. Photo de ce qui existe, pas d'historique (l'historique est dans `archive/`). Mettre à jour en fin de sprint (skill `cloture-sprint`).

## 1. Contenu

**273 compétences, 1 654 exercices, 65 cartes mentales, 1 475 cartes défi, 270 super exercices**, tous en `relu_agent` (relus par agents), en attente de la recette de Marius. **En ligne** (publication du 21 octobre 2026) : 273 compétences, 1 426 exercices, 224 super exercices ; l'étape 8 n'est pas encore publiée (sprint A1).

| Domaine | Compétences | Classes couvertes |
|---|---|---|
| A Numération | 40 | CP à 3e (relatifs, repère, arithmétique, puissances, racine carrée, notation scientifique) |
| B Calcul | 40 | CP à 3e (opérations sur les relatifs, priorités, puissances, programme de calcul, distributivité) |
| C Fractions | 27 | CE1 à 4e (cycle 4 complet) |
| D Décimaux | 20 | CE1 à 5e (division par un décimal) |
| E Proportionnalité, pourcentages | 17 | CM1 à 5e (cycle 4 : étape 9) |
| F Algèbre | 26 | CM1 à 3e (pensée algébrique du cycle 3, calcul littéral, équations, inéquations) |
| G Espace et géométrie | 65 | CP à 3e (étape 8 : Pythagore, Thalès, trigonométrie, transformations, vecteurs, solides) |
| P Grandeurs et mesures | 38 | CP à 3e (étape 8 : aires, volumes, grandeurs quotients) |

**Étapes faites** (bilans dans `Spécifications DAG, Exos, Mindcards/qualite/`) : tranche pilote A et C (complétée à 6 exercices par compétence) ; 1 calcul ; 2 décimaux ; 3 proportionnalité ; 4a grandeurs et mesures ; figures ; 4b géométrie ; 5 relatifs et arithmétique ; 6 fractions du cycle 4, puissances, racine carrée, notation scientifique ; 7 et 7 bis calcul littéral et pensée algébrique du cycle 3 ; 8 géométrie et grandeurs du cycle 4 (fusionnée, à publier). **Restent** : étapes 9, 10, 11 et les restes de contenu (`FEUILLE_DE_ROUTE.md`, bloc A).

Évaluation partielle : C035 ; G050, G051, G052, G071, G076 ; F062, F065.

## 2. Application

React 18, Vite, TypeScript, Tailwind ; Supabase (Postgres, Auth Google et email, RLS, Edge Functions) ; Vitest, tests SQL sous PGlite, Playwright (8 parcours en mode démonstration). **Tourne en local seulement : rien n'est déployé.**

**Écrans :**
- publics : `/connexion`, `/accord/:jeton` (consentement et modifications du parent), `/rappels/:jeton`, `/rapport/:jeton` ;
- élève : `/bienvenue`, `/test` (positionnement), `/travail` (plan du jour), `/parcours` (chemins et graphe), `/exercice/:skillId`, `/defi/:skillId`, `/super/:superId`, `/cartes`, `/cartes/:mindmapId`, `/cours`, `/mes-profs`, `/profs/:profId`, `/suivi/:suiviId` ;
- professeur : `/prof/cours`, `/prof/agenda`, `/prof/eleves`, `/prof/eleves/:eleveId` ;
- parent : `/parent`, `/parent/revision/:skillId` ;
- communs : `/profil`, `/abonnement` (informatif), `/recette` (Marius).

**Ce qui marche :**
- authentification Google et email (email confirmé, mot de passe saisi deux fois), rôle choisi une seule fois, profil modifiable (accord du parent pour un mineur) ;
- consentement parental avant 15 ans (fonction `accord-parental`, Resend sans domaine : n'écrit qu'à l'adresse du compte) ;
- contenu lu depuis la base, cache local par publication ; **correction côté serveur** (`corriger`) : les réponses ne sont ni dans le bundle ni lisibles par l'élève ;
- **progression écrite par le serveur** (0021) : maîtrise sur 5, contrôles espacés, super exercice qui fait passer au niveau 4 ; seule la relecture espacée des cartes mentales reste écrite par le navigateur (sans enjeu) ;
- test de positionnement avec correction à la fin ; série de jours réelle ; rythme choisi ; chemins proposés ; cartes défi et super exercices ;
- professeur : offres, créneaux, agenda, profil public, graphe des élèves qui partagent, suggestions, lien Jitsi par séance, vérification par l'administrateur ;
- parent : suivi par enfant, résumé du dimanche, corrigés pour réviser, export et suppression des données ;
- suivi professeur, élève et parent : demandes de suivi, messagerie à trois avec signalement, créneaux réservés aux élèves suivis ;
- figures SVG ; mode recette pour Marius.

**Limites connues :**
- **3 failles du sprint 6** à trancher (`DECISIONS.md`) ;
- refus du consentement par le parent : le compte reste utilisable « en attente » ;
- chemins très longs pour un élève très en retard (jusqu'à 90 compétences) ;
- pas de photo de profil professeur, pas de page « Séance » en temps réel ;
- deux réponses simultanées sur une même compétence peuvent se chevaucher (l'écran attend la correction) ; échéances serveur posées à 6 h UTC ;
- aucun email réel tant que le domaine n'est pas vérifié dans Resend (bloc D) ; rappels inactifs tant que le Cron n'est pas posé ;
- Google OAuth en mode Testing (100 utilisateurs).

## 3. Base en ligne (projet Supabase `crazwnfjyzaxirbmwnkn`)

**Migrations :** 0001 à 0022 appliquées (0022 le 21 octobre 2026, contenu republié).
- **0023 à recoller seule** : constaté le 22 octobre, `enregistrer_positionnement` en ligne est encore la version de 0021 (0021 a sans doute été rejouée après 0023). Tant qu'elle manque, un élève peut faire valider une compétence au test après avoir vu sa correction en exercice.
- **0024 à coller** (23 octobre 2026) : depuis 0020, aucun professeur ne pouvait ouvrir de créneau (la politique de lecture relisait la table pendant l'upsert ... RETURNING, insertion annulée). Corrigé par 0024 et le TEST 199 ; l'écran attend la réponse du serveur.
- **Professeurs :** les deux en base ne sont pas vérifiés (`verifie_le` nul), leurs créneaux restent cachés des élèves. Requête : `update teachers set verifie_le = now() where id = (select id from profiles where email = '...');`
- **Cron :** `supabase/cron/rappels.sql` pas appliqué (`pg_cron` absent ; secret `CRON_SECRET` à créer, mode d'emploi en tête du fichier).

**Edge Functions déployées :**

| Fonction | Version | JWT | Rôle |
|---|---|---|---|
| `corriger` | v17 | oui | correction (modes « exercice » et « positionnement »), écrit tentative et progression |
| `rendre-super` | v3 | oui | corrige la copie d'un super exercice, écrit `super_attempts` et la progression |
| `accord-parental` | déployée | non | consentement et modifications de profil d'un mineur |
| `rapport-hebdo` | v1 | non | résumé du dimanche au parent (`CRON_SECRET`) |
| `rappel-revision` | v1 | non | rappels de travail par email (`RESEND_*`, `APP_URL`, `CRON_SECRET`) |
| `supprimer-compte` | v1 | oui | suppression définitive (mot SUPPRIMER) |

**Secrets posés :** `RESEND_API_KEY` (et `RESEND_FROM`, `APP_URL`). À créer : `CRON_SECRET`.
