# Sprint en cours : A1, clôture de l'étape 8

> Ouvert le 23 octobre 2026. Bloc A (contenu). Plafond de ce fichier : 6 Ko ; à la clôture, le skill `cloture-sprint` le résume dans `pilotage/archive/sprints.md` et ouvre le suivant (A2, étape 9, voir `FEUILLE_DE_ROUTE.md`).

**But :** l'étape 8 (géométrie et grandeurs du cycle 4, domaines G et P) publiée, avec son bilan, et ses consignes rangées en modèles pour l'étape 9.

## Déjà fait (21 au 23 octobre 2026)

- DAG : 46 compétences (G038, G040 à G043, G045 à G067, G070 à G076, P028 à P038), raccords compris.
- Exercices : lots M1 à M7 et N1 à N5 fusionnés, 276 exercices `relu_agent`.
- Cartes mentales R1 à R5 (MM-G-07 à MM-G-16, MM-P-07 à MM-P-10) fusionnées, `relu_agent`.
- Cartes défi D8a à D8d, super exercices S8a à S8f fusionnés et commités.
- Figures : vecteur, images par transformation, extensions de `solide`.

## Reste à faire

- [ ] `scripts/validate_content.py` vert sur tout le contenu.
- [ ] `scripts/build_review_sheet.py` : 1 anomalie signalée, **F012** (5e, étape 7) « maîtrise pas plus exigeante que découverte » ; regarder les durées estimées et corriger ou justifier.
- [ ] `contenu.py export-app`, puis `npm test`, `npm run lint`, `npm run build`.
- [ ] Bilan `Spécifications DAG, Exos, Mindcards/qualite/08_etape8_geometrie_grandeurs.md`, à partir des rapports de `_travail/` (taux d'erreur par lot, leçons) ; ligne déjà prévue dans l'index `QUALITY.md`.
- [ ] Compteurs dans `pilotage/ETAT.md` et §2 de `CLAUDE.md`.
- [ ] Commit, puis `publier.py --apply` (aucune migration nécessaire : G et P existent).
- [ ] Recopier les briefs de l'étape 8 (`_travail/brief_*etape8.md`) en modèles `modeles_agents/consigne_*_etape8.md` : ce sont les plus récents, ils serviront à l'étape 9.
- [ ] Déplacer le travail de l'étape 8 dans `_travail/archive/` (garder `programmes/`).

## Blocages

Aucun côté Gauthier pour ce sprint. 0023 et 0024 restent à coller en parallèle (voir `CLAUDE.md` §2).
