---
paths:
  - "Spécifications DAG, Exos, Mindcards/**"
  - "scripts/**"
  - "_travail/**"
---

# Règles du contenu

> Chargé quand on touche le contenu, les scripts ou `_travail/`. Circuit pas à pas d'une étape : skill `etape-contenu`. Plan d'ensemble : `Spécifications DAG, Exos, Mindcards/PLAN_CONTENU.md`.

## Principes

- **Erreurs mathématiques :** le circuit à double relecture et le recalcul de chaque réponse par script sont non négociables. Un lot dont plus de 5 % des exercices ont un défaut bloquant impose de revoir la consigne.
- Chaque étape repart du programme officiel (`_travail/programmes/*.txt`), citations exactes. Le DAG v1 (`skills_dag.json`) ne sert que de mémoire.
- **Arbitrage de Gauthier** (questions groupées) avant toute rédaction, sauf délégation explicite (`pilotage/DECISIONS.md`).
- 6 exercices par compétence : 2 découverte, 2 entraînement, 2 maîtrise. Seuil de maîtrise `{3, 4}`.
- Tout reste `brouillon` ou `relu_agent` jusqu'à la recette de Marius.

## Règles tirées des relectures (au validateur ou dans les consignes)

- notations contrôlées par classe : `<>`, ×, ÷, virgule, %, ², ³, °, π, cos, sin, tan, vecteur, AB², ⩽ ⩾ ;
- vocabulaire interdit selon la classe : « produit en croix », « formule » et « tableau de conversion » avant la 6e, « rapporteur » avant la 6e, [AB] seul avant la 6e ;
- figure indispensable, et « peut-on répondre en regardant la figure sans la lire ? » ; le générateur refuse une figure qui trompe l'œil (angle codé droit qui ne l'est pas, angle presque droit, points presque alignés, longueurs codées égales qui ne le sont pas) ; l'angle cherché est dessiné à sa vraie mesure ;
- un « vérifier » porte sur la figure, sans « car » ni « donc » ;
- une lettre citée dans une proposition n'est jamais la pastille d'une autre ;
- les étapes d'un corrigé n'utilisent que des opérations couvertes par les prérequis ;
- dans les cartes, aucun couple de données repris d'un exercice de la même carte ;
- leçons de l'étape 8 (détail dans `modeles_agents/consigne_redacteurs_etape8.md`) : position d'un objet vérifiée sur les coordonnées, QCM à justification fausse, « Aucune » jamais juste, division de fraction C017, angle droit non donné.

## Outils

- **Python :** venv du projet `Math Education/.venv` (ignoré par git). Le recréer au besoin : `C:\Python312\python.exe -m venv .venv`, puis `.venv\Scripts\python.exe -m pip install -r scripts/requirements.lock.txt` ; lancer avec `PYTHONIOENCODING=utf-8`. Ne jamais garder un venv dans un dossier temporaire.
- Validation : `scripts/validate_content.py` ; un lot seul : `scripts/check_lot.py`. Coordination (difficulté, longueur des énoncés) : `scripts/build_review_sheet.py`, qui n'écrit plus de fichier.
- Tous les scripts lisent le contenu par `scripts/contenu.py`, jamais à la main.
- **Figures :** types `demi_droite`, `droite_graduee`, `repere` (points, courbes affine, carré et ligne brisée, lectures d'image et d'antécédent, titres d'axes), `regle`, `horloge`, `quadrillage`, `partage`, `bandes`, `monnaie`, `geometrie` (vecteurs, images par transformation), `rapporteur`, `solide`, `cubes`. Regarder chaque figure à 360 px.
- **Modèles de consignes :** les plus récents sont ceux de la dernière étape close (`modeles_agents/consigne_*_etape<N>.md`) ; règles de figures : `consigne_*_etape4b.md` ; défis et super exercices : `consigne_defis.md`, `consigne_super.md`, `consigne_relecture_*.md`. Les plus anciennes sont dans `modeles_agents/archive/`.
- **Bilans :** `QUALITY.md` est un index ; ne lire que `qualite/<étape>.md` utile.

## Recette du contenu (Marius)

1. Créer un compte élève dédié.
2. L'inscrire comme relecteur dans le SQL Editor :
   ```sql
   insert into content_reviewers (user_id) select id from auth.users where email = '...' on conflict (user_id) do nothing;
   ```
3. Marius juge dans `/recette`.
4. Reporter les verdicts : `python scripts/recette.py --apply`. Accepté devient `valide` ; invalidé devient `brouillon` et part dans `RECETTE.md`, à reprendre par les agents.
