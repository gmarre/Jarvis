# Super exercices de l'étape 8 (géométrie et grandeurs du cycle 4)

La consigne générale est `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_super.md` : lis-la en entier, elle s'applique telle quelle. Ce brief ajoute le découpage et les règles propres à ces compétences.

## Les lots (un super exercice par compétence porteuse)
| Lot | Porteuses | Classes | Fichier |
|---|---|---|---|
| S8a | G038, G045, G046, G047, G048, G049, G050 | 5e | `_travail\super_S8a.json` |
| S8b | G051, G052, G053, G054, G055, G056 | 5e | `_travail\super_S8b.json` |
| S8c | G057, G058, G059, G060, G040, G041, G061 | 4e | `_travail\super_S8c.json` |
| S8d | G042, G062, G043, G063, G064, G065, G066, G067 | 3e | `_travail\super_S8d.json` |
| S8e | G070, G071, G072, P028, P029, P030, P031, P032, P033, P034 | 5e | `_travail\super_S8e.json` |
| S8f | P036, P037, G073, P035, G074, G075, G076, P038 | 4e, 3e | `_travail\super_S8f.json` |

Identifiants : `SX-<porteuse>-01`. Figures dans `_travail\figures_super_<lot>\` (format de `content\figures\`, rendues par `scripts\figures.py`).

## À lire en plus de la consigne générale
- `_travail\brief_etape8.md` en entier : règles propres à l'étape 8 (tracer jamais à l'écran, la mesure n'est pas une preuve, figure qui ne donne jamais la réponse, notations par compétence, valeurs approchées, π), erreurs classiques, et **toutes les leçons des relectures** (premières relectures et deuxième vague).
- `_travail\brief_relecture_etape8.md` : ce que la relecture contrôle.
- Les comptes rendus des cartographes, `_travail\etape8a_dag_G.md` et `_travail\etape8b_dag_GP.md` (descriptions, figures, saisie).
- Les générateurs de figures et leurs nouveaux paramètres dans `scripts\figures.py` (`geometrie` : `image`, `vecteur`, `cherche` ; `solide` : `cotes`, `hauteur`, `coupe`…), avec les exemples de `_travail\essai_figures_etape8.py`.

## Règles propres
- **Toutes les compétences des questions sont dans la chaîne de la porteuse** (remonte `content\dag\G.json` et `P.json`) : Pythagore seulement si G040 y est, π seulement si P023 y est, cos/sin/tan seulement sous G063, la notation vecteur seulement sous G066, AB² seulement sous G040 (à défaut A029), « réciproque » seulement sous G060. Une division de fraction exige C017.
- **La question qui porte la compétence vaut le plus de points.** Pour une démonstration (G050, G055, G056, G059, G061…), découpe la preuve en étapes vérifiables : choisir la propriété (QCM avec `misconception`), compléter l'étape manquante, juger une conclusion. Jamais « Démontre que ».
- **Énoncé long et réaliste** : plan d'un jardin, toit, rampe d'accès, réservoir, emballage, trajet. Une ou deux données inutiles. Une figure si elle aide, jamais en vraie grandeur pour Pythagore, Thalès et la trigonométrie, et **toute longueur ou angle cherché dessiné faux d'au moins 15 % ou 5°** (déclare `cherche`).
- **Valeurs approchées** : rang d'arrondi écrit dans la question, tolérance d'un demi-rang, valeur exacte à plus de 0,1 rang d'une frontière, arrondi à la fin, et le même arrondi avec 3,14 et avec une ligne trigonométrique à 3 décimales. « Calculatrice en degrés » écrit pour la trigonométrie.
- **Aucun couple de données repris** d'un exercice, d'un test de validation ou d'une carte mentale des compétences mobilisées.
- **Rejoue les saisies contre la vraie `Math_Edu_Application\supabase\functions\_shared\correction.ts`** (identifiant `SX-…#q1`) : écritures justes plausibles (« 4,5 cm », « AB = 4,5 », « ≈ 4,5 », unité en toutes lettres, « 36pi », « √34 ») acceptées, erreurs classiques refusées.

## Ta réponse finale
8 lignes maximum, comme dit la consigne générale.
