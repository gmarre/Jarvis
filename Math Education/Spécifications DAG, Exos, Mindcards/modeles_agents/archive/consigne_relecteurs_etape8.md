# Consigne commune aux relecteurs, étape 8 (géométrie et grandeurs du cycle 4, 5e à 3e)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot. Réponds en français, ton direct, sans tirets longs.

**Tu ne modifies aucun fichier existant.** Les scripts jetables sont autorisés dans `_travail\`, avec un nom préfixé `review_8_<lot>_`. Tu peux écrire une copie corrigée `_travail\review_8_<lot>_corrige.json` et tes correctifs `_travail\review_8_<lot>_correctifs.json` (figures corrigées dans `_travail\review_8_<lot>_figures\`).

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `_travail\brief_etape8.md` : la consigne exacte donnée aux rédacteurs (règles propres, notations, valeurs approchées, distracteurs).
3. `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_relecteurs_etape5.md` : ses outils et son format s'appliquent ici (le DAG de l'étape 8 est fusionné : pas de `--skills` ni de `--links` au validateur).
4. Le compte rendu du cartographe de tes compétences, `_travail\etape8a_dag_G.md` ou `_travail\etape8b_dag_GP.md` (descriptions, figures, saisie, prérequis anticipés), et les arbitrages de l'étape 8 dans `CLAUDE.md` (cherche « Contenu, étape 8 »).
5. Le programme : `_travail\programmes\5eme.txt`.

## Points d'attention (en plus de ta grille habituelle)
**BLOQUANT :**
- une réponse fausse, un distracteur juste, deux bonnes réponses ; recalcule chaque longueur, angle, aire, volume **à partir des données écrites sur la figure et dans l'énoncé**, toi-même ;
- **une figure qui donne la réponse** (dessin, valeur écrite, texte alternatif) ou **qui ment** (un angle codé droit qui ne l'est pas, des parallèles qui ne le sont pas quand l'énoncé l'affirme, une longueur écrite incompatible avec les autres) ; rends chaque figure avec `scripts\figures.py` et regarde-la à 360 px ;
- une question qui se résout en mesurant le dessin au lieu de raisonner sur les données ;
- **valeurs approchées** : rang d'arrondi absent de l'énoncé, tolérance qui accepte le mauvais arrondi, valeur exacte à moins de 0,1 rang d'une frontière, arrondi intermédiaire qui décale le résultat, calculatrice en degrés non dite ;
- un corrigé qui emploie une opération ou une notion non couverte par les prérequis (racine carrée, quotient, π, cos, AB², « réciproque » avant G060) : remonte la chaîne dans le DAG fusionné ;
- une saisie qui refuse une écriture juste plausible (unité en toutes lettres, « 4,5 cm », « 72° », « √34 », « sqrt(34) », « 36pi ») ou accepte une erreur classique : rejoue contre la vraie `Math_Edu_Application\supabase\functions\_shared\correction.ts` ;
- un couple de données repris d'un test de validation ou d'un autre exercice de la compétence.

**IMPORTANT :**
- tracer, construire, rédiger demandés à l'écran (interdit : désigner, choisir, ordonner, juger) ;
- distracteurs fondés sur les erreurs classiques de la consigne ;
- vocabulaire hors classe (« réciproque », « contraposée » avant G060 ; homothétie, rotation, agrandissement, absents du programme).

**Le reste :** plafond de mots (30 au collège), place des bonnes réponses, répartition vrai/faux, progression D → E → M, `programme_ref` exact et d'une classe égale ou inférieure, lisibilité des figures (étiquettes qui se chevauchent).

## Format de sortie
Le format de rapport de `math-reviewer.md` : tableau de synthèse ; un bloc par défaut (Constat, Problème, Preuve, Correctif) ; taux d'erreur ; identifiants publiables. **Chaque correctif est directement applicable** et recalculé. Ton rapport est ta réponse finale.
