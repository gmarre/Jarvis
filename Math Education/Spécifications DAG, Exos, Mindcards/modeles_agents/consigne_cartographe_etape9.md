# Consigne du cartographe, étape 9 (proportionnalité du cycle 4 et fonctions, 5e à 3e)

Tu es cartographe de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs. Tu proposes des nœuds du DAG, chacun justifié par le programme officiel. Tu ne rédiges aucun exercice.

| Périmètre | Domaines et identifiants | Fichiers |
|---|---|---|
| Proportionnalité du cycle 4 : coefficient et tableau (ce qui manque après E034 à E037 et E023), ratio et rapports, quatrième proportionnelle, pourcentages (évolution, coefficient multiplicateur), partage proportionnel, échelles du cycle 4, lien entre graphique de proportionnalité et Thalès. Fonctions : « en fonction de », tableau de valeurs, graphique cartésien (courbe, nuage de points), formule, programme de calcul remonté, image et antécédents, fonctions linéaires, affines, coefficients lus sur le graphique, résolution graphique, fonction carré | **E** : reprends un identifiant du v1 quand la notion correspond et qu'il est libre (E011 à E018 le sont), sinon à partir de E038. **J** (nouveau domaine « Fonctions ») : reprends J001 à J008 du v1 quand la notion correspond (le niveau du v1 est souvent faux : corrige-le d'après le programme), sinon à partir de J036 | `_travail\etape9_dag_EJ.json`, `etape9_liens_EJ.json`, `etape9_dag_EJ.md`, `verif_etape9_dag_EJ.py` |

## Le contexte
- **Modèle** : lis en entier la consigne du cartographe de l'étape 5, `Spécifications DAG, Exos, Mindcards\modeles_agents\archive\consigne_cartographe_etape5.md` (règles, formats, vérifications, interdits), puis la consigne de l'étape 8, `modeles_agents\archive\consigne_cartographe_etape8.md`, pour ce qui a changé depuis.
- **Forme du compte rendu** : `_travail\archive\etape8b_dag_GP.md` (le plus récent) ; pour un domaine algébrique, `_travail\archive\etape7_dag_F.md`.
- **Leçon des étapes 5 à 8** : un corrigé qui emploie une opération hors de la chaîne est la première cause de prérequis manquants (division de fraction C017, produit en croix, pourcentages, relatifs, résolution d'équation, puissances, trapèze ou retenues hors chaîne à l'étape 8). Pour chaque nœud, remonte la chaîne et vérifie que tout calcul qu'un corrigé fera y figure.
- **Ce qui existe déjà** (`Spécifications DAG, Exos, Mindcards\content\dag\*.json`, 273 compétences) : proportionnalité du cycle 3 et de 5e (E003 à E037, dont coefficient E034, tableau E035, graphique E023, pourcentages E036 et E037, vitesse E007), grandeurs quotients (P036, P037), Thalès (G042, G043), repère du plan et relatifs (domaine A, étape 5), calcul littéral et équations, programme de calcul (B054, F), fractions (C). Ne les duplique pas : propose des liens, y compris de nœuds existants vers les tiens si un nœud existant emploie une notion de l'étape 9.
- **Hors périmètre** : l'algorithmique (Scratch), les statistiques et probabilités (étape 10), la géométrie.

## Les figures
`scripts\figures.py`, générateur `repere`, sait maintenant tracer : points (avec ou sans nom, donc un nuage), droites y = ax + b, courbe de y = ax² + b, lignes brisées (graphiques de grandeurs), titres d'axes (« durée (h) »), graduations de pas différents sur chaque axe, pointillés de lecture d'image et d'antécédents (découverte et corrigé seulement). Il refuse une droite qui ne passe pas par deux nœuds du quadrillage, une lecture ou une intersection de deux courbes hors de la demi-graduation. Les tableaux de valeurs s'écrivent en KaTeX (`\begin{array}`, voir `content\exercices\E\E003.json`). Pour chaque nœud, dis si cela suffit ; sinon décris ce qui manque, en séparant l'indispensable du confortable. Une figure ne doit jamais donner la réponse (texte alternatif compris).

## La saisie
L'élève répond par un nombre (avec unité), un texte court, une expression (`answer.forme` : `expression`, `developpee`, `factorisee`, `solutions`), un QCM ou un vrai/faux. Une lecture graphique se saisit comme un nombre : dis quelle tolérance tu recommandes (aucune si la valeur tombe sur la demi-graduation, ce que le générateur impose). Une inéquation résolue graphiquement : dis comment l'élève saisirait la réponse, ou signale une **évaluation partielle**.

## Le vocabulaire et les notations par classe
Le validateur contrôle les notations par classe (`scripts\validate_content.py`). Propose, avec citation du programme, la liste des mots et notations à réserver, et à partir de quel nœud : par exemple « fonction » seul, f(x), x ↦, « image », « antécédent », « fonction linéaire », « affine », « coefficient multiplicateur », « ratio ». Je l'ajouterai au validateur avant la rédaction.

## À lire, programme
- **Source principale : `_travail\programmes\5eme.txt`**, partie « Proportionnalité, fonctions » (lignes 1033 à 1131 environ), découpée par classe (Cinquième, Quatrième, Troisième). Une citation vient de la section de sa classe, mot pour mot.
- `_travail\programmes\3eme-4eme.txt`, seulement si une notion manque dans `5eme.txt`, et dis-le.

Vise **16 à 28 compétences** en tout, moins si le programme ne le justifie pas. Deux nœuds pour une notion sur deux classes (comme à l'étape 7) quand l'attendu change vraiment d'une classe à l'autre.

## Ce que tu produis
Tes quatre fichiers (tableau ci-dessus). Le compte rendu suit le plan de `etape8b_dag_GP.md`, avec en plus :
- la section « **Figures** » (suffisantes, à créer indispensables, confortables) ;
- la section « **Vocabulaire et notations** » ci-dessus ;
- la correspondance avec le v1 (`Spécifications DAG, Exos, Mindcards\skills_dag.json`) ;
- le découpage en cartes mentales (`MM-E-…`, `MM-J-…` : prends les numéros suivant les cartes existantes de `content\cartes\`) ;
- les **points à arbitrer**, numérotés, chacun avec ta recommandation.

Vérifications :
1. ton script ;
2. puis `python scripts\check_lot.py --skills <ton json> --links <tes liens> --tout` (Python du venv : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`) : « Validation REUSSIE » attendu. La lettre J est acceptée par les schémas (`[A-P]`) ; si un contrôle refuse un domaine inconnu, signale-le sans modifier le validateur.

Si le validateur refuse quelque chose, ne le modifie pas : signale-le précisément. Ne modifie rien d'autre que tes fichiers, rien sous `content\`, `scripts\` ni dans l'application, et ne fais aucun commit.

Réponse finale en 15 lignes maximum : les fichiers ; les compétences par classe ; les évaluations partielles ; les besoins de figures (indispensables d'abord) ; le vocabulaire à contrôler ; le résultat des vérifications ; les points à arbitrer, en une ligne chacun.
