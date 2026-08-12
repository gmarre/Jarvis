# Brief Design MVP — MATH EDUCATION

Document de référence pour la maquette MVP produite dans Claude Design. Le prompt prêt à coller est dans `PROMPT_Claude_Design.md`. Direction retenue : **Studio Clair**.

---

## 1. Les 3 directions artistiques (référence)

### A. Studio Clair (RETENUE) — premium, épuré
Inspiration : Brilliant, Notion, Linear.
- Palette : fond #FAFAF8, encre #0F172A, accent indigo/violet #6366F1, maîtrisé #10B981, en cours #F59E0B, verrouillé #94A3B8.
- Typo : titres Fraunces (serif douce), UI Inter.
- Formes : arrondis 12-16px, ombres douces, beaucoup de blanc, cartes flottantes.
- DAG : nœuds ronds pastel, halo sur le nœud courant, arêtes fines.
- Pour qui : rassure les parents payeurs, tient du collège à la terminale, se recode facilement.
- Pourquoi retenue : le pari le plus sûr pour un MVP, crédible et intemporel, base neutre qui ne condescend pas les grands et reste lisible pour les petits.

---

## 2. Inventaire des 7 écrans + mapping base de données

Contexte : 
But : Plateforme d'aide aux mathématiques pour les élèves de la primaire à la Terminale spé, basée sur un DAG (graphe orienté acyclique) de compétences mathématiques personnalisé par élève.
L'objectif est de remonter précisément à la lacune racine de l'élève et de lui faire travailler uniquement ce qu'il doit, même si cela remonte 2 classes en arrière.

Fonctionnement :

Un DAG de compétences maths de la primaire à la Terminale spé. 3 fichiers json centraux dans l'application DAG, Exercices, Cartes mentales ces trois fichiers json étant liés entre eux. 
Une compétence requiert des cartes mentales et des exercices  (v1 JSON disponible sur Drive : 414 compétences, 15 domaines)
Chaque élève dispose d'un DAG personnalisé selon ses compétences évaluées
3 outils pour l'élève : exercices adaptés, cartes mémoires (spaced repetition), cours particuliers avec profs
Les professeurs voient le DAG de chaque élève et savent exactement quoi travailler
Différenciateur :

Diagnostic précis : remontée à la lacune racine dans le DAG, même si 2 classes en arrière
Travail ciblé uniquement sur les lacunes (gain de temps, pas de redite inutile)
Spaced repetition pour mémorisation à long terme efficace
Personnalisation totale par élève
Modèle économique :

Abonnement élève : 9,99€/mois (engagement 6 mois) - accès plateforme sans cours
Cours particuliers : ~20€/h avec commission pour l'application
Abonnement professeur : à définir (ne pas cumuler avec la commission cours)

Site web (fonctionnalités complètes) + app mobile (flashcards et exos rapides)

Tables Supabase cibles  : `profiles`, `skill_progress`, `exercise_attempts`, `content_skills` / `content_exercises` / `content_mindmaps`, `availability_slots`, `bookings`.

| # | Écran | Rôle | Lit | Écrit | États clés |
|---|-------|------|-----|-------|-----------|
| 1 | Connexion / rôle | tous | `profiles` | `profiles` (role, prénom, niveau_scolaire, email_parent, consentement) | nouveau / connu |
| 2 | Onboarding + test de positionnement | élève | `content_skills` | `skill_progress` (statut par compétence) | en cours / résultat |
| 3 | Espace personnel / profil | tous | `profiles`, `skill_progress` | `profiles` | vide (compte neuf) / rempli |
| 4 | Espace de travail | élève | `skill_progress` (next_review_at), `content_exercises`, `content_mindmaps` | — | vide (rien à réviser) / rempli |
| 5 | Lecteur d'exercice | élève | `content_exercises` | `exercise_attempts`, `skill_progress` | en cours / juste / faux |
| 6 | Carte mentale | élève | `content_mindmaps` | `skill_progress` (next_review_at J+1/J+3/J+7/J+21) | lecture / révisé |
| 7 | Calendrier de cours | élève + prof | `availability_slots`, `bookings` | `bookings` (élève), `availability_slots` (prof) | plein / déjà réservé / aucun créneau |

Écrans exportés en mobile ET desktop en priorité : Connexion, Profil, Espace de travail, Calendrier.

---

## 3. Points de vigilance transverses

- **Grand écart d'âge (6-17 ans)** : cibles tactiles généreuses, langage simple, densité qui s'adapte. Une seule base sobre (Studio Clair), pas deux designs.
- **RGPD mineurs** : consentement parental + email parent visibles à l'inscription (< 15 ans).
- **Mobile-first** : majorité du trafic mobile ; composants pouce-compatibles qui se transposent vers la future app mobile / PWA.
- **DAG lisible** : rendu par domaine, jamais les 414 nœuds d'un coup. Couleurs = maîtrise (vert / ambre / gris).
- **Révision espacée** : encart « à réviser aujourd'hui » + streak + objectif du jour, sans transformer l'app en jeu.
- **Données factices séparées** (`mockData.ts`) pour un ré-import propre dans `Math_Edu_Application`.

---

## 4. Checklist de revue design (avant ré-import)

- [ ] Les 4 pages demandées + les 3 écrans ajoutés sont présents et cliquables.
- [ ] Design system livré (couleurs, typo, composants Button/Card/Badge/Input/NavShell).
- [ ] Chaque écran a ses états : vide, chargement, rempli, erreur.
- [ ] Versions mobile ET desktop pour Connexion, Profil, Espace de travail, Calendrier.
- [ ] DAG lisible par domaine, code couleur de maîtrise respecté.
- [ ] Navigation cohérente (shell latéral desktop / barre du bas mobile).
- [ ] Palette et typo conformes à Studio Clair (pas de dérive vers le template Dribbble).
- [ ] Données factices isolées dans un fichier dédié, composants sans données en dur.
- [ ] Textes en français, code (noms de composants) en anglais.
- [ ] RGPD : consentement parental + email parent visibles à l'inscription.
