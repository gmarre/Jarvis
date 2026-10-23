---
name: cloture-sprint
description: Clore le sprint en cours de MATH EDUCATION et ouvrir le suivant (bilan, mise à jour de l'état, archive du sprint, nouveau SPRINT.md). À suivre quand toutes les cases de pilotage/SPRINT.md sont cochées, ou quand Gauthier demande de changer de sprint.
---

# Clore un sprint et ouvrir le suivant

1. **Vérifier** que chaque case de `pilotage/SPRINT.md` est cochée, ou noter explicitement ce qui est reporté et où (sprint suivant, `FEUILLE_DE_ROUTE.md`).
2. **Archiver** : ajouter en tête de `pilotage/archive/sprints.md` un résumé de 5 à 10 lignes (dates, livré, reporté, leçons), puis vider `SPRINT.md`.
3. **Mettre à jour** :
   - `pilotage/ETAT.md` (compteurs, écrans, migrations, versions des fonctions, limites) ;
   - `CLAUDE.md` §2, en 3 lignes au plus ;
   - `pilotage/FEUILLE_DE_ROUTE.md` : retirer ce qui est fait, ajuster la suite ;
   - `pilotage/DECISIONS.md` : décisions prises pendant le sprint, questions ouvertes résolues ;
   - `pilotage/TESTS_MANUELS.md` : tests ajoutés.
4. **Vérifier les plafonds** : `CLAUDE.md` sous 10 Ko, `SPRINT.md` sous 6 Ko (`wc -c`). Au-delà, déplacer le surplus dans le bon fichier de `pilotage/`, jamais d'historique dans `CLAUDE.md`.
5. **Ouvrir le sprint suivant** d'après `FEUILLE_DE_ROUTE.md` : but, cases à cocher, blocages. Lister les questions ouvertes qui le concernent et **les poser à Gauthier**, avec le plan, avant de coder.
6. Rappeler à Gauthier les tests manuels en attente s'il y en a plus de 5 nouveaux.
7. Commit « Pilotage : clôture du sprint X, ouverture du sprint Y ».
