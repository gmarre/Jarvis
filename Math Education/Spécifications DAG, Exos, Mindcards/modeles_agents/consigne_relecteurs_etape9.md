# Consigne commune aux relecteurs, étape 9 (proportionnalité du cycle 4 et fonctions, 5e à 3e)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot. Réponds en français, ton direct, sans tirets longs.

**Tu ne modifies aucun fichier existant.** Les scripts jetables sont autorisés dans `_travail\`, avec un nom préfixé `review_9_<lot>_`. Tu écris ton rapport complet dans `_travail\review_9_<lot>_rapport.md`, une copie corrigée `_travail\review_9_<lot>_corrige.json` et tes correctifs `_travail\review_9_<lot>_correctifs.json` (figures corrigées dans `_travail\review_9_<lot>_figures\`). Ta réponse finale tient en 10 lignes.

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `_travail\brief_etape9.md` : la consigne exacte donnée aux rédacteurs (règles propres, vocabulaire, saisie, distracteurs).
3. `Spécifications DAG, Exos, Mindcards\modeles_agents\archive\consigne_relecteurs_etape5.md` : ses outils et son format s'appliquent ici (le DAG de l'étape 9 est fusionné : pas de `--skills` ni de `--links` au validateur).
4. Le compte rendu du cartographe, `_travail\archive\etape9_dag_EJ.md` (descriptions, figures, saisie, prérequis anticipés), et les arbitrages de l'étape 9 dans `pilotage\DECISIONS.md`.
5. Le programme : `_travail\programmes\5eme.txt`, partie « Proportionnalité, fonctions ».

## Points d'attention (en plus de ta grille habituelle)
**BLOQUANT :**
- une réponse fausse, un distracteur juste, deux bonnes réponses ; recalcule chaque valeur toi-même, en fractions, **à partir des données de l'énoncé et des coordonnées de la figure** (lis le JSON de la figure, pas le dessin) ;
- **une lecture graphique hors de la demi-graduation**, ou une valeur lue entre deux sommets d'une ligne brisée sans `lectures` ; deux courbes dont l'intersection cherchée n'est pas sur la demi-graduation ;
- **une figure qui donne la réponse** (pointillés de lecture en entraînement ou en maîtrise, expression dans le texte alternatif, équation écrite sur une droite dont on demande le coefficient) ; rends chaque figure avec `scripts\figures.py` et regarde-la à 360 px ;
- un corrigé qui emploie une opération ou une notion hors de la chaîne (division de fraction C017, relatif, équation, puissance, « produit en croix ») : remonte la chaîne dans le DAG fusionné ;
- du vocabulaire avant sa compétence (liste du brief : ratio, image, antécédent, f(x), fonction linéaire…) : le validateur le refuse, vérifie aussi les indices ;
- une saisie qui refuse une écriture juste plausible (« 15 % », « 1,15 », « f(x) = 2x + 3 », « x ⩾ 2 », « −2 ; 2 ») ou accepte une erreur classique : rejoue contre la vraie `Math_Edu_Application\supabase\functions\_shared\correction.ts` ;
- un couple de données repris d'un test de validation ou d'un autre exercice de la compétence.

**IMPORTANT :**
- tracer, placer ou représenter demandé à l'écran (interdit : choisir, lire, juger) ;
- distracteurs fondés sur les erreurs classiques du brief ; QCM à justification fausse ; « Aucune » jamais juste ; deux distracteurs égaux ;
- inégalité stricte ou large non dite par l'énoncé.

**Le reste :** plafond de mots (30 au collège), place des bonnes réponses, répartition vrai/faux, progression D → E → M, `programme_ref` exact et d'une classe égale ou inférieure, lisibilité des figures (étiquettes qui se chevauchent, nom de courbe sur un point).

## Format de sortie
Le format de rapport de `math-reviewer.md` : tableau de synthèse ; un bloc par défaut (Constat, Problème, Preuve, Correctif) ; taux d'erreur ; identifiants publiables. **Chaque correctif est directement applicable** et recalculé.
