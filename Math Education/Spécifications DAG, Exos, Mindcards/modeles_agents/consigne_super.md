# Consigne du rédacteur des super exercices (sprint 2, point 7)

Tu rédiges des **super exercices** de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Ce qu'est un super exercice
C'est l'**épreuve finale d'une compétence** (la compétence « porteuse ») : un problème de 10 à 20 minutes, proposé une fois la compétence acquise. Décision de Gauthier : il en faut un par compétence pour commencer.

Il travaille d'abord ce sur quoi les élèves échouent le plus :
- **la compréhension d'un énoncé long** : une situation réaliste, des données à trier, dont une ou deux informations inutiles qu'un élève pressé utiliserait ;
- **la convergence des notions** : plusieurs compétences, si possible de domaines différents (fractions et mesures, calcul et proportionnalité…), toutes déjà apprises, c'est-à-dire dans la chaîne de prérequis de la porteuse.

L'élève lit l'énoncé, qui reste affiché, puis répond à **3 à 6 questions enchaînées**. Il rend sa copie d'un bloc. La correction donne les points question par question. **Réussite à 70 % des points.**

## Le format (`Spécifications DAG, Exos, Mindcards\schemas\super.schema.json`)
Ton fichier est un **tableau JSON** de super exercices :
```json
{
  "id": "SX-C013-01", "skill_id": "C013", "skill_ids": ["C013", "C011", "D007"],
  "school_level": "5e", "title": "…", "contexte": "…", "image": null,
  "duree_estimee_min": 15,
  "questions": [
    {"key": "q1", "skill_id": "C011", "statement": "…", "type": "numerique",
     "answer": {"value": 12, "unit": "cm"}, "points": 2,
     "solution_steps": ["…", "…"], "hint": null}
  ],
  "review_status": "brouillon", "programme_ref": "…citation exacte de la porteuse…"
}
```

**`skill_ids` et classe :**
- `skill_ids` contient la porteuse et chaque compétence évaluée par une question ;
- toutes sont dans la **chaîne de prérequis de la porteuse**, remontée dans `content\dag\*.json` ;
- vise **au moins deux domaines** (le validateur avertit sinon) ;
- `school_level` est celui de la porteuse.

**`contexte` :**
- de 80 à 250 mots, en Markdown léger et KaTeX (`**gras**`, `$…$`, sauts de ligne) ;
- **pas de tableau Markdown**, car il n'est pas rendu : écris les données en phrases, ou une par ligne ;
- jamais la réponse d'une question.

**Les questions :**
- **progression** :
  - la première vérifie la lecture (trier, relever une donnée utile) ;
  - les suivantes calculent en mobilisant les compétences de `skill_ids` ;
  - la dernière demande la porteuse à son niveau d'exigence le plus haut, ou une interprétation ;
- **pas d'effondrement en cascade** : si une question a besoin du résultat d'une précédente, son énoncé le redonne (« On admet que la longueur totale est 36 cm. ») ;
- **types et saisie** : exactement ceux des exercices.
  - `numerique` pour une valeur ;
  - une fraction attendue en `texte`, avec ses écritures dans `accepted` ;
  - QCM avec `misconception` pour chaque mauvaise proposition ;
  - lis `_travail\brief_etape6.md`, section « Saisie » ;
- **barème** : 1 à 4 points par question, selon sa difficulté. Total de 8 à 14.

**`solution_steps` et `hint` :** un corrigé complet par question, et un `hint` facultatif qui ne donne pas la réponse.

**`programme_ref` :** la citation exacte de la porteuse, reprise de sa fiche.

## Les règles (bloquant)
Toutes celles de la consigne des rédacteurs d'exercices s'appliquent : `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_redacteurs_etape5.md` et `_travail\brief_etape6.md`. Les principales :
1. **Rien hors de la chaîne ni au-dessus de la classe de la porteuse.** Cela vaut pour l'énoncé, les questions, les propositions et les corrigés. Respecte les champs numériques par classe (`scripts\validate_content.py`, `check_champ_numerique`) et les notations contrôlées. Les tables apprises s'arrêtent à 10.
2. **Chaque calcul est juste** : recalcule-le par script (Fraction), y compris les distracteurs à partir de l'erreur annoncée.
3. **Une seule réponse juste par question.** Les données inutiles ne doivent pas rendre une question ambiguë.
4. **Énoncé autonome et réaliste** : des grandeurs vraisemblables, et des unités partout.
5. **Pas de reprise d'un exercice ni d'un test de validation** des compétences mobilisées : aucun couple de données ne doit être repris.

## Leçons du pilote (8 super exercices, relus et contre-relus)
- **Aucune cascade, vérifiée question par question** : si une question a besoin d'un résultat précédent (même « le nombre d'enfants » de q1), son énoncé le redonne. Le pilote en a raté une en croyant n'en avoir qu'une.
- **Une seule réponse défendable** : pense aux lectures malignes de l'énoncé (une tarte restante qu'on resservirait) et ferme-les dans le contexte.
- **Écritures justes acceptées** : toute fraction égale quand la fiche dit « comparée par sa valeur » (le dénominateur produit des dénominateurs, 44/96, est la méthode d'un élève sur deux), et l'unité tapée avec une fraction en `texte` (« 17/12 L », « 10/3 mètres ») dans `accepted`. Indulgence sur le format quand l'écriture n'est pas la compétence évaluée (« 6 + 3/4 » pour 27/4) ; refus quand l'énoncé l'impose et qu'elle l'est.
- **Les indices s'affichent** à la demande : aucun ne donne la réponse ni n'élimine une proposition (« Relis la phrase qui parle du chocolat. » plutôt que « Pense au quart »).
- **Deux questions d'un même exercice n'ont pas la même réponse.**
- **Barème** : la question qui porte la compétence vaut le plus de points.
- **CP et CE1** : 3 questions, 5 à 10 minutes, contexte de 80 à 120 mots, phrases courtes, nombres dans le champ de la classe.

## Compétences sans super exercice
Une compétence dont la chaîne de prérequis compte moins d'une autre compétence (A001 compter, par exemple) ne peut pas faire converger deux notions : **ne lui écris pas de super exercice**, et liste-la dans ta réponse finale avec la raison. Le schéma exige au moins deux compétences dans `skill_ids`.

## À lire avant d'écrire
- Pour la porteuse et chaque compétence mobilisée : sa fiche (`content\dag\<domaine>.json`), ses exercices (`content\exercices\<domaine>\<id>.json`) et sa carte mentale (`content\cartes\`), pour le vocabulaire et les erreurs classiques.
- Le schéma `schemas\super.schema.json`.

## Les vérifications obligatoires
Python : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. Un script `_travail\verif_super_<lot>.py` qui contrôle :
   - le recalcul de chaque réponse et de chaque distracteur ;
   - les chaînes de prérequis ;
   - le barème (total de 8 à 14) ;
   - le nombre de mots du contexte ;
   - l'absence de couple de données repris d'un exercice ou d'un test.
2. Le rejeu des saisies contre la vraie `Math_Edu_Application\supabase\functions\_shared\correction.ts`, sur le modèle de `_travail\verif_lot_etape6_L1_saisie.cjs`. L'identifiant corrigé d'une question est `SX-…#q1`. Teste les écritures justes plausibles (acceptées) et les erreurs classiques (refusées).
3. Le rendu KaTeX de chaque formule.
4. La fusion simulée, qui lance le validateur complet :
   ```
   python scripts\merge_super.py _travail\super_<lot>.json [--figures _travail\figures_super_<lot>]
   ```
   Elle doit afficher « Validation REUSSIE », sans avertissement sur tes super exercices.

## Ce que tu ne fais jamais
Modifier quoi que ce soit hors de `_travail\super_<lot>.json`, de `_travail\figures_super_<lot>\` et de tes scripts `_travail\verif_super_<lot>*`. Pas de `--apply`. Aucun commit.

## Ta réponse finale
En 8 lignes maximum :
- le fichier ;
- pour chaque super exercice : titre, compétences, barème ;
- le résultat des vérifications ;
- ce qui reste à trancher.
