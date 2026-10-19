# Plan d'extension du contenu

> Où en est l'extension du DAG, des exercices et des cartes mentales, et comment
> chaque étape est produite. Tenu à jour à la fin de chaque étape.
> Suivi de la qualité : `QUALITY.md`. Principes pédagogiques : `PRINCIPES_PEDAGOGIQUES.md`.

## Le principe

La base grandit **domaine par domaine, en suivant le programme officiel classe par
classe** (`Programme mathématiques/`, extrait en texte dans `_travail/programmes/`
par `scripts/extract_programmes.py`). Chaque étape livre ensemble, pour un même
chapitre :

- les **nœuds du DAG**, au niveau où le programme introduit la notion, chacun
  justifié par une citation exacte (`programme_ref`) ;
- **6 à 7 exercices** par compétence, sur les trois niveaux (découverte,
  entraînement, maîtrise) ;
- **une carte mentale** par chapitre de 4 à 8 compétences.

On ne passe pas à l'étape suivante tant que la précédente n'est pas fusionnée,
validée et testée dans l'application : un domaine excellent vaut mieux que trois
domaines à moitié faits.

## Les étapes

| Étape | Domaine | Classes | État |
|---|---|---|---|
| 0 | A Numération, C Fractions (tranche pilote) | CP → 3e | Fait (v2.1, 35 compétences) |
| 0 bis | B001, B005, B006 (calcul de base) | CP → CE2 | Fait le 3 octobre 2026 |
| 1 | B Calcul numérique : opérations, calcul mental, division | CP → 6e | Fait le 3 octobre 2026 : 18 compétences, 108 exercices, 4 cartes (bilan dans `QUALITY.md`) |
| 2 | D Nombres décimaux | CE1 → 6e | Fait le 4 octobre 2026 : 19 compétences, 114 exercices, 4 cartes |
| 3 | E Proportionnalité et pourcentages | CM1 → 5e | Fait le 5 octobre 2026 : 17 compétences E et B043, 108 exercices, 4 cartes (bilan dans `QUALITY.md`) |
| 4a | P Grandeurs et mesures (domaine ouvert, lettre P) | CP → 6e | Fait le 14 octobre 2026 : 27 compétences (dont 5 à figure), 132 exercices, 6 cartes |
| Figures | Reprises et compétences à figure | CP → CM1 | Fait le 14 octobre 2026 : 30 exercices repris, 31 nouveaux (P001, P004, P007, P013, P017), 61 figures |
| 4b | G Espace et géométrie | CP → 6e | Fait le 19 octobre 2026 : 30 compétences, 180 exercices (tous à figure), 6 cartes |
| 5+ | Statistiques, probabilités, algèbre, puissances | Cycle 4 | À faire |

## Le circuit d'une étape

1. **Cartographe** (agent) : lit le programme du domaine, propose les nœuds
   (identifiants v1 réutilisés quand la notion correspond, sinon nouveaux à la
   suite), avec citations, prérequis et découpage en cartes. Sortie :
   `_travail/etapeN_dag_X.json` et `.md`. **Arbitrage humain avant toute
   rédaction.**
2. **Rédacteurs** (agents `exercise-generator`, en parallèle par groupe de
   compétences) : un fichier de lot chacun, chaque réponse recalculée par script.
3. **Relecteurs** (agents `math-reviewer`, indépendants des rédacteurs) : un
   rapport par lot. Les défauts sont corrigés, puis contrôlés à nouveau.
4. **Cartes mentales** : rédigées une fois les exercices stabilisés, relues.
5. **Fusion**, dans cet ordre, toujours en simulation d'abord :
   ```
   python scripts/check_lot.py --skills ... --links ... --exercises ... --mindmaps ...
   python scripts/merge_dag.py --skills _travail/etapeN_dag_X.json --links _travail/etapeN_liens_X.json --apply
   python scripts/merge_lot.py _travail/lot_....json --apply
   python scripts/merge_dag.py --mindmaps _travail/etapeN_mm_X.json --apply
   python scripts/set_review_status.py --status relu_agent --skill <id>   (chaque compétence relue)
   python scripts/set_review_status.py --status relu_agent --cartes <MM-...>
   python scripts/build_review_sheet.py
   ```
   Les consignes de l'étape 3, les plus complètes (cartographe, rédacteurs,
   relecteurs : `modeles_agents/consigne_*_etape3.md`), servent de modèle aux
   suivantes ; pour un domaine à figures, prendre celles de l'étape 4b
   (`modeles_agents/consigne_*_etape4b.md`), qui portent les règles des figures
   tirées des relectures. Celles de l'étape 1 restent disponibles :
   `modeles_agents/consigne_redacteurs_etape1.md` et
   `modeles_agents/consigne_relecteurs_etape1.md` (à recopier dans `_travail/`
   et adapter au domaine).
   **Garder les mêmes agents** d'un bout à l'autre d'une étape : le rapport de
   relecture repart chez le rédacteur d'origine, et la contre-relecture chez le
   relecteur d'origine. Chacun garde ainsi le contexte de son lot.
   puis `python scripts/contenu.py export-app` (l'application reçoit trois
   fichiers assemblés), et `npm test && npm run lint && npm run build` dans
   l'application. Une fois l'étape **commitée**, `python scripts/publier.py
   --apply` publie le contenu dans la base Supabase (il refuse un contenu
   invalide ou non commité, et recompte ce que la base contient). L'application
   lit la nouvelle publication au chargement suivant de la page : c'est
   l'étape qui met le contenu entre les mains des élèves.

   **Figures** : un lot qui en porte livre aussi un dossier de descriptions
   (`_travail/figures_<lot>/<nom>.json`, format de `scripts/figures.py`). On le
   passe à `check_lot.py --figures <dossier>` et à `merge_lot.py --figures
   <dossier>`, qui copie les descriptions dans `content/figures/` après une
   validation réussie. Pour reprendre des exercices existants (leur ajouter une
   figure), `merge_lot.py --remplacer`.

   Le contenu est découpé : `content/dag/<domaine>.json`,
   `content/exercices/<domaine>/<compétence>.json`, `content/cartes/<carte>.json`.
   Aucun script ne lit ces fichiers à la main : tous passent par
   `scripts/contenu.py`. Les fusions acceptent un tableau JSON tel que les agents
   le produisent.
6. **Suivi** : bilan dans `QUALITY.md`, état dans ce fichier, commit.

Tout reste en `review_status: "brouillon"` ou `"relu_agent"` jusqu'à la **recette
de Marius dans l'application** (outil en place depuis le 4 octobre 2026) : il juge
chaque exercice et chaque carte, au fil des étapes publiées, et
`scripts/recette.py` reporte les verdicts. Accepté devient `valide` ; invalidé
redevient `brouillon` et part dans `RECETTE.md` avec le commentaire, à reprendre
par les agents. Procédure : `CLAUDE.md` §10.6.
