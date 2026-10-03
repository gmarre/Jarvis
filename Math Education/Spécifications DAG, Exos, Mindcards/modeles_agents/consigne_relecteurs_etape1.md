# Consigne commune aux relecteurs, étape 1 (domaine B)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot, et l'auteur compte sur toi pour trouver ce qu'il a raté. Réponds en français. **Tu ne modifies aucun fichier** (tu peux écrire des scripts jetables dans `_travail\`, préfixés `review_`).

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : les règles que l'auteur devait respecter, y compris la **sixième règle** (leçons du lot B).
3. `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\brief_etape1.md` : la consigne exacte donnée aux rédacteurs.
4. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
5. Les compétences : `_travail\etape1_dag_B.json` (nouvelles) et `Spécifications DAG, Exos, Mindcards\content\dag\<domaine>.json` (existantes).
6. Programme en texte : `_travail\programmes\ce1-ce2-cp.txt` et `_travail\programmes\6eme-cm1-cm2.txt`. Vérifie que chaque `programme_ref` correspond à un attendu réel, au niveau de la compétence ou en dessous.

## Outils
Python : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
- Recalcule **chaque** réponse et **chaque** étape de corrigé par script, sans regarder `answer.value` avant d'avoir la tienne.
- Lance le validateur complet sur une copie temporaire :
  `python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape1_dag_B.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape1_liens_B.json" --exercises <lot>`
  (ajoute `--tout` pour voir la sortie complète). Le chef de projet a déjà vérifié que l'ensemble de l'étape passe : « Validation REUSSIE ».
- Les liens `etape1_liens_B.json` ajoutent B039 ou B008 en prérequis de A013, A026, A028, C004, C007, C027, C032, et B036 en prérequis de B005 : ils font partie du DAG fusionné.
- Pour savoir comment l'application affiche et corrige : `Math_Edu_Application\src\components\exercise\AnswerInput.tsx`, `Math_Edu_Application\src\lib\exercise.ts`, `Math_Edu_Application\src\components\ui\RichText.tsx` (les espaces multiples sont réduits à l'affichage).

## Points d'attention de cette étape
- **Les opérations annexes d'un problème sont-elles couvertes par les prérequis** de la compétence (remonte la chaîne dans le DAG fusionné) ? Une retenue non couverte est un défaut IMPORTANT.
- **Champ numérique** et **notations** : pas de « ÷ » avant B039 (CE2) ; pas de priorités opératoires sans parenthèses avant la 5e.
- Une **réponse numérique est un seul nombre** : un énoncé qui demande « le quotient et le reste » dans un champ numérique est BLOQUANT.
- Une **technique posée** dessinée en colonnes dans l'énoncé est BLOQUANTE (rejet explicite de Marius).
- Progression D → E → M réelle, distracteurs plausibles et `misconception` exactes, bonne réponse pas toujours à la même place, énoncés sous le plafond de mots (CP 15, CE1 20, CE2 25, CM1/CM2 30).

## Format de sortie
Exactement le format de rapport de `math-reviewer.md` (tableau de synthèse, un bloc par défaut avec Constat / Problème / Preuve / Correctif, taux d'erreur, identifiants publiables). **Chaque correctif doit être directement applicable** : texte de remplacement complet, nouvelle réponse recalculée. Ton rapport est ta réponse finale ; ne l'écris pas dans un fichier.
