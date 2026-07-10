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

### B. Cosmos Ludique — gamifié façon Duolingo
Inspiration : Duolingo, Khan Kids, Mimo.
- Palette vive : violet #7C5CFC, vert réussite #58CC02, corail #FF6B6B, jaune #FFC93C.
- Typo arrondie (Fredoka/Nunito), mascotte, boutons 3D, badges.
- DAG en parcours « carte de niveaux » (bulles + étoiles).
- Fort engagement primaire/collège, mais moins crédible côté sérieux pour un terminale spé.
- Réserve : garder de cette piste uniquement les micro-célébrations (réussite d'exercice, révision faite).

### C. Néo-Académique / Blueprint — identité maths forte
Inspiration : cahier de maths, papier millimétré, blueprint.
- Papier crème + grille, encre bleu nuit #1E293B, accent indigo profond #4F46E5, motifs de graphe.
- Titres Space Grotesk, IDs/formules JetBrains Mono.
- Le DAG devient la signature de marque. Très différenciant, un peu moins chaleureux pour les tout-petits.
- Réserve : source d'inspiration pour la mise en valeur visuelle du DAG plus tard.

---

## 2. Inventaire des 7 écrans + mapping base de données

Tables Supabase cibles (cf. CLAUDE.md §6) : `profiles`, `skill_progress`, `exercise_attempts`, `content_skills` / `content_exercises` / `content_mindmaps`, `availability_slots`, `bookings`.

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
