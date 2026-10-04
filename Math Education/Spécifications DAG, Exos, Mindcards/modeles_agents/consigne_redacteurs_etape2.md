# Consigne commune aux rédacteurs, étape 2 (domaine D, nombres décimaux, CE1 à 6e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français.

## À lire avant d'écrire, dans cet ordre
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : ta définition complète. Elle prime sur tout. Lis en particulier la **règle zéro**, la **règle du champ numérique**, les **sixième et septième règles** (leçons des lots précédents) et le **format de sortie**.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Tes compétences, dans `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape2_dag_D.json` (proposées, pas encore dans la banque) : `label`, `description`, `school_level`, `validation_test`, `prerequisites`, `programme_ref`. Le compte rendu du cartographe : `_travail\etape2_dag_D.md`. Les compétences existantes : `Spécifications DAG, Exos, Mindcards\content\dag\A.json`, `B.json`, `C.json`.
4. Le style des exercices déjà relus, et les exercices des prérequis de tes compétences (pas de doublon de nombres ni de contexte) : `Spécifications DAG, Exos, Mindcards\content\exercices\<domaine>\<compétence>.json`. Les fractions décimales s'appuient sur `exercices\C\`, les opérations posées sur `exercices\B\`.
5. Le programme officiel, en texte : `_travail\programmes\ce1-ce2-cp.txt` (CP, CE1, CE2) et `_travail\programmes\6eme-cm1-cm2.txt` (CM1, CM2, 6e). Chaque `programme_ref` d'exercice cite un attendu qui existe, à un niveau égal ou inférieur à celui de la compétence.

## Ce que tu produis
- **6 exercices par compétence** : 2 `decouverte`, 2 `entrainement`, 2 `maitrise`. Identifiants `EX-<compétence>-<D|E|M>-01` et `-02`.
- **Varie les types** et **la place de la bonne réponse** dans les QCM. `review_status` : `"brouillon"`. `image` : `null`.
- Les opérations posées ne se dessinent pas en colonnes dans l'énoncé (rejeté par Marius) : technique expliquée en mots dans `solution_steps`, avec le geste écrit (où l'on place la virgule, les zéros que l'on ajoute, la retenue).

## Règles propres aux nombres décimaux
- **Écriture de la virgule** : dans le texte, `3,5`. **Dans une formule KaTeX, écris `3{,}5`** (sinon KaTeX affiche « 3, 5 » avec une espace). Exemple : `$12{,}5 + 3{,}75 = 16{,}25$`.
- **Réponse numérique décimale** : `answer.value` est un nombre JSON (`3.5`, jamais la chaîne `"3,5"`). L'application accepte la saisie « 3,5 », « 3.5 », « 3,50 » et affiche « 3,5 » dans le corrigé. **Aucune unité ni « € » dans `value`** : mets l'unité dans `answer.unit` (`"€"`, `"cm"`…).
- **Une liste de nombres décimaux se sépare par « ; »** (« 3,4 ; 3,17 ; 3,09 ») : une virgule suivie d'un chiffre est lue comme une virgule décimale par l'application. Pour une réponse qui est une liste (rangement), préfère un QCM ou un vrai/faux à une saisie libre.
- **La virgule décimale est une notation contrôlée** : elle n'apparaît qu'à partir de D016 (CE1, monnaie). Les notations `×` (après B005) et `÷` (après B039) restent contrôlées.
- **Champ numérique** : CE1 et CE2, la virgule n'existe que pour des **sommes d'argent** (euros et centimes) ; CM1, jusqu'aux **centièmes** ; CM2 et 6e, jusqu'aux **millièmes**. Les dénominateurs 10 et 100 (CM1), et 1 000 (CM2), sont autorisés pour les fractions décimales.
- **Erreurs classiques à exploiter dans les distracteurs** (misconceptions réelles) : « plus il y a de chiffres après la virgule, plus le nombre est grand » (3,17 > 3,4) ; aligner les chiffres à droite au lieu d'aligner les virgules ; « multiplier par 10, c'est ajouter un zéro » (3,5 × 10 = 3,50) ; oublier la virgule dans le produit ; confondre dixièmes et dizaines.
- **Les étapes annexes d'un problème n'emploient que des opérations couvertes par les prérequis** de la compétence (remonte la chaîne dans le DAG fusionné).

## Vérifications obligatoires avant de rendre
Python avec les bibliothèques du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.

1. Un script jetable `_travail\verif_lot_etape2_<ton lot>.py` qui **recalcule chaque réponse** avec `decimal.Decimal` ou `fractions.Fraction` (jamais de flottants pour vérifier un calcul décimal), vérifie chaque étape des corrigés et chaque misconception chiffrée, le champ numérique, que la réponse ne figure pas dans l'énoncé, la cohérence identifiant / niveau / compétence, et qu'aucun antislash n'est devenu une tabulation.
2. Le validateur complet, sur une copie temporaire (la banque n'est pas modifiée) :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape2_dag_D.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape2_liens_D.json" --exercises <ton fichier de lot>
   ```
   (`--tout` pour la sortie complète). Il doit afficher « Validation REUSSIE », sans erreur, et **aucun avertissement sur tes identifiants** à part l'absence de carte mentale.

## Ce que tu ne fais jamais
Modifier quoi que ce soit sous `content\`, les fichiers `etape2_*` du cartographe, ou l'application. Tu écris uniquement ton fichier de lot et ton script de vérification.

## Ta réponse finale
10 lignes maximum : chemin du lot, nombre d'exercices par compétence, résultat de ta vérification et de `check_lot.py`, et toute difficulté que le chef de projet doit trancher.
