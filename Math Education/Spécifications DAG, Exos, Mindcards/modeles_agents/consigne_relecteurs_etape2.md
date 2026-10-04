# Consigne commune aux relecteurs, étape 2 (domaine D, nombres décimaux)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot, et l'auteur compte sur toi pour trouver ce qu'il a raté. Réponds en français. **Tu ne modifies aucun fichier** (scripts jetables autorisés dans `_travail\`, préfixés `review_`).

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : les règles que l'auteur devait respecter, dont les **sixième et septième règles**.
3. `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\brief_etape2.md` : la consigne exacte donnée aux rédacteurs, en particulier les **règles propres aux nombres décimaux**.
4. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
5. Les compétences : `_travail\etape2_dag_D.json` (proposées) et `Spécifications DAG, Exos, Mindcards\content\dag\*.json` (existantes). Exercices existants des prérequis : `content\exercices\<domaine>\<compétence>.json`.
6. Programme : `_travail\programmes\ce1-ce2-cp.txt` et `_travail\programmes\6eme-cm1-cm2.txt`. Vérifie que chaque `programme_ref` correspond à un attendu réel, au niveau de la compétence ou en dessous.

## Outils
Python : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
- Recalcule **chaque** réponse et **chaque** étape de corrigé par script, avec `decimal.Decimal` (jamais de flottants), sans regarder `answer.value` avant d'avoir la tienne.
- Validateur complet sur une copie :
  `python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape2_dag_D.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape2_liens_D.json" --exercises <lot>` (`--tout` pour la sortie complète).
- Comment l'application affiche et corrige : `Math_Edu_Application\src\components\exercise\AnswerInput.tsx`, `Math_Edu_Application\src\lib\exercise.ts` (une virgule suivie d'un chiffre est lue comme virgule décimale ; la réponse numérique s'affiche à la française), `Math_Edu_Application\src\components\ui\RichText.tsx`.

## Points d'attention de cette étape
- **Exactitude décimale** : position de la virgule, zéros inutiles, arrondis (cas du 5, cas qui « remonte » comme 9,96 → 10,0).
- **Une seule bonne réponse** : une question d'intercalation (« un nombre entre 2,3 et 2,4 ») ou de rangement en saisie libre est BLOQUANTE si plusieurs réponses justes seraient comptées fausses.
- **Saisie** : `answer.value` décimal en nombre JSON, unité dans `answer.unit`, jamais « € » dans la valeur ; listes séparées par « ; ». Une réponse juste qui serait refusée par `checkAnswer` est un défaut IMPORTANT.
- **KaTeX** : virgule écrite `{,}` dans les formules (sinon « 3, 5 » à l'écran) : MINEUR, mais à relever partout.
- **Niveau** : au CE1 et au CE2, virgule seulement pour des sommes d'argent ; CM1 jusqu'aux centièmes ; CM2 et 6e jusqu'aux millièmes. Opérations annexes couvertes par les prérequis (remonte la chaîne du DAG fusionné).
- Progression D → E → M réelle, distracteurs plausibles et `misconception` exactes, bonne réponse pas toujours à la même place, énoncés sous le plafond de mots (CE1 20, CE2 25, CM1/CM2 30).

## Format de sortie
Exactement le format de rapport de `math-reviewer.md` (tableau de synthèse, un bloc par défaut avec Constat / Problème / Preuve / Correctif, taux d'erreur, identifiants publiables). **Chaque correctif doit être directement applicable** : texte de remplacement complet, nouvelle réponse recalculée. Ton rapport est ta réponse finale ; ne l'écris pas dans un fichier.
