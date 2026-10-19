# Consigne du cartographe, étape 5 (nombres relatifs et arithmétique, 5e à 3e)

Tu es le cartographe de MATH EDUCATION. Réponds en français, avec un ton direct et sans tirets longs.

Ta mission : proposer les nœuds du DAG du **cycle 4 (5e, 4e, 3e)** pour deux thèmes, **les nombres relatifs** et **l'arithmétique** (multiples, diviseurs, nombres premiers, décomposition), chacun justifié par le programme officiel. Tu ne rédiges aucun exercice.

## Le contexte
**Domaines et identifiants.** On garde les lettres du v1, déjà autorisées par les schémas :
- **A « Numération »** pour ce qui définit, repère, compare ou décompose un nombre (relatifs : définition, opposé, valeur absolue, droite graduée, comparaison, repère du plan ; arithmétique : multiples, diviseurs, critères, nombres premiers, décomposition en facteurs premiers).
- **B « Calcul »** pour les opérations sur les relatifs (addition, soustraction, sommes avec parenthèses, multiplication, division, enchaînements) et les problèmes qui les mobilisent.
- Si une compétence hésite entre A et B, tranche et dis pourquoi dans le compte rendu.
- Identifiants existants : A001 à A014, A026 à A028 ; B001 à B008, B012 à B017, B036 à B043. Le v1 a utilisé A001 à A025 et B001 à B035. **Réutilise un identifiant du v1 quand la notion correspond** (par exemple A022 nombre négatif, A023 comparer des relatifs, A024 opposé, A025 valeur absolue, A019 décomposition en facteurs premiers), à condition qu'il ne soit pas déjà pris dans `content\dag\A.json` ou `B.json`. Sinon, nouveaux identifiants à partir de **A029** et **B044**.
- `domain_name` : `"Numération"` pour A, `"Calcul"` pour B (vérifie l'orthographe exacte dans les fichiers existants).

**Ce qui existe déjà et que tu ne dupliques pas.** Lis `content\dag\A.json` et `B.json` en entier : multiples et diviseurs (A012, A013), critères de divisibilité (A014 et suivants), priorités opératoires, division euclidienne sont déjà là au cycle 3. Le cycle 4 les **prolonge** (critères par 3 et 9 en 5e, nombres premiers, décomposition, fraction irréductible en 3e) : un nœud de cycle 4 n'existe que si le programme du cycle 4 ajoute quelque chose d'évaluable. Sinon, propose plutôt un lien vers le nœud existant.

**Hors périmètre (étapes suivantes) :**
- fractions et quotients (y compris l'écriture fractionnaire des relatifs et la fraction irréductible comme fin en soi) : étape 6, domaine C. Si la décomposition en facteurs premiers sert à simplifier une fraction, garde le nœud de décomposition et signale le lien futur, sans créer le nœud de fraction ;
- puissances, racine carrée, notation scientifique : étape 6 ;
- calcul littéral, équations : étape 7 (domaine F) ;
- repère du plan en géométrie (transformations, coordonnées de vecteurs) : étape 8. Ici, seulement **lire et placer un point de coordonnées relatives** dans un repère, si le programme le place en 5e.
- algorithmique : hors évaluation, sauf un nœud de lecture si le programme l'impose (« Mobiliser un algorithme dans le cadre du calcul numérique » ne justifie pas à lui seul un nœud).

**Figures.** L'auteur d'un exercice DÉCRIT la figure en JSON, et `scripts\figures.py` la dessine.
- Types disponibles : `demi_droite`, `regle`, `horloge`, `quadrillage`, `partage`, `bandes`, `monnaie`, `geometrie`, `rapporteur`, `solide`, `cubes`.
- **Deux besoins prévus** : une droite graduée qui va dans les négatifs (extension de `demi_droite`, ou nouveau type `droite_graduee`) et un repère du plan avec quatre quadrants. Pour chaque compétence, dis en une ligne quelle figure il faut (ou « aucune »), ce qui doit être dessiné et ce qui doit pouvoir être marqué. Le générateur sera écrit d'après tes besoins.
- Règle tirée des étapes précédentes : une figure n'est demandée que si elle est indispensable, et on ne doit pas pouvoir répondre en regardant la figure sans la lire.

**Limite de l'application.** L'élève répond par une saisie (nombre, texte court), un QCM ou un vrai/faux. Il ne trace rien, ne place rien à l'écran. « Placer un point » s'évalue indirectement (choisir la bonne lettre sur une figure). Signale toute « évaluation partielle ».

**Saisie des relatifs.** L'élève tape le signe moins au clavier (« -3 », « −3 » avec le signe typographique, peut-être « - 3 »). Lis `Math_Edu_Application\supabase\functions\_shared\correction.ts` et dis dans le compte rendu si ces trois saisies sont déjà acceptées pour une réponse « −3 ». **Ne modifie pas ce fichier** : signale seulement ce qui manque.

## À lire avant de proposer, dans cet ordre
1. `Spécifications DAG, Exos, Mindcards\CORRECTIONS_DAG_v2.md` : la méthode (niveau d'introduction, une notion sur deux classes = deux nœuds, pas de prérequis fantôme).
2. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Le modèle de livrable de l'étape précédente :
   - `_travail\etape4b_dag_G.md` (compte rendu) ;
   - `_travail\etape4b_dag_G.json` (format des compétences) ;
   - `_travail\etape4b_liens_G.json` (format des liens vers l'existant).

   Reprends exactement ces formats et ce plan de compte rendu. Le seuil de maîtrise est `{"required": 3, "out_of": 4}`.
4. Le DAG existant, fusionné : `Spécifications DAG, Exos, Mindcards\content\dag\*.json` (150 compétences). Tes prérequis viennent de là ou de ta proposition.
5. `scripts\figures.py` : les types existants, en particulier `demi_droite` et `quadrillage`.
6. Le v1, pour mémoire, dans `Spécifications DAG, Exos, Mindcards\skills_dag.json` (A019 à A025, B033). Ses niveaux sont souvent faux (il place les relatifs en 6e). Recale-les sur le programme, et donne la table de correspondance v1 → nouveau.
7. Le programme officiel, en texte :
   - **source principale : `_travail\programmes\5eme.txt`**. Malgré son nom, il contient le programme de mathématiques du cycle 4 **découpé par classe** : « Cinquième », « Quatrième », « Troisième », avec les rubriques « Nombres relatifs », « Opérations sur les nombres relatifs », « Multiples et diviseurs »… Une citation doit venir de la section de sa classe ;
   - `_travail\programmes\3eme-4eme.txt` : le programme de tout le cycle 4, toutes disciplines (partie mathématiques vers la fin). Ne t'en sers que si une notion manque dans `5eme.txt`, et dis-le ;
   - `_travail\programmes\6eme-cm1-cm2.txt`, pour vérifier ce qui est déjà vu en cycle 3.

## Le périmètre
**Dedans :**
- nombres relatifs : définition, positif et négatif, opposé, valeur absolue (si le programme la place au cycle 4), grandeurs négatives (températures, altitudes, dates) ;
- droite graduée : lire et placer une abscisse relative ;
- comparer et ranger des décimaux relatifs ;
- addition, soustraction, sommes algébriques avec parenthèses, enchaînements ;
- multiplication et division de relatifs (règle des signes), en 4e si le programme le dit ;
- repère du plan : lire et placer des points de coordonnées relatives ;
- multiples et diviseurs au cycle 4, critères de divisibilité par 3 et 9 s'ils ne sont pas déjà dans A, nombres premiers, décomposition en produit de facteurs premiers, diviseurs communs ;
- problèmes qui mobilisent ces notions.

Vise **14 à 22 compétences**, moins si le programme ne le justifie pas.

## Ce que tu produis
1. **`_travail\etape5_dag_AB.json`** : un tableau de compétences au format de `etape4b_dag_G.json`, avec `exercise_ids: []` et `mindmap_id: null`.
   - Le champ `programme_ref` contient des citations **exactes**, copiées du texte du programme, avec leur source (cycle, classe, rubrique).
   - La première citation est au niveau de la compétence, et aucune ne vient d'une classe postérieure.
2. **`_travail\etape5_liens_AB.json`** : les prérequis à ajouter à des compétences existantes, chacun avec sa raison. Tableau vide sinon.
3. **`_travail\etape5_dag_AB.md`** : le compte rendu, sur le plan de `etape4b_dag_G.md` :
   - les compétences, en tableau avec les colonnes « Figure » et « Évaluation » (directe, ou partielle avec une explication en 1 ligne) ;
   - le constat central ;
   - la correspondance avec le v1 ;
   - les liens vers l'existant ;
   - **les besoins de dessin**, par générateur ;
   - **les saisies de relatifs** : ce que `correction.ts` accepte déjà, ce qui manque ;
   - le découpage en **cartes mentales** de 4 à 8 compétences (identifiants `MM-A-..` ou `MM-B-..` à la suite des cartes existantes dans `content\cartes\`) ;
   - les **points à arbitrer**, numérotés, chacun avec ta recommandation.

## Vérifications obligatoires avant de rendre
Python du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. **Un script `_travail\verif_etape5_dag_AB.py`**, sur le modèle de `_travail\verif_etape4b_dag_G.py`, adapté au cycle 4 (découpage de `5eme.txt` aux titres « Cinquième », « Quatrième », « Troisième »). Il vérifie :
   - que chaque citation figure mot pour mot **dans la section de sa classe** ;
   - qu'aucun prérequis n'est d'un niveau postérieur ;
   - que tous les identifiants existent ;
   - qu'il n'y a ni cycle ni arête redondante.
2. **Le validateur complet**, sur une copie temporaire :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape5_dag_AB.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape5_liens_AB.json" --tout
   ```
   Il doit afficher « Validation REUSSIE ». Les seuls avertissements tolérés sur tes nœuds sont « aucun exercice » et « pas de carte mentale ». Si le validateur refuse quelque chose propre au cycle 4 (niveau, notation), **ne le modifie pas** : signale-le.

## Ce que tu ne fais jamais
Modifier quoi que ce soit sous `content\`, dans `scripts\` ou dans l'application. Tu écris uniquement les trois fichiers `etape5_*` et ton script de vérification.

## Ta réponse finale
15 lignes maximum :
- les chemins de tes fichiers ;
- le nombre de compétences par classe et par domaine ;
- le nombre d'évaluations partielles ;
- les besoins de dessin, en une ligne par générateur ;
- l'état des saisies de relatifs ;
- le résultat des vérifications ;
- les points à arbitrer, en une ligne chacun.
