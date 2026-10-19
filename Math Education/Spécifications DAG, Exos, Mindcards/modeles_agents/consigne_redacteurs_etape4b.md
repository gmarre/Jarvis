# Consigne commune aux rédacteurs, étape 4b (domaine G, espace et géométrie, CP à 6e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français.

## À lire avant d'écrire, dans cet ordre
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : ta définition complète, qui prime sur tout. Lis en particulier :
   - la **règle zéro** ;
   - la **règle du champ numérique** ;
   - les **sixième et septième règles** ;
   - le **format de sortie**.
2. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Tes compétences, dans `_travail\etape4b_dag_G.json` (proposées, pas encore dans la banque) : `label`, `description`, `school_level`, `validation_test`, `prerequisites`, `programme_ref`.
   - **Le compte rendu du cartographe, `_travail\etape4b_dag_G.md`, est à lire en entier.** Il dit pour chaque compétence ce qu'il faut dessiner et comment elle s'évalue (colonnes « Figure » et « Évaluation »), et fixe ce qui est enseigné à chaque classe (constat central).
   - Les compétences ont été **renumérotées G001 à G030** (voir la section « Renumérotation » en tête du compte rendu). Dans le compte rendu, « v1 G0xx » désigne l'ancienne version.
   - Les compétences existantes sont dans `Spécifications DAG, Exos, Mindcards\content\dag\*.json`.
4. **`scripts\figures.py` en entier.** Toutes les figures passent par lui : lis la docstring de chaque générateur. Pour cette étape :
   - `geometrie` : points, segments, droites, demi-droites, polygones, cercles et disques, angles avec arcs simples ou doubles et mesures, angles droits codés, longueurs codées égales ou écrites, textes libres (numéros de figures) ; fond blanc, quadrillé ou pointé ;
   - `rapporteur` : un angle posé sur un rapporteur, premier côté à droite ou à gauche, pose fautive possible ;
   - `quadrillage` : cases coloriées, axe de symétrie, points aux nœuds, lettres dans les cases, robot orienté, chemin ;
   - `solide` : cube, pavé, pyramides, prismes, cylindre, cône, boule en perspective cavalière ;
   - `cubes` : assemblage décrit par la hauteur de chaque colonne ;
   - `regle` : segment posé sur une règle.

   Si un dessin indispensable manque, **ne le contourne pas** : signale-le dans ta réponse finale.
5. La consigne des figures de l'étape précédente : `_travail\brief_figures.md`. **Toutes ses règles s'appliquent ici** :
   - figure indispensable ;
   - « sans lire la graduation », c'est-à-dire ici sans lire la figure ;
   - test de substitution ;
   - `alt` neutre ;
   - réponses en liste ;
   - format des descriptions ;
   - une figure par exercice.
6. Le style des exercices déjà relus : `content\exercices\P\P001.json`, `P017.json` (exercices à figure) et `content\figures\` (descriptions).
7. Le programme officiel, en texte : `_travail\programmes\ce1-ce2-cp.txt` et `_travail\programmes\6eme-cm1-cm2.txt`. Chaque `programme_ref` d'exercice cite un attendu qui existe, à un niveau égal ou inférieur à celui de la compétence.

## Ce que tu produis
1. **`_travail\lot_etape4b_<ton lot>.json`** : 6 exercices par compétence (2 `decouverte`, 2 `entrainement`, 2 `maitrise`), avec les identifiants `EX-<compétence>-<D|E|M>-01` et `-02`, et `review_status: "brouillon"`.
2. **`_travail\figures_4b_<ton lot>\`** : une description `<id de l'exercice>.json` par figure, au format `{"type": ..., "params": {...}, "alt": "..."}`. L'exercice y renvoie par `"image": "figures/<id>"`.

## L'élève ne trace pas : évaluer indirectement (bloquant)
L'élève répond par une saisie, un QCM ou un vrai/faux. Il ne trace, ne plie, ne mesure rien à l'écran. Pour un attendu « tracer », « construire », « compléter », « reproduire », emploie l'un de ces cinq modes :
1. **lire** une construction faite (« Quel point est le milieu du segment [AB] ? ») ;
2. **vérifier** (« Léo a tracé la droite perpendiculaire à (d) passant par A. A-t-il raison ? ») ;
3. **repérer l'erreur** dans un tracé ou une pose d'instrument ;
4. **choisir** parmi plusieurs figures ou points repérés par des lettres ou des numéros **sur une même image** (les propositions d'un QCM sont du texte : « A », « B », « C ») ;
5. **compléter** un programme de construction (le mot ou la mesure qui manque).

**Règles tirées des relectures :**
- dans un exercice « vérifier », l'affirmation porte sur **la figure** (« Cet assemblage est un patron », « Ce point est le milieu »), jamais sur une règle générale dont le défaut se voit sans regarder (« 6 carrés, donc c'est un patron ») ;
  - sans « donc », « car » ni « même si » : une justification jointe, vraie ou fausse, souffle la réponse ;
  - le test de substitution s'applique aussi aux vrai/faux : une autre figure doit pouvoir rendre l'affirmation vraie (ou fausse) ;
- dans un QCM dont les propositions désignent des lettres de la figure, la clé et la lettre coïncident : a « La case A », b « La case B »… (un élève qui veut la case C clique sur « c »).
  - l'application affiche la clé en majuscule dans une pastille (A, B, C) : si les choix désignent des objets de la figure (cercles, droites, figures numérotées), les points de la figure ne s'appellent pas A, B, C, D ;
- au cycle 2, le carré n'est jamais classé parmi les rectangles : carré et rectangle sont deux catégories jusqu'à la référence aux définitions (G018, CM1) ;
- le corrigé ne cite pas un instrument que l'élève n'a pas : sur écran, son gabarit d'angle droit est le coin d'une feuille posé sur l'écran, et l'indice l'y invite pour un angle droit penché.

Pour les 8 compétences à évaluation partielle (G004, G005, G006, G007, G011, G014, G021, G024), varie les modes. Ne fais jamais semblant que l'élève a construit.

## Des figures qui disent vrai (bloquant)
- **Calcule tout depuis les coordonnées**, jamais à l'œil : longueurs, milieux, alignements, angles droits, parallélisme, symétriques, mesures d'angles, nombre de cubes.
- Le générateur refuse déjà :
  - un angle codé droit qui ne l'est pas ;
  - des segments codés égaux qui ne le sont pas ;
  - un angle presque droit (75 à 105 degrés sans l'être) ;
  - trois points presque alignés.

  Un angle « non droit » doit donc se voir comme tel. `presque_droit_autorise` ne sert que si l'exercice ne porte pas sur l'angle droit ; justifie-le alors dans ta réponse finale.
- **Une seule bonne réponse sur la figure** : un seul point candidat est le bon, une seule figure est un carré, une seule droite est perpendiculaire.
- **Assemblages de cubes** : un cube caché ne compte que s'il est **forcément** là, parce qu'il porte un cube visible.
  - Dis-le dans l'énoncé (« Aucun cube ne manque à l'intérieur »), ou pose une question qui ne dépend pas des cubes cachés.
  - Le corrigé explique les cubes cachés.
- **`alt` neutre** : il ne nomme ni le solide, ni la figure, ni la propriété demandée (« Solide en perspective », « Figure de géométrie avec les points A, B, C »). Le générateur en fournit un par défaut, qui convient.
- **Lisibilité** : regarde chaque figure à 360 px de large. Lettres lisibles, aucun chevauchement, pas plus de 4 figures candidates par image.

## Ce que le programme impose, classe par classe (bloquant, en partie contrôlé par le validateur)
- **Pas de définition formelle au cycle 2** : « Les concepts généraux de la géométrie plane (droite, point, segment) sont introduits en situation, sans faire l'objet de définitions formelles. »
- **Les angles, sans mesure avant le CM2.**
  - Au CE1, aigu ou obtus se décide par comparaison avec l'angle droit (équerre).
  - Au CM1, on compare des angles sans les mesurer.
  - Au CM2, le degré se construit à partir de l'angle droit (90°, moitié 45°, tiers 30°…).
  - Le **rapporteur** n'arrive qu'en 6e : le mot est **interdit avant la 6e** (validateur).
- **Le symbole du degré (°)** est une notation contrôlée : seulement dans les compétences qui descendent de G022 (le degré, CM2).
- **Notations [AB], (AB), [AB)** : avant la 6e, toujours avec le nom de l'objet (« le segment [AB] », « la droite (AB) ») ; jamais la notation seule (validateur). En 6e, la notation seule est permise.
- **Pas de coordonnées de cases (« B3 »)** : le repère arrive en 5e. Désigne les cases par des lettres posées dessus (`lettres` du quadrillage) ou par un déplacement.
- **Longueurs** : la mesure à la règle est dans P (P001). Ici, une longueur se lit sur la figure (`longueur`) ou dans l'énoncé, et sert à raisonner (milieu, rayon, côtés égaux).
- **Plafond de mots des énoncés** : CP 15, CE1 20, CE2 25, CM1, CM2 et 6e 30 mots en moyenne.
- **Les étapes annexes d'un problème n'emploient que des opérations couvertes par les prérequis** de la compétence (exemple : 180 − 65 en 6e, la moitié d'un angle droit au CM2). Remonte la chaîne dans le DAG fusionné.

## Erreurs classiques à exploiter dans les distracteurs
Ce sont des misconceptions réelles :
- **angles** :
  - juger un angle par la longueur de ses côtés ou la taille de l'arc ;
  - croire qu'un angle droit doit avoir un côté horizontal ;
- **figures** :
  - un carré « posé sur la pointe » qui ne serait plus un carré ;
  - un carré qui ne serait pas un rectangle ;
  - un losange confondu avec un carré ;
- **droites** :
  - des droites qui ne se coupent pas « sur le dessin » et seraient parallèles ;
  - des droites perpendiculaires seulement si elles sont verticale et horizontale ;
- **cercle et symétrie** :
  - confondre rayon et diamètre ;
  - prendre le symétrique par translation au lieu du retournement ;
- **solides et assemblages** :
  - compter les arêtes ou les faces visibles seulement ;
  - oublier les cubes cachés ;
- **rapporteur** :
  - lire la mauvaise graduation ;
  - mal placer le centre ;
- **déplacements** : confondre la gauche et la droite du robot avec celles de l'élève.

## Vérifications obligatoires avant de rendre
Python du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.

1. **Un script jetable `_travail\verif_lot_etape4b_<ton lot>.py`.** Pour chaque exercice, il :
   - lit SA description de figure ;
   - recalcule la réponse depuis les `params` (Fraction, jamais de flottants pour les égalités) et la compare à `answer.value` ;
   - recalcule chaque distracteur depuis son erreur ;
   - fait le **test de substitution** : changer un paramètre change la bonne réponse ;
   - vérifie que l'énoncé ne donne pas ce que la figure montre, et que l'`alt` ne donne pas la réponse ;
   - contrôle le champ numérique, le plafond de mots, et l'absence de caractère de contrôle.
2. **Rejoue les saisies plausibles contre la vraie correction** : `Math_Edu_Application\supabase\functions\_shared\correction.ts`, transpilé et lancé sous node (des scripts du lot figures font déjà ce travail : `_travail\review_F1_saisie.cjs`).
3. **Rends tes figures et REGARDE-LES**, comme dans `brief_figures.md` :
   - `python scripts\figures.py apercu _travail\figures_4b_<ton lot> _travail\apercu_4b_<ton lot>` ;
   - puis une planche PNG à 360 px de large ;
   - ouvre-la avec l'outil Read.
4. **Le validateur**, sur une copie temporaire :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4b_dag_G.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4b_liens_G.json" --exercises <ton lot> --figures <ton dossier de figures>
   ```
   Il doit afficher « Validation REUSSIE », sans avertissement sur tes identifiants, à part l'absence de carte mentale.

## Ce que tu ne fais jamais
Tu ne modifies rien :
- sous `content\` ;
- dans les fichiers `etape4b_*` du cartographe ;
- dans `scripts\` ;
- dans l'application.

## Ta réponse finale
10 lignes maximum :
- les chemins du lot et du dossier de figures ;
- le nombre d'exercices par compétence ;
- le résultat des vérifications ;
- ce que tu as vu sur la planche ;
- les difficultés à trancher (dessin manquant compris).
