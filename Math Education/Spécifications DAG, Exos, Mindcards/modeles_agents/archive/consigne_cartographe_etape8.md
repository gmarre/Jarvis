# Consigne des cartographes, étape 8 (géométrie et grandeurs du cycle 4, 5e à 3e)

Tu es cartographe de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs. Tu proposes des nœuds du DAG, chacun justifié par le programme officiel. Tu ne rédiges aucun exercice.

L'étape 8 est coupée en deux, comme l'étape 4 ; ton rôle (8a ou 8b) est dans ton message de lancement.

| Rôle | Périmètre | Domaines et identifiants | Fichiers |
|---|---|---|---|
| **8a** | Géométrie plane du cycle 4 : symétrie centrale, parallélogramme (propriétés, reconnaissance), angles et parallélisme (alternes-internes, correspondants, somme des angles d'un triangle), triangles égaux, triangles semblables, Pythagore et sa réciproque, Thalès et sa réciproque, trigonométrie du triangle rectangle, translation, rotation, homothétie, démonstration courte | G, de G031 à G069 (reprends un identifiant du v1 quand la notion correspond et qu'il est libre) | `_travail\etape8a_dag_G.json`, `etape8a_liens_G.json`, `etape8a_dag_G.md`, `verif_etape8a_dag_G.py` |
| **8b** | Espace et repérage : solides du cycle 4 (pyramide, cône, boule), sphère et sections planes, repérage sur un pavé droit et sur la sphère (latitude, longitude), repère du plan s'il manque quelque chose après l'étape 5. Grandeurs du cycle 4 : aires et volumes (pyramide, cône, boule), conversions de volumes et de contenances, grandeurs composées (vitesse, débit, masse volumique si le programme la cite), agrandissement et réduction (effet sur longueurs, aires, volumes) | G de G070 à G089 pour l'espace ; P à partir de P028 pour les grandeurs | `_travail\etape8b_dag_GP.json`, `etape8b_liens_GP.json`, `etape8b_dag_GP.md`, `verif_etape8b_dag_GP.py` |

Une notion à la frontière (l'agrandissement-réduction touche l'homothétie, la vitesse touche la proportionnalité) : 8b la prend pour les grandeurs, 8a pour la transformation. Si tu as besoin d'un nœud de l'autre rôle comme prérequis, cite-le par son intitulé dans ton compte rendu, sans identifiant : le chef de projet raccordera.

## Le contexte
- **Modèle** : lis en entier la consigne du cartographe de l'étape 5, `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_cartographe_etape5.md`. Ses règles, ses formats, ses vérifications et ses interdits s'appliquent ici.
- Lis `_travail\brief_cartographe_etape7.md` et le compte rendu `_travail\etape7_dag_F.md` (forme du compte rendu, arbitrages, leçons), puis `_travail\etape4b_dag_G.md` (géométrie du cycle 3, figures).
- **Leçon des étapes 5 à 7** : les relecteurs trouvent des prérequis manquants dès qu'un corrigé emploie une opération hors chaîne (racine carrée pour Pythagore, quotient et produit en croix pour Thalès, fractions, puissances pour les volumes, π). Pour chaque nœud, remonte la chaîne et vérifie que tout calcul qu'un corrigé fera y figure.
- **Ce qui existe déjà** (`Spécifications DAG, Exos, Mindcards\content\dag\*.json`, 227 compétences) : géométrie et grandeurs jusqu'à la 6e (G001 à G030, P001 à P027), relatifs et repérage (A, B), fractions (C), puissances et racine carrée (A029 à A040), calcul littéral et équations (F), proportionnalité du cycle 3 (E). Ne les duplique pas : propose des liens. La proportionnalité du cycle 4 et les fonctions sont à l'étape 9 : n'en fais pas de nœud, mais signale ceux dont tu aurais besoin.
- **Hors périmètre** : l'algorithmique (Scratch), les fonctions, les statistiques.

## Les figures (point central de cette étape)
Presque tout exercice de géométrie demande une figure. Lis `scripts\figures.py` (générateurs `geometrie`, `repere`, `solide`, `rapporteur`, `quadrillage`) et les figures des lots `_travail\figures_*` de l'étape 4b. Pour chaque nœud :
- dis si les figures existantes suffisent ;
- sinon décris précisément ce qui manque (exemples : codage des angles égaux, image d'une figure par une transformation, triangle rectangle avec angle marqué, configuration de Thalès en papillon, patron, section d'un cône, sphère avec parallèles et méridiens), en séparant l'indispensable du confortable.
- Une figure ne doit jamais donner la réponse (texte alternatif compris).

## La saisie
L'élève répond par un nombre (avec unité), un texte court, un QCM ou un vrai/faux ; la correction lit aussi les expressions (`answer.forme`, voir `_travail\brief_etape7.md`). Une démonstration rédigée n'est pas lisible : découpe-la en étapes vérifiables (QCM sur la propriété utilisée, valeur calculée) et signale une **évaluation partielle** quand l'attendu ne se saisit pas. Les valeurs approchées (trigonométrie, π, racines) demandent une précision et une tolérance : dis lesquelles.

## À lire, programme
- **Source principale : `_travail\programmes\5eme.txt`**, découpé par classe (Cinquième, Quatrième, Troisième). Une citation vient de la section de sa classe.
- `_travail\programmes\3eme-4eme.txt`, seulement si une notion manque dans `5eme.txt`, et dis-le.

Vise **18 à 30 compétences** pour 8a, **12 à 22** pour 8b, moins si le programme ne le justifie pas.

## Ce que tu produis
Tes quatre fichiers (tableau ci-dessus). Le compte rendu suit le plan de `etape7_dag_F.md`, avec en plus :
- la section « **Figures** » (existantes, à créer indispensables, confortables) ;
- la correspondance avec le v1 (`Spécifications DAG, Exos, Mindcards\skills_dag.json`) ;
- le découpage en cartes mentales (`MM-G-…`, `MM-P-…` : prends les numéros suivant les cartes existantes de `content\cartes\`) ;
- les **points à arbitrer**, numérotés, chacun avec ta recommandation.

Vérifications :
1. ton script ;
2. puis `python scripts\check_lot.py --skills <ton json> --links <tes liens> --tout` (Python du venv : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`) : « Validation REUSSIE » attendu.

Si le validateur refuse quelque chose, ne le modifie pas : signale-le précisément. Ne modifie rien d'autre que tes fichiers, et ne fais aucun commit.

Réponse finale en 15 lignes maximum : les fichiers ; les compétences par classe ; les évaluations partielles ; les besoins de figures (indispensables d'abord) ; le résultat des vérifications ; les points à arbitrer, en une ligne chacun.
