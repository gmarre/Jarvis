---
name: etape-contenu
description: Circuit complet d'une étape de contenu MATH EDUCATION (cartographe, rédaction, relecture, cartes, défis, super exercices, fusion, publication, bilan). À suivre pour lancer, faire avancer ou clore une étape du bloc A, ou un lot d'exercices, de cartes, de défis ou de super exercices.
---

# Circuit d'une étape de contenu

Règles de fond : `.claude/rules/contenu.md`. Toutes les commandes Python : `.venv\Scripts\python.exe` depuis `Math Education`, avec `PYTHONIOENCODING=utf-8`.

## 1. Préparer

- Lire la ligne de l'étape dans `pilotage/FEUILLE_DE_ROUTE.md` (bloc A) et ses arbitrages déjà pris dans `pilotage/DECISIONS.md`.
- Nouvelle lettre de domaine ? D'abord une migration (skill `migration`) qui élargit les contraintes `A-P`, et `ID_EXERCICE` dans `corriger/index.ts` (skill `deployer-fonction`).
- Nouveau type de figure ? Le coder dans `scripts/figures.py` **avant** la rédaction des nœuds qui en dépendent.
- Partir des consignes de la dernière étape close (`modeles_agents/consigne_*_etape<N>.md`), recopiées et adaptées dans `_travail/brief_*_etape<M>.md`.

## 2. Cartographe (agent)

Nœuds du DAG d'après le programme (`_travail/programmes/*.txt`), citations exactes, prérequis, découpage en cartes mentales. Sortie : `_travail/etape<M>_dag_<X>.json` et `.md`, liens dans `_travail/etape<M>_liens_<X>.json`. Identifiants v1 réutilisés quand la notion correspond, sinon nouveaux à la suite ; pas de renumérotation.

**Arbitrage de Gauthier** (questions groupées, avec une recommandation pour chacune) avant toute rédaction, sauf délégation. Consigner chaque choix dans `pilotage/DECISIONS.md`.

## 3. Rédaction (agents `exercise-generator`, un lot chacun)

- 6 exercices par compétence (2 D, 2 E, 2 M).
- Chaque réponse recalculée par script ; les saisies rejouées contre `correction.ts` ; figures regardées à 360 px.
- Contrôle du lot : `scripts/check_lot.py --skills ... --links ... --exercises ... --mindmaps ... [--figures <dossier>]`.

## 4. Relecture (agents `math-reviewer`, indépendants des rédacteurs)

- Un rapport par lot, **écrit dans `_travail/`** ; l'agent ne rend que 10 lignes.
- Le relecteur livre aussi sa copie corrigée ; contre-relecture par le même relecteur. Garder les mêmes agents d'un bout à l'autre de l'étape.

## 5. Cartes mentales, cartes défi, super exercices

Même circuit (rédaction, relecture, contre-relecture), consignes `consigne_cartes_*`, `consigne_defis.md`, `consigne_super.md` et leurs relectures. Cartes défi : 4 à 6 par compétence. Super exercices : un par compétence au moins, barème par étape, travail de la compréhension d'énoncé et de la convergence des notions.

## 6. Fusion (toujours en simulation d'abord, puis `--apply`)

```
python scripts/merge_dag.py --skills _travail/etape<M>_dag_<X>.json --links _travail/etape<M>_liens_<X>.json --apply
python scripts/merge_lot.py _travail/lot_....json [--figures _travail/figures_<lot>] [--remplacer] --apply
python scripts/merge_dag.py --mindmaps _travail/etape<M>_mm_<X>.json --apply
python scripts/merge_defis.py ...     python scripts/merge_super.py ...
python scripts/set_review_status.py --status relu_agent --skill <id>      (chaque compétence relue)
python scripts/set_review_status.py --status relu_agent --cartes <MM-...>
python scripts/validate_content.py
python scripts/build_review_sheet.py     (anomalies de coordination, à regarder)
python scripts/contenu.py export-app
```

Puis `npm test && npm run lint && npm run build` dans `Math_Edu_Application`. Un commit par lot.

## 7. Publication et clôture de l'étape

1. Commit, puis `python scripts/publier.py --apply` (refuse un contenu invalide ou non commité, recompte ce que la base contient).
2. Bilan dans `Spécifications DAG, Exos, Mindcards/qualite/<NN>_etape<M>_<theme>.md` (taux d'erreur par lot, leçons) et une ligne dans l'index `QUALITY.md`.
3. Leçons durables : dans le validateur si possible, sinon dans les consignes.
4. Recopier les briefs de l'étape en modèles `modeles_agents/consigne_*_etape<M>.md` ; déplacer les modèles devenus anciens dans `modeles_agents/archive/`.
5. Déplacer le travail de l'étape dans `_travail/archive/` (garder `programmes/`).
6. Compteurs dans `pilotage/ETAT.md` et `CLAUDE.md` §2 ; tests manuels éventuels dans `pilotage/TESTS_MANUELS.md`.
