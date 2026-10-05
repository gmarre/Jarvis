# Consigne commune aux rédacteurs, étape 3 (domaine E, proportionnalité et pourcentages, CM1 à 5e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français.

## À lire avant d'écrire, dans cet ordre
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : ta définition complète. Elle prime sur tout. Lis en particulier la **règle zéro**, la **règle du champ numérique**, les **sixième et septième règles** (leçons des lots précédents) et le **format de sortie**.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Tes compétences, dans `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape3_dag_E.json` (proposées, pas encore dans la banque) : `label`, `description`, `school_level`, `validation_test`, `prerequisites`, `programme_ref`. **Le compte rendu du cartographe, `_travail\etape3_dag_E.md`, est à lire en entier** : son constat central fixe ce qui est enseigné à chaque classe. Les compétences existantes : `Spécifications DAG, Exos, Mindcards\content\dag\A.json` à `D.json`.
4. Le style des exercices déjà relus, et les exercices des prérequis de tes compétences (pas de doublon de nombres ni de contexte) : `Spécifications DAG, Exos, Mindcards\content\exercices\<domaine>\<compétence>.json`.
5. Le programme officiel, en texte : `_travail\programmes\6eme-cm1-cm2.txt` (CM1, CM2, 6e) et `_travail\programmes\5eme.txt`. Chaque `programme_ref` d'exercice cite un attendu qui existe, à un niveau égal ou inférieur à celui de la compétence.

## Ce que tu produis
- **6 exercices par compétence** : 2 `decouverte`, 2 `entrainement`, 2 `maitrise`. Identifiants `EX-<compétence>-<D|E|M>-01` et `-02`.
- **Varie les types** et **la place de la bonne réponse** dans les QCM. `review_status` : `"brouillon"`. `image` : `null` (aucune figure : tout ce qui serait un dessin ou un graphique se décrit en mots ou par des coordonnées).

## Ce que le programme interdit, classe par classe (bloquant, contrôlé par le validateur)
- **CE2 (B043, comparaison multiplicative)** :
  - problèmes en **une étape** : « 3 fois plus que », « 4 fois moins que » ;
  - nombres entiers ;
  - plafond de 25 mots ;
  - les signes × et ÷ sont permis (B005 et B039 sont des ancêtres) ;
  - aucun vocabulaire de proportionnalité.
- **CM1 et CM2** :
  - pas de tableau de proportionnalité, pas de coefficient, pas de produit en croix ;
  - le raisonnement se fait **en phrases**, sur des **grandeurs** (prix, quantités, recettes, distances), jamais sur des suites de nombres sans contexte ;
  - au CM1, linéarité multiplicative (« 3 fois plus de… ») ; au CM2, s'y ajoutent la linéarité additive (« pour 5, j'ajoute ce qu'il faut pour 2 et pour 3 ») et les problèmes en plusieurs étapes.
- **6e** :
  - tableau autorisé, en nommant chaque grandeur et son unité ;
  - passage par l'unité ;
  - **toujours pas de coefficient, ni de produit en croix** ;
  - l'échelle s'exprime « 1 cm sur le plan représente 50 m en réalité ».
- **5e** :
  - le coefficient de proportionnalité arrive ;
  - **jamais de produit en croix**, à aucun niveau.
- Le validateur bloque :
  - « produit en croix » partout ;
  - « coefficient » avant la 5e ;
  - « tableau de proportionnalité » avant la 6e ;
  - et cela dans l'énoncé, les propositions, l'indice et le corrigé.

## Règles propres au domaine
- **Le symbole %** est une notation contrôlée : il n'apparaît que dans les compétences qui ont E032 comme ancêtre. **Dans une formule KaTeX, écris `\%`** (le `%` seul y ouvre un commentaire et coupe la formule). Hors formule, écris « 20 % » avec une espace.
- **Réponse en pourcentage** :
  - `answer.value` est le nombre seul (`25`), avec `answer.unit: "%"` : l'élève tape le nombre, l'unité s'affiche à côté du champ ;
  - ajoute `"accepted": ["25 %"]` pour accepter aussi la saisie avec le symbole.
- **Augmentation ou remise en %** : seulement en exercice de **maîtrise de E010** (6e), en deux étapes (calculer la remise, puis la retrancher), sans coefficient multiplicateur (4e).
- **Vitesse moyenne (E007)** : durées en heures entières ou en demi-heures, vitesses en km/h, aucune conversion d'unités (le domaine des grandeurs n'existe pas encore).
- **Graphique (E023)** : pas d'image. Donne les points par leurs coordonnées, ou décris la représentation en mots (« une droite qui passe par l'origine »).
- **Nombres** :
  - le champ numérique de chaque classe s'applique (règle du champ numérique de ta définition) ;
  - décimaux : virgule `3,5` dans le texte, `3{,}5` dans une formule, `answer.value` en nombre JSON (`3.5`), unité dans `answer.unit`, listes séparées par « ; » ;
  - **au CM1 et au CM2, privilégie des nombres entiers** ; les décimaux n'y apparaissent que pour des prix.
- **Plafond de mots des énoncés** : CM1/CM2 30 mots en moyenne. Un problème de proportionnalité se dit court : une phrase de données, une question.
- **Erreurs classiques à exploiter dans les distracteurs** (misconceptions réelles) :
  - le modèle additif à la place du multiplicatif : « 3 pour 6 € donc 5 pour 8 € » (ajouter 2 de chaque côté) ;
  - appliquer la proportionnalité à une situation qui ne l'est pas (âge et taille, tarif avec un forfait) ;
  - confondre « 20 % de » et « 20 de plus » ;
  - prendre le pourcentage d'une remise pour le nouveau prix ;
  - inverser l'échelle ;
  - diviser la vitesse au lieu de multiplier.
- **Les étapes annexes d'un problème n'emploient que des opérations couvertes par les prérequis** de la compétence (remonte la chaîne dans le DAG fusionné).

## Vérifications obligatoires avant de rendre
Python avec les bibliothèques du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.

1. Un script jetable `_travail\verif_lot_etape3_<ton lot>.py`. Il :
   - **recalcule chaque réponse** avec `fractions.Fraction` ou `decimal.Decimal` (jamais de flottants) ;
   - vérifie chaque étape des corrigés et chaque misconception chiffrée ;
   - vérifie que chaque situation présentée comme proportionnelle l'est vraiment, et inversement ;
   - contrôle le champ numérique, que la réponse ne figure pas dans l'énoncé, et la cohérence identifiant / niveau / compétence ;
   - vérifie qu'aucun antislash n'est devenu une tabulation.
2. Le validateur complet, sur une copie temporaire (la banque n'est pas modifiée) :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape3_dag_E.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape3_liens_E.json" --exercises <ton fichier de lot>
   ```
   (`--tout` pour la sortie complète). Il doit afficher « Validation REUSSIE », sans erreur, et **aucun avertissement sur tes identifiants** à part l'absence de carte mentale.

## Ce que tu ne fais jamais
Modifier quoi que ce soit sous `content\`, les fichiers `etape3_*` du cartographe, `scripts\` ou l'application. Tu écris uniquement ton fichier de lot et ton script de vérification.

## Ta réponse finale
10 lignes maximum :
- le chemin du lot ;
- le nombre d'exercices par compétence ;
- le résultat de ta vérification et de `check_lot.py` ;
- toute difficulté que le chef de projet doit trancher.
