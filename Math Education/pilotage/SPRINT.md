# Sprint en cours : A2a, étape 9 (domaines E et J), outils et cartographe

> Ouvert le 23 octobre 2026. Bloc A (contenu). Plafond de ce fichier : 6 Ko ; à la clôture, le skill `cloture-sprint` le résume dans `pilotage/archive/sprints.md` et ouvre le suivant (A2b, rédaction de l'étape 9). Circuit : skill `etape-contenu`.

**But :** le DAG de l'étape 9 (proportionnalité du cycle 4, fonctions) arbitré et fusionné, le générateur de courbes prêt, les briefs de rédaction écrits : A2b peut lancer les rédacteurs sans préparation.

## Reste à faire

- [x] Arbitrage d'ouverture : délégation reconduite.
- [x] Repérage : programme du cycle 4 (`_travail/programmes/5eme.txt`, `3eme-4eme.txt`), domaine E actuel (17 compétences, CM1 à 5e), nœuds E et J du v1 (`skills_dag.json`, mémoire seulement).
- [x] Générateur `repere` étendu dans `scripts/figures.py` : droites de fonctions linéaires et affines, courbes données par points, lecture d'image et d'antécédent ; refus d'une figure qui donne la réponse ; figures existantes rendues à l'identique ; essais regardés à 360 px.
- [x] Brief du cartographe `_travail/brief_cartographe_etape9.md`, depuis `modeles_agents/consigne_cartographe_etape8.md`.
- [x] Cartographe : `_travail/etape9_dag_EJ.json` et `.md`, liens `_travail/etape9_liens_EJ.json`.
- [x] Arbitrage des découpages (chef de projet, par délégation), consigné dans `DECISIONS.md`.
- [x] Fusion du DAG (domaine J ajouté aux métadonnées), validateur, export, `npm test`, `npm run lint`, `npm run build`, commit.
- [x] Validateur : notations et vocabulaire de l'étape par classe (« fonction », « image », « antécédent », f(x), x ↦).
- [x] Correction : « f(x) = … », « g(x) = … » et « x ↦ … » acceptés devant une expression (`correction.ts`, 3 tests). **Redéploiement de `corriger` et `rendre-super` groupé avec les correctifs de A2b, avant la publication de l'étape 9.**
- [x] Repère : segments libres (verticaux compris, pleins ou en pointillés), pour J045.
- [ ] Briefs de rédaction et de relecture de l'étape 9 (depuis les modèles de l'étape 8), découpage en lots.

## Arbitrages

Délégation reconduite pour toute l'étape 9 (Gauthier, 23 octobre 2026) : le chef de projet tranche et consigne dans `DECISIONS.md`.

## Blocages

Aucun pour ce sprint (pas de migration : `[A-P]` couvre J).
