# Consigne commune aux rédacteurs, étape 4a (domaine P, grandeurs et mesures, CP à 6e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français.

## À lire avant d'écrire, dans cet ordre
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : ta définition complète. Elle prime sur tout. Lis en particulier :
   - la **règle zéro** ;
   - la **règle du champ numérique** ;
   - les **sixième et septième règles** (leçons des lots précédents) ;
   - le **format de sortie**.
2. `C:\Users\MARRE\Documents\Jarvis\Math Education\Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Tes compétences, dans `C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_dag_P.json` (proposées, pas encore dans la banque) : `label`, `description`, `school_level`, `validation_test`, `prerequisites`, `programme_ref`.
   - **Le compte rendu du cartographe, `_travail\etape4a_dag_P.md`, est à lire en entier** : son constat central fixe ce qui est enseigné à chaque classe.
   - Les compétences existantes : `Spécifications DAG, Exos, Mindcards\content\dag\A.json` à `E.json`.
4. Le style des exercices déjà relus : `Spécifications DAG, Exos, Mindcards\content\exercices\<domaine>\<compétence>.json`, en particulier `D\D014.json` (conversions avec virgule), `D\D016.json`, `D\D017.json` (monnaie) et les lots de l'étape 3. Pas de doublon de nombres ni de contexte avec les exercices des prérequis.
5. Le programme officiel, en texte : `_travail\programmes\ce1-ce2-cp.txt` (CP, CE1, CE2) et `_travail\programmes\6eme-cm1-cm2.txt` (CM1, CM2, 6e). Chaque `programme_ref` d'exercice cite un attendu qui existe, à un niveau égal ou inférieur à celui de la compétence.

## Ce que tu produis
- **6 exercices par compétence** : 2 `decouverte`, 2 `entrainement`, 2 `maitrise`. Identifiants `EX-<compétence>-<D|E|M>-01` et `-02`.
- **Varie les types** et **la place de la bonne réponse** dans les QCM.
- `review_status` : `"brouillon"`.

## Pas de figure : l'application n'affiche pas encore d'images (bloquant)
- `image` vaut toujours `null`.
- Tout ce qui serait un dessin se donne **en mots et en nombres** :
  - « un rectangle de 6 cm de long et 4 cm de large » ;
  - « un pavé fait de 3 couches de 4 rangées de 5 cubes » ;
  - « un polygone dont les côtés mesurent 3 cm, 5 cm, 4 cm et 6 cm ».
- Jamais « regarde la figure », « sur le dessin », « mesure ce segment ».
- Ne demande pas de lire une règle graduée, une horloge à aiguilles ou un quadrillage dessiné : ce sont les compétences à figure (P001, P004, P007, P013, P017). Elles n'ont pas d'exercice dans cette étape.
- Une heure se donne **écrite en chiffres** (« 14 h 35 »).

## Ce que le programme interdit, classe par classe (bloquant, contrôlé par le validateur)
- **Pas de formule avant la 6e.** « Il n'est pas attendu de mémorisation de formules de périmètres ou d'aires de figures planes au CM1 » ; le CM2 ne mémorise pas non plus les formules de périmètre.
  - Le mot « formule » est **interdit avant la 6e** (énoncé, propositions, indice, corrigé).
  - Avant la 6e, le corrigé raisonne en phrases : « le contour, c'est 6 + 4 + 6 + 4 » ; « 4 côtés de même longueur, c'est le quadruple ».
  - En 6e (P022, P024), la formule s'écrit et se justifie.
- **« Tableau de conversion » interdit avant la 6e.** Avant, on convertit par les relations entre unités : « 1 m = 100 cm, donc 3 m = 300 cm ».
- **Unités d'aire (²) et de volume (³)** : notations contrôlées. cm², m² n'apparaissent que dans les compétences qui descendent de P017 (aire, CM1). cm³ n'apparaît que dans celles qui descendent de P026 (6e).
- **Virgule** : notation contrôlée depuis D016 (CE1, monnaie). Au CP (P002, P003), aucun nombre à virgule, euros entiers seulement.

## Règles propres au domaine
- **Réponse numérique avec unité** : `answer.value` est le nombre seul (`350`), et l'unité va dans `answer.unit` (`"cm"`, `"kg"`, `"L"`, `"min"`, `"€"`, `"cm²"`). Ajoute dans `accepted` les écritures avec l'unité si l'élève risque de la taper (« 350 cm »).
- **Durées et horaires** :
  - pour une durée, préfère une réponse en minutes (`unit: "min"`) ;
  - si la réponse est un horaire ou une durée en heures et minutes, type `texte` avec `accepted` qui couvre les écritures courantes (« 14 h 35 », « 14h35 », « 14:35 ») ;
  - **une seule bonne réponse** : précise « en minutes » ou « en heures et minutes » dans la question.
- **Ordres de grandeur réalistes** : une pomme pèse environ 150 g, une salle de classe mesure environ 8 m, un verre contient environ 20 cL.
- **Périmètre du disque (P023)** : donne la valeur de π à utiliser dans l'énoncé (« prends 3,14 pour π »). Précise l'arrondi demandé et mets la tolérance qui va avec, ou une réponse exacte avec `accepted`.
- **Volume (P026)** : dénombrement de cubes unités, décrit en couches et rangées ; pas de formule du volume du pavé (c'est de la 5e).
- **Nombres** :
  - le champ numérique de chaque classe s'applique ;
  - décimaux : virgule `3,5` dans le texte, `3{,}5` dans une formule ;
  - listes séparées par « ; ».
- **Plafond de mots des énoncés** : CP 15, CE1 20, CE2 25, CM1/CM2 30 mots en moyenne.
- **Erreurs classiques à exploiter dans les distracteurs** (misconceptions réelles) :
  - convertir dans le mauvais sens ;
  - « ajouter un zéro » quel que soit l'écart entre les unités ;
  - 1 h = 100 min ;
  - 1,5 h = 1 h 50 min ;
  - confondre périmètre et aire ;
  - convertir une aire avec le rapport des longueurs (1 m² = 100 cm²) ;
  - confondre masse et contenance ;
  - additionner des mesures d'unités différentes sans les convertir ;
  - compter un sommet deux fois dans un contour.
- **Les étapes annexes d'un problème n'emploient que des opérations couvertes par les prérequis** de la compétence. Remonte la chaîne dans le DAG fusionné.

## Vérifications obligatoires avant de rendre
Python avec les bibliothèques du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.

1. **Un script jetable `_travail\verif_lot_etape4a_<ton lot>.py`.** Il :
   - **recalcule chaque réponse** avec `fractions.Fraction` ou `decimal.Decimal` (jamais de flottants) ;
   - vérifie chaque étape des corrigés et chaque misconception chiffrée ;
   - vérifie chaque conversion par les rapports entre unités ;
   - contrôle :
     - le champ numérique ;
     - que la réponse ne figure pas dans l'énoncé ;
     - la cohérence identifiant / niveau / compétence ;
     - qu'aucun énoncé ne renvoie à une figure ;
     - qu'aucun antislash n'est devenu une tabulation.
2. **Le validateur complet**, sur une copie temporaire (la banque n'est pas modifiée) :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_dag_P.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_liens_P.json" --exercises <ton fichier de lot>
   ```
   (`--tout` pour la sortie complète). Il doit afficher « Validation REUSSIE », sans erreur, et **aucun avertissement sur tes identifiants**, à part l'absence de carte mentale.

## Ce que tu ne fais jamais
- Modifier quoi que ce soit sous `content\` ;
- modifier les fichiers `etape4a_*` du cartographe ;
- modifier `scripts\` ou l'application.

Tu écris uniquement ton fichier de lot et ton script de vérification.

## Ta réponse finale
10 lignes maximum :
- le chemin du lot ;
- le nombre d'exercices par compétence ;
- le résultat de ta vérification et de `check_lot.py` ;
- toute difficulté que le chef de projet doit trancher.
