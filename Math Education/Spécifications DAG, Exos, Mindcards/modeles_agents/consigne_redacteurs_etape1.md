# Consigne commune aux rédacteurs, étape 1 (domaine B, calcul, CP à 6e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français.

## À lire avant d'écrire, dans cet ordre
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : ta définition complète. Elle prime sur tout. Lis en particulier la **règle zéro**, la **règle du champ numérique**, la **sixième règle** (leçons du lot B) et le **format de sortie**.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Tes compétences, dans `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape1_dag_B.json` (nouvelles compétences, pas encore dans la banque) : `label`, `description`, `school_level`, `validation_test`, `prerequisites`, `programme_ref`. Les prérequis déjà existants sont dans `Spécifications DAG, Exos, Mindcards\content\dag\<domaine>.json`.
4. Le style des exercices déjà relus : les 19 exercices B001, B005, B006 dans `Spécifications DAG, Exos, Mindcards\content\exercices\B\` (un fichier par compétence). Reste cohérent avec eux et n'en fais aucun doublon (ni mêmes nombres, ni même contexte).
5. Le programme officiel, en texte : `_travail\programmes\ce1-ce2-cp.txt` (CP, CE1, CE2) et `_travail\programmes\6eme-cm1-cm2.txt` (CM1, CM2, 6e). Chaque `programme_ref` d'exercice cite un attendu qui existe, à un niveau égal ou inférieur à celui de la compétence.

## Ce que tu produis
- **6 exercices par compétence** : 2 `decouverte`, 2 `entrainement`, 2 `maitrise`. Identifiants `EX-<compétence>-<D|E|M>-01` et `-02`.
- **Varie les types** (`numerique`, `qcm`, `vrai_faux`, `texte` si une réponse non numérique s'impose) et **la place de la bonne réponse** dans les QCM.
- `review_status` : toujours `"brouillon"`. `image` : `null` (l'application n'affiche pas d'image ; une collection à dénombrer peut s'écrire en rangées de `●`, procédé accepté).
- Une opération **posée** (addition, soustraction, multiplication, division) ne peut pas être dessinée en colonnes dans l'énoncé (les schémas en caractères ont été rejetés par Marius). Pose la question par son résultat (« Pose et calcule 47 + 38 »), et explique la technique posée colonne par colonne dans `solution_steps`, en mots.
- Pour une division euclidienne, la réponse attendue porte sur un seul nombre (le quotient OU le reste), ou bien est un `qcm` / `vrai_faux` sur l'égalité « a = b × q + r ». Le champ de saisie numérique n'accepte qu'un nombre.
- **Les étapes annexes d'un problème n'emploient que des opérations couvertes par les prérequis de la compétence** (remonte la chaîne des prérequis dans le DAG fusionné). Exemple : pas de soustraction avec retenue dans un exercice dont aucun prérequis n'est B004.

## Vérifications obligatoires avant de rendre
Python avec les bibliothèques du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe` (le chemin `tools\python` de ta définition n'existe pas sur cette machine). Lance-le avec `PYTHONIOENCODING=utf-8`.

1. Un script jetable `_travail\verif_<ton lot>.py` qui **recalcule chaque réponse** indépendamment, vérifie chaque étape des corrigés, le champ numérique de chaque nombre écrit, l'absence de retenue là où la compétence l'exclut, que la réponse ne figure pas dans l'énoncé, et la cohérence identifiant / niveau / compétence.
2. Le validateur complet, sur une copie temporaire (la banque n'est pas modifiée) :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape1_dag_B.json" --exercises <ton fichier de lot>
   ```
   Il doit afficher « Validation REUSSIE » sans aucune erreur, et **aucun avertissement sur tes identifiants** à part l'absence de carte mentale (les cartes viennent après). Corrige jusqu'à ce que ce soit le cas.

## Ce que tu ne fais jamais
Modifier quoi que ce soit sous `content\`, le fichier de compétences proposées, ou l'application. Tu écris uniquement ton fichier de lot et ton script de vérification.

## Ta réponse finale
10 lignes maximum : chemin du lot, nombre d'exercices par compétence, résultat de ta vérification et de `check_lot.py`, et toute difficulté (notion floue, attendu introuvable, compétence mal découpée) que le chef de projet doit trancher.
