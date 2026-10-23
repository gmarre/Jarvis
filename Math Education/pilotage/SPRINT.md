# Sprint en cours : A2a, étape 9 (domaines E et J), outils et cartographe

> Ouvert le 23 octobre 2026. Bloc A (contenu). Plafond de ce fichier : 6 Ko ; à la clôture, le skill `cloture-sprint` le résume dans `pilotage/archive/sprints.md` et ouvre le suivant (A2b, rédaction de l'étape 9). Circuit : skill `etape-contenu`.

**But :** le DAG de l'étape 9 (proportionnalité du cycle 4, fonctions) arbitré et fusionné, le générateur de courbes prêt, les briefs de rédaction écrits : A2b peut lancer les rédacteurs sans préparation.

## Reste à faire

- [ ] Arbitrage d'ouverture avec Gauthier (questions ci-dessous).
- [ ] Repérage : programme du cycle 4 (`_travail/programmes/5eme.txt`, `3eme-4eme.txt`), domaine E actuel (17 compétences, CM1 à 5e), nœuds E et J du v1 (`skills_dag.json`, mémoire seulement).
- [ ] Générateur `repere` étendu dans `scripts/figures.py` : droites de fonctions linéaires et affines, courbes données par points, lecture d'image et d'antécédent ; refus d'une figure qui donne la réponse ; figures existantes rendues à l'identique ; essais regardés à 360 px.
- [ ] Brief du cartographe `_travail/brief_cartographe_etape9.md`, depuis `modeles_agents/consigne_cartographe_etape8.md`.
- [ ] Cartographe : `_travail/etape9_dag_EJ.json` et `.md`, liens `_travail/etape9_liens_EJ.json`.
- [ ] Arbitrage des découpages (Gauthier, ou chef de projet si délégation), consigné dans `DECISIONS.md`.
- [ ] Fusion du DAG (domaine J ajouté aux métadonnées), validateur, export, `npm test`, `npm run lint`, `npm run build`, commit.
- [ ] Validateur : notations et vocabulaire de l'étape par classe (« fonction », « image », « antécédent », f(x), x ↦).
- [ ] Briefs de rédaction et de relecture de l'étape 9 (depuis les modèles de l'étape 8), découpage en lots.

## Questions ouvertes pour Gauthier

1. Délégation des arbitrages reconduite pour l'étape 9, comme pour les étapes 7 et 8 ? Recommandation : oui.

## Blocages

Aucun pour ce sprint (pas de migration : `[A-P]` couvre J). En parallèle, côté Gauthier : coller 0023 seule et 0024, vérifier les deux professeurs (`CLAUDE.md` §2).
