# Consigne du rédacteur des cartes mentales, étape 5 (relatifs et arithmétique, 5e à 3e)

Tu rédiges les 5 cartes mentales de l'étape 5 de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Les cartes (découpage arrêté par le cartographe, section 7 de `_travail\etape5_dag_AB.md`)
| Carte | Compétences | Classes |
|---|---|---|
| MM-A-03 | A018, A019, A020, A021, A022, A023 | 5e |
| MM-A-04 | A015, A016, A017 | 5e |
| MM-A-05 | A024, A025 | 3e |
| MM-B-05 | B044, B045, B046, B047, B048 | 5e |
| MM-B-06 | B011, B049, B050, B051 | 5e, 4e |

## À lire avant d'écrire
1. **Le modèle de format** : deux cartes relues, `Spécifications DAG, Exos, Mindcards\content\cartes\MM-D-02.json` et `MM-G-06.json` ; le schéma `Spécifications DAG, Exos, Mindcards\schemas\mindmaps.schema.json`. Le livrable de l'étape précédente : `_travail\etape4b_mm_G.json`.
2. **Les leçons de la relecture des cartes de l'étape 4b**, `_travail\rapport_relecture_etape4b_cartes.md`, en entier : elles s'appliquent ici.
3. Les compétences : `_travail\etape5_dag_AB.json` et le compte rendu `_travail\etape5_dag_AB.md` (en particulier « Décisions de Gauthier » et l'ajout de fin de fichier).
4. Les exercices relus de chaque carte : `_travail\lot_etape5_L1.json` à `lot_etape5_L4.json`, et leurs figures dans `_travail\figures_5_L2\`, `figures_5_L3\`, `figures_5_L4\`.
5. La consigne des rédacteurs, `_travail\brief_etape5.md`, section « Écrire les nombres relatifs » : elle vaut aussi pour les cartes.

## Ce que tu produis
**`_travail\etape5_mm_AB.json`** : un tableau de 5 cartes au format de `etape4b_mm_G.json`, `review_status: "brouillon"`, `skill_ids` dans l'ordre de la progression, `school_levels` de la plus petite à la plus grande classe, titre avec les classes extrêmes, `programme_ref` en citations exactes.

## Règles (bloquant)
- **Un seul titre `#`**, une branche `##` par compétence, étiquetée de sa classe (« (5e) »).
- **Une carte se lit avant les exercices** : elle donne la méthode, pas les réponses. **Aucun couple de données repris d'un exercice de la même carte** (énoncé, réponse, propositions, textes visibles de ses figures), ni d'un `validation_test`. Compare chaque exemple à chaque exercice et à chaque figure : une figure d'exercice décrite en mots dans la carte donne la réponse.
- **Écriture des relatifs** : dans les formules KaTeX, `$-3$` ; hors formule, le signe « − ». Virgule décimale `{,}` dans les formules. Jamais |x| ; « distance à zéro ». Aucune puissance (avant l'étape 6) : la décomposition s'écrit « 2 × 2 × 3 × 5 ».
- **Rien au-dessus de la classe de la branche** : pas de multiplication de relatifs avant la 4e ; pas de « > » ou « < » si A006 n'est pas dans la chaîne (pour MM-A-05 en particulier, vérifie).
- Les **erreurs à éviter** s'écrivent « Erreur à éviter : … ; c'est **faux**, … » et reprennent les erreurs classiques de la consigne des rédacteurs (ordre des négatifs, addition des distances à zéro, oubli de l'opposé, inversion abscisse ordonnée, 1 cru premier, facteur non premier, calcul de gauche à droite).
- Chaque égalité est juste : recalcule-la.
- **Leçons de la relecture de l'étape 5** :
  - un nombre formé par un énoncé à trou et une proposition de QCM (« 4■ » et « 9 » donnent 49) est une donnée de l'exercice : ne l'emploie pas en exemple ;
  - une ligne « Erreur à éviter » ne paraphrase jamais l'énoncé d'un vrai/faux de la même carte : elle donnerait la réponse ;
  - « graduation » désigne un trait ; pour compter, on parle d'**intervalles** ;
  - contrôle des couples (reprise pilote, 20 octobre 2026) : comparer aussi les corrigés, les indices et la géométrie des figures (nombre d'intervalles) ; une fraction a/b compte comme **une seule** donnée et les paires de fractions ne sont jamais exemptées ; aucune exemption pour un couple présent dans l'énoncé, la réponse, les propositions ou la figure du même exercice ; « un chiffre et sa valeur » n'est exempté que pour (c ; c × 10, 100 ou 1 000) ;
  - une règle qui s'appuie sur une définition de la carte reste vraie avec elle (si 0 est positif et négatif, « négatif < positif » devient « strictement négatif < positif »).
- Chaque compétence de la carte a au moins une ligne de méthode et un exemple.

## Vérifications obligatoires
Python : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. **Un script `_travail\verif_mm_AB.py`**, sur le modèle de `_travail\verif_mm_G.py` : structure, vocabulaire contrôlé, KaTeX (nombre pair de `$`, virgule `{,}`, aucune commande sans antislash), recalcul de chaque égalité (Fraction), lignes « Erreur à éviter », et **aucun couple de données** d'un exercice ou d'un test de la même carte parmi les nombres d'une même ligne.
2. **Rendu KaTeX** : sur le modèle de `_travail\review_etape4b_mm_katex.cjs`, rends chaque formule avec KaTeX (le paquet est dans `Math_Edu_Application\node_modules`) et vérifie qu'aucune ne lève d'erreur.
3. **Le validateur** :
   ```
   python scripts\check_lot.py --skills _travail\etape5_dag_AB.json --links _travail\etape5_liens_AB.json --exercises <les 4 lots fusionnés dans une copie temporaire> --mindmaps _travail\etape5_mm_AB.json
   ```
   « Validation REUSSIE » attendu, sans avertissement de carte manquante sur les 20 compétences.

## Ce que tu ne fais jamais
Modifier quoi que ce soit hors de `_travail\etape5_mm_AB.json` et de tes scripts `_travail\verif_mm_AB*`. Aucun commit.

## Ta réponse finale
8 lignes maximum : le fichier, le nombre de lignes par carte, le résultat des vérifications, ce qui reste à trancher.
