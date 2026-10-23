# Consigne du rédacteur des cartes mentales, étape 9 (proportionnalité du cycle 4 et fonctions, 5e à 3e)

Tu rédiges des cartes mentales de l'étape 9 de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Les cartes (exercices relus et fusionnés)
| Carte | Titre | Compétences | Classes | Rédacteur | Fichier |
|---|---|---|---|---|---|
| MM-E-05 | Rapports, ratios, quatrième proportionnelle, partage | E001, E002, E005, E040 | 4e | R1 | `_travail\etape9_mm_R1.json` |
| MM-E-06 | Pourcentages : calculer, coefficient multiplicateur, évolutions | E039, E016, E013 | 4e, 3e (sections titrées par classe) | R1 | idem |
| MM-E-04 | **Carte existante**, à compléter d'une branche pour E038 (échelle de 5e) | E034, E035, E007, E023 **+ E038** | 5e | R1 | `_travail\etape9_mm_E04.json` |
| MM-J-01 | Une grandeur en fonction d'une autre : tableau, formule, graphique | J036, J037, J038, J039, J040 | 5e | R2 | `_travail\etape9_mm_R2.json` |
| MM-J-02 | Formule et graphique d'une grandeur en fonction d'une autre | J041, J042 | 4e | R2 | idem |
| MM-J-03 | Fonctions : image, antécédents, fonction carré | J001, J002, J004, J008 | 3e | R3 | `_travail\etape9_mm_R3.json` |
| MM-J-04 | Fonctions linéaires et affines | J006, J005, J043, J044, J045 | 3e | R3 | idem |

**MM-E-04 (R1)** : la fusion refuse une carte qui existe. Tu livres la carte **entière** (lue dans `content\cartes\`), sans rien changer à ses branches actuelles, avec la branche de E038 ajoutée et E038 dans sa liste de compétences, dans `_travail\etape9_mm_E04.json` (même format que `content\cartes\`) ; le chef de projet la remplacera à la main.

Ton rôle (R1 à R3) est dans ton message de lancement.

## À lire avant d'écrire
1. **La consigne des cartes de l'étape 6, `Spécifications DAG, Exos, Mindcards\modeles_agents\archive\consigne_cartes_etape6.md`, en entier**, et celle de l'étape 5 qu'elle cite : format, règles, leçons des relectures, vérifications et interdits s'appliquent tous.
2. **La consigne des cartes de l'étape 8, `modeles_agents\archive\consigne_cartes_etape8.md`** : ses « choix validés » et ses « leçons des relectures R1 à R5 » valent ici (énoncé général testé contre toutes les configurations des exercices, opérations dans la chaîne, couples lus aussi dans les descriptions et les calculs). Modèle le plus récent : `_travail\archive\etape8_mm_R1.json` et son script `_travail\archive\verif_mm_8_R1.py`.
3. Le découpage des cartes : section 8 de `_travail\archive\etape9_dag_EJ.md`, et les sections 6 (vocabulaire) et 7 (saisie).
4. Tes compétences dans `Spécifications DAG, Exos, Mindcards\content\dag\E.json` et `J.json` (descriptions, tests de validation), et leurs **exercices fusionnés** dans `content\exercices\E\` et `content\exercices\J\`, avec leurs figures dans `content\figures\`.
5. `_travail\brief_etape9.md` : vocabulaire, saisie, erreurs classiques.

## Règles propres à l'étape 9 (bloquant)
- **Vocabulaire par branche, contrôlé par le validateur** : « ratio » à partir de E001, « quatrième proportionnelle » à partir de E005, « coefficient multiplicateur » à partir de E016 ; « fonction » comme nom, « image de » un nombre, « antécédent », f(x), x ↦ à partir de J001 ; 𝒞f à partir de J004 ; « fonction linéaire », « affine », « carré » à partir de J006, J005, J008 ; « ordonnée à l'origine », « coefficient directeur » à partir de J043. En 5e et 4e : « en fonction de », « formule », « tableau de valeurs », « graphique ». **« Produit en croix » jamais** : « égalité des rapports ».
- **Pas de figure dans une carte** : un graphique se décrit en une phrase (« une droite qui passe par l'origine »), jamais par une liste de coordonnées reprise d'un exercice.
- **Aucun couple de données** d'un exercice, d'un corrigé, d'un indice, d'un test ou d'une figure (coordonnées, tableaux) de la même carte.
- **Erreurs à éviter** : reprends celles de `brief_etape9.md` qui concernent la branche (modèle additif, ratio inversé, pourcentages successifs ajoutés, image et antécédent confondus, a et b inversés, un seul antécédent pour la fonction carré). Formule : « Erreur à éviter : … ; c'est **faux**, … ».

## Vérifications obligatoires
Python : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. Un script `_travail\verif_mm_9_<R1|R2|R3>.py` sur le modèle de `verif_mm_8_R1.py` : structure, vocabulaire contrôlé, KaTeX, recalcul de chaque égalité (Fraction), lignes « Erreur à éviter », **aucun couple de données** repris.
2. Rendu KaTeX, sur le modèle de `_travail\archive\verif_mm_8_R1_katex.cjs` : aucune formule ne lève d'erreur.
3. Le validateur : `python scripts\check_lot.py --mindmaps <ton fichier>`. « Validation REUSSIE » attendu, sans avertissement de carte manquante sur tes compétences.

## Ce que tu ne fais jamais
Modifier quoi que ce soit hors de tes fichiers de cartes et de tes scripts `_travail\verif_mm_9_*`. Aucun commit.

## Ta réponse finale
8 lignes maximum : le fichier, le nombre de lignes par carte, le résultat des vérifications, ce qui reste à trancher.
