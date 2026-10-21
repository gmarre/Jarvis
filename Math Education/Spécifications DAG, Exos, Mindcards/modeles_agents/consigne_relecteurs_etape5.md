# Consigne commune aux relecteurs, étape 5 (nombres relatifs et arithmétique, 5e à 3e)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot. Réponds en français, ton direct, sans tirets longs.

**Tu ne modifies aucun fichier.** Les scripts jetables sont autorisés dans `_travail\`, avec un nom préfixé `review_5_<lot>_`.

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `_travail\brief_etape5.md` : la consigne exacte donnée aux rédacteurs (écriture des relatifs, figures, programme, distracteurs). Pour les lots à figures, `_travail\brief_figures.md` s'applique aussi.
3. `_travail\etape5_dag_AB.md` (compte rendu du cartographe, décisions de Gauthier, ajout du 19 octobre en fin de fichier) et `_travail\etape5_dag_AB.json`.
4. `scripts\figures.py`, docstrings de `_droite_graduee` et `_repere`.
5. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
6. Programme : `_travail\programmes\5eme.txt` (cycle 4 par classe) et `_travail\programmes\6eme-cm1-cm2.txt`.

## Outils
Python du projet : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
- **Recalcule chaque réponse toi-même**, en Fraction, sans regarder `answer.value` avant d'avoir la tienne ; recalcule chaque distracteur depuis l'erreur annoncée.
- **Figures** : rends-les toi-même (`python scripts\figures.py apercu <dossier> <sortie>`), puis une planche PNG à 360 px avec `node "C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\5625dac1-2271-41d0-bf2b-fc23fb862aa9\scratchpad\fig\shot.cjs" <page.html> <sortie.png> 360`, ouverte avec l'outil Read.
- **Saisies** : teste les saisies plausibles contre la vraie correction, `Math_Edu_Application\supabase\functions\_shared\correction.ts`, sous node (modèle : `_travail\review_F1_saisie.cjs`). Pour toute réponse négative : « -3 », « −3 », « – 3 », « (-3) ».
- **Validateur** :
  ```
  python scripts\check_lot.py --skills _travail\etape5_dag_AB.json --links _travail\etape5_liens_AB.json --exercises <lot> [--figures <dossier>]
  ```

## Points d'attention (en plus de ta grille habituelle)
**BLOQUANT :**
- une réponse fausse, un distracteur juste, deux bonnes réponses ;
- un relatif écrit avec le trait d'union dans un texte lu par l'élève (hors formule KaTeX) ;
- la notation |x| ; une puissance dans un texte élève (avant l'étape 6) ;
- une multiplication ou division de relatifs avant la 4e ; un nombre négatif dans une compétence antérieure à la 5e ;
- un couple de coordonnées ou une décomposition demandés en saisie libre ;
- une figure qui donne la réponse sans être lue (pour A019, l'abscisse demandée écrite sur la figure ; pour A023, une figure tout court) ; un `alt` qui donne la réponse ;
- pour A020, un QCM de coordonnées sans le point inversé (b ; a) ni le point au signe changé ;
- un corrigé qui emploie une opération non couverte par les prérequis (remonte la chaîne dans le DAG fusionné plus `etape5_dag_AB.json`).

**IMPORTANT :**
- évaluation partielle (A019, A020, B046, A025) : modes variés, sans faire croire que l'élève a placé ou écrit ;
- distracteurs fondés sur les erreurs classiques de la consigne ;
- lisibilité des figures à 360 px.

**Le reste :** champ numérique, plafond de mots (30 au collège), place des bonnes réponses, répartition vrai/faux, progression D → E → M, `programme_ref` exact et d'une classe égale ou inférieure.

## Format de sortie
Exactement le format de rapport de `math-reviewer.md` : tableau de synthèse ; un bloc par défaut (Constat, Problème, Preuve, Correctif) ; taux d'erreur ; identifiants publiables. **Chaque correctif est directement applicable** (nouveau texte, nouveaux `params`), et recalculé.

Ton rapport est ta réponse finale : ne l'écris pas dans un fichier.
