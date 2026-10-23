# Super exercices de l'étape 9 (proportionnalité du cycle 4 et fonctions)

La consigne générale est `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_super.md` : lis-la en entier, elle s'applique telle quelle. Ce brief ajoute le découpage et les règles propres à ces compétences.

## Les lots (un super exercice par compétence porteuse)
| Lot | Porteuses | Classes | Fichier |
|---|---|---|---|
| S9a | E038, E001, E002, E005, E040, E039, E016, E013 | 5e, 4e, 3e | `_travail\super_S9a.json` |
| S9b | J036, J037, J038, J039, J040, J041, J042 | 5e, 4e | `_travail\super_S9b.json` |
| S9c | J001, J002, J004, J008, J006, J005, J043, J044, J045 | 3e | `_travail\super_S9c.json` |

Identifiants : `SX-<porteuse>-01`. Figures dans `_travail\figures_super_<lot>\` (format de `content\figures\`, rendues par `scripts\figures.py`).

## À lire en plus de la consigne générale
- `modeles_agents\archive\consigne_super_etape8.md` : ses règles générales (chaîne de la porteuse, question porteuse la mieux payée, couples non repris, saisies rejouées) valent ici.
- `_travail\brief_etape9.md` en entier : règles propres (tracer jamais à l'écran, lectures sur la demi-graduation, pointillés de lecture jamais dans une question notée, vocabulaire par compétence, saisie), erreurs classiques.
- `_travail\brief_relecture_etape9.md` : ce que la relecture contrôle.
- `_travail\archive\etape9_dag_EJ.md` (descriptions, figures, saisie) et le générateur `repere` de `scripts\figures.py` (`courbes`, `segments`, `lectures`, `nom_x`, `nom_y`), avec `_travail\archive\essai_figures_etape9.py`.

## Règles propres
- **Toutes les compétences des questions sont dans la chaîne de la porteuse** (remonte `content\dag\E.json` et `J.json`) : le vocabulaire des fonctions seulement sous J001, une équation seulement si sa résolution est dans la chaîne, une division de fraction exige C017.
- **La question qui porte la compétence vaut le plus de points**, et ne dépend jamais d'un résultat non redonné (leçon des cascades des étapes 7 et 8).
- **Énoncé long et réaliste** : forfait de téléphone, location de vélo, recette, plan, soldes successives, remplissage d'une cuve, trajet. Une ou deux données inutiles. Graphiques de grandeurs avec titres d'axes et pas lisibles ; toute valeur lue sur la demi-graduation.
- **Aucun couple de données repris** d'un exercice, d'un test de validation, d'une carte mentale ou d'une carte défi des compétences mobilisées.
- **Rejoue les saisies contre la vraie `Math_Edu_Application\supabase\functions\_shared\correction.ts`** (identifiant `SX-…#q1`) : écritures justes plausibles (« 15 % », « 1,15 », « f(x) = 2x + 3 », « x ⩾ 2 », « −3 ; 3 ») acceptées, erreurs classiques refusées.

## Ta réponse finale
8 lignes maximum, comme dit la consigne générale.
