# Consigne commune aux relecteurs, étape 4a (domaine P, grandeurs et mesures)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot, et l'auteur compte sur toi pour trouver ce qu'il a raté. Réponds en français. **Tu ne modifies aucun fichier** (scripts jetables autorisés dans `_travail\`, préfixés `review_`).

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : les règles que l'auteur devait respecter, dont les **sixième et septième règles**.
3. `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\brief_etape4a.md` : la consigne exacte donnée aux rédacteurs, en particulier **ce que le programme interdit classe par classe** et les **règles propres au domaine**.
4. `_travail\etape4a_dag_P.md` : le compte rendu du cartographe (ce qui est enseigné à chaque classe).
5. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
6. Les compétences : `_travail\etape4a_dag_P.json` (proposées) et `Spécifications DAG, Exos, Mindcards\content\dag\*.json` (existantes). Exercices existants des prérequis : `content\exercices\<domaine>\<compétence>.json`.
7. Programme : `_travail\programmes\ce1-ce2-cp.txt` et `_travail\programmes\6eme-cm1-cm2.txt`. Vérifie que chaque `programme_ref` correspond à un attendu réel, au niveau de la compétence ou en dessous.

## Outils
Python : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
- Recalcule **chaque** réponse et **chaque** étape de corrigé par script, avec `fractions.Fraction` ou `decimal.Decimal` (jamais de flottants), sans regarder `answer.value` avant d'avoir la tienne.
- Validateur complet sur une copie :
  `python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_dag_P.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_liens_P.json" --exercises <lot>` (`--tout` pour la sortie complète).
- Comment l'application affiche et corrige : `Math_Edu_Application\supabase\functions\_shared\correction.ts` (règles de correction : une virgule suivie d'un chiffre est lue comme virgule décimale, les espaces sont ignorées, `accepted` liste les autres écritures), `Math_Edu_Application\src\components\exercise\AnswerInput.tsx` (l'unité `answer.unit` s'affiche à côté du champ), `Math_Edu_Application\src\components\ui\RichText.tsx` (KaTeX).

## Points d'attention de cette étape
- **Aucune figure** (BLOQUANT si l'exercice en dépend) :
  - pas de « regarde la figure », « mesure ce segment », ni de lecture de règle, d'horloge ou de quadrillage dessiné ;
  - les dimensions et les horaires sont donnés en mots et en chiffres. Vérifie que l'exercice se résout entièrement avec ce qui est écrit.
- **Procédure conforme à la classe** (BLOQUANT) :
  - pas de formule, ni du mot « formule », avant la 6e ;
  - pas de « tableau de conversion » avant la 6e ;
  - cm² seulement après P017, cm³ seulement après P026 ;
  - pas de formule du volume du pavé (5e) ;
  - pas de virgule au CP.

  Lis les **corrigés** avec la même exigence que les énoncés.
- **Conversions** : recalcule chaque conversion par le rapport entre unités (aires : rapport 100 entre unités voisines, pas 10). Une conversion fausse dans un corrigé est BLOQUANTE.
- **Une seule bonne réponse** :
  - une durée sans unité imposée (« en minutes » ou « en heures et minutes ») est BLOQUANTE si plusieurs écritures justes seraient refusées ;
  - un horaire en saisie libre doit accepter « 14 h 35 », « 14h35 » et « 14:35 ».
- **Saisie** :
  - `answer.value` est le nombre seul, l'unité va dans `answer.unit`, et `accepted` couvre la saisie avec l'unité ;
  - teste chaque réponse juste plausible contre la correction (`correction.ts`). Une réponse juste refusée est un défaut IMPORTANT.
- **Disque (P023)** :
  - la valeur de π est donnée dans l'énoncé ;
  - l'arrondi est demandé ;
  - la tolérance est cohérente avec l'arrondi.
- **Ordres de grandeur réalistes** (une pomme ne pèse pas 2 kg, une table ne mesure pas 15 m) : IMPORTANT.
- **Niveau** :
  - nombres dans le champ de la classe ;
  - opérations annexes couvertes par les prérequis (remonte la chaîne du DAG fusionné) ;
  - énoncés sous le plafond de mots (CP 15, CE1 20, CE2 25, CM1/CM2 30).
- **Le reste** :
  - progression D → E → M réelle ;
  - distracteurs plausibles et `misconception` exactes ;
  - bonne réponse pas toujours à la même place.

## Format de sortie
Exactement le format de rapport de `math-reviewer.md` :
- un tableau de synthèse ;
- un bloc par défaut, avec Constat / Problème / Preuve / Correctif ;
- le taux d'erreur ;
- les identifiants publiables.

**Chaque correctif doit être directement applicable** : texte de remplacement complet, nouvelle réponse recalculée. Ton rapport est ta réponse finale ; ne l'écris pas dans un fichier.
