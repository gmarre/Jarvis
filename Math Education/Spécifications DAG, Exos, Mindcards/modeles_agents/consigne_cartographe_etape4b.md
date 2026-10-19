# Consigne du cartographe, étape 4b (domaine G, espace et géométrie, CP à 6e)

Tu es le cartographe de MATH EDUCATION. Réponds en français, avec un ton direct et sans tirets longs.

Ta mission : proposer les nœuds du DAG du domaine **G « Espace et géométrie »**, du CP à la 6e, chacun justifié par le programme officiel. Tu ne rédiges aucun exercice.

## Le contexte
**Identifiants.** La lettre G est déjà autorisée par les schémas (A à P).
- Compétences : G001, G002…, avec `domain` : `"G"` et `domain_name` : `"Espace et géométrie"`.
- Cartes : `MM-G-01`…
- Le v1 a utilisé G001 à G044 (liste plus bas) : réutilise un identifiant quand la notion correspond, sinon prends un nouvel identifiant à partir de **G045**.
- Les compétences du v1 qui sont déjà passées dans P (périmètres, aires, volumes : G027 à G034) ne reviennent pas dans G. Elles existent dans `content\dag\P.json`.

**Les figures existent maintenant.** L'auteur d'un exercice DÉCRIT la figure en JSON, et `scripts\figures.py` la dessine.
- Types disponibles aujourd'hui : `demi_droite`, `regle`, `horloge`, `quadrillage`, `partage`, `bandes`, `monnaie`.
- Pour la géométrie, de nouveaux générateurs vont être écrits en parallèle de ton travail : points, segments, droites, polygones, cercles, angles, codages (angle droit, longueurs égales), sur fond blanc, quadrillé ou pointé.
- Pour chaque compétence, dis **quelle figure il faut**, en une ligne : ce qui doit être dessiné et ce qui doit pouvoir être marqué. Le générateur sera écrit d'après tes besoins.

**Limite de l'application.** L'élève répond par une saisie (nombre, texte court), un QCM ou un vrai/faux. Il ne peut **ni tracer, ni construire, ni mesurer à l'écran**.
- Un attendu « tracer », « construire » ou « reproduire » ne s'évalue qu'indirectement :
  - lire ou vérifier une construction déjà faite ;
  - repérer l'erreur dans un tracé ;
  - choisir parmi plusieurs figures repérées par des lettres sur une même image ;
  - compléter un programme de construction ;
  - lire une mesure sur un instrument dessiné.
- Pour chaque compétence de ce genre, dis comment elle s'évalue ici. Si l'évaluation indirecte trahit l'attendu, garde le nœud et signale-le (« évaluation partielle »).

**L'espace (solides, repérage).** Un solide se dessine mal en 2D, et un patron demande un générateur à part.
- Garde les nœuds du programme, mais classe-les : faisables avec des figures planes simples (quadrillage, repérage), ou demandant un outil de plus (perspective, patron).
- Recommande ce qui peut attendre.

## À lire avant de proposer, dans cet ordre
1. `Spécifications DAG, Exos, Mindcards\CORRECTIONS_DAG_v2.md` : la méthode (niveau d'introduction, une notion sur deux classes = deux nœuds, pas de prérequis fantôme).
2. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Le modèle de livrable de l'étape précédente :
   - `_travail\etape4a_dag_P.md` (compte rendu) ;
   - `_travail\etape4a_dag_P.json` (format des compétences) ;
   - `_travail\etape4a_liens_P.json` (format des liens vers l'existant).

   Reprends exactement ces formats et ce plan de compte rendu. Le seuil de maîtrise est `{"required": 3, "out_of": 4}`.
4. Le DAG existant, fusionné : `Spécifications DAG, Exos, Mindcards\content\dag\A.json`, `B.json`, `C.json`, `D.json`, `E.json`, `P.json` (120 compétences). Tes prérequis viennent de là ou de ta proposition.
   - Ce qui touche déjà à la géométrie est dans P : longueurs et mesure à la règle (P001…), périmètres, aires, volumes. **Ne les duplique pas.**
   - Si des nœuds de P doivent dépendre des tiens (par exemple le périmètre d'un polygone ← reconnaître le polygone), propose le lien dans le fichier de liens.
5. `scripts\figures.py` : les types existants, pour savoir ce qui se dessine déjà.
6. Le v1, pour mémoire, dans `Spécifications DAG, Exos, Mindcards\skills_dag.json` (G001 à G044) : point, segment, droite, milieu, angles, parallèles, perpendiculaires, triangles, quadrilatères, cercle, symétrie axiale… Ses niveaux sont souvent faux. Recale-les sur le programme, et donne la table de correspondance v1 → G.
7. Le programme officiel, en texte, avec les parties « Espace et géométrie » comme source principale :
   - `_travail\programmes\ce1-ce2-cp.txt` (cycle 2) ;
   - `_travail\programmes\6eme-cm1-cm2.txt` (cycle 3).

   Regarde `5eme.txt` seulement pour savoir ce qui est reporté au-delà de la 6e.
   - Les **angles** (comparer, angle droit, mesurer en degrés) sont dans le programme « Grandeurs et mesures » du cycle 3. Ils viennent dans G, car ils exigent des figures. Cite-les depuis leur vraie rubrique.

## Le périmètre
**Dedans :**
- repérage et orientation (plan, quadrillage, coordonnées de cases) ;
- solides usuels (reconnaître, nommer, décrire) ;
- figures planes (carré, rectangle, triangles particuliers, losange, cercle) ;
- vocabulaire (point, segment, droite, milieu, sommet, côté) ;
- alignement ;
- perpendiculaires et parallèles ;
- symétrie axiale ;
- programmes de construction (lecture) ;
- angles ;
- reproduction et construction (évaluation indirecte).

**Dehors :**
- tout ce qui est au-delà de la 6e (symétrie centrale, Pythagore, Thalès…) ;
- les longueurs, périmètres, aires et volumes (déjà dans P) ;
- la programmation (Scratch), sauf un nœud de lecture de déplacements si le programme l'impose et qu'il s'évalue.

Vise **22 à 30 compétences** du CP à la 6e, moins si le programme ne le justifie pas.

## Ce que tu produis
1. **`_travail\etape4b_dag_G.json`** : un tableau de compétences au format de `etape4a_dag_P.json`, avec `exercise_ids: []` et `mindmap_id: null`.
   - Le champ `programme_ref` contient des citations **exactes**, copiées du texte du programme, avec leur source (cycle, classe, rubrique).
   - La première citation est au niveau de la compétence, et aucune ne vient d'une classe postérieure.
2. **`_travail\etape4b_liens_G.json`** : les prérequis à ajouter à des compétences existantes (P…, B…), chacun avec sa raison. Tableau vide sinon.
3. **`_travail\etape4b_dag_G.md`** : le compte rendu, sur le plan de `etape4a_dag_P.md` :
   - les compétences, en tableau avec deux colonnes de plus :
     - « Figure » : ce qu'il faut dessiner ;
     - « Évaluation » : directe, ou partielle avec une explication en 1 ligne ;
   - le constat central ;
   - la correspondance avec le v1 ;
   - les liens vers l'existant ;
   - **la liste des besoins de dessin**, regroupés par générateur (ce que chaque générateur doit savoir tracer et marquer) ;
   - le découpage en **cartes mentales** de 4 à 8 compétences ;
   - les **points à arbitrer**, numérotés, chacun avec ta recommandation.

## Vérifications obligatoires avant de rendre
Python du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. **Un script `_travail\verif_etape4b_dag_G.py`**, sur le modèle de `_travail\verif_etape4a_dag_P.py` (ou de `verif_etape3_dag_E.py`). Il vérifie :
   - que chaque citation figure mot pour mot **dans la section de sa classe** ;
   - qu'aucun prérequis n'est d'un niveau postérieur ;
   - que tous les identifiants existent ;
   - qu'il n'y a ni cycle ni arête redondante.
2. **Le validateur complet**, sur une copie temporaire :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4b_dag_G.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4b_liens_G.json" --tout
   ```
   Il doit afficher « Validation REUSSIE ». Les seuls avertissements tolérés sur G sont « aucun exercice » et « pas de carte mentale ». Si le validateur refuse quelque chose propre à G, **ne le modifie pas** : signale-le.

## Ce que tu ne fais jamais
Modifier quoi que ce soit sous `content\`, dans `scripts\` ou dans l'application. Tu écris uniquement les trois fichiers `etape4b_*` et ton script de vérification.

## Ta réponse finale
15 lignes maximum :
- les chemins de tes fichiers ;
- le nombre de compétences par classe ;
- le nombre d'évaluations partielles ;
- les besoins de dessin, en une ligne par générateur ;
- le résultat des vérifications ;
- les points à arbitrer, en une ligne chacun.
