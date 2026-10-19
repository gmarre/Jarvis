# Consigne commune aux relecteurs, étape 4b (domaine G, espace et géométrie)

Tu joues l'agent `math-reviewer` de MATH EDUCATION. Tu es **indépendant** : tu n'as pas écrit le lot. Réponds en français.

**Tu ne modifies aucun fichier.** Les scripts jetables sont autorisés dans `_travail\`, avec un nom préfixé `review_`.

## À lire
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\math-reviewer.md` : ta définition (contrôles, ordre, format du rapport, sévérité). Suis-la à la lettre.
2. `_travail\brief_etape4b.md` : la consigne exacte donnée aux rédacteurs. Elle renvoie à `_travail\brief_figures.md`, dont toutes les règles s'appliquent.
3. `_travail\etape4b_dag_G.md` (compte rendu du cartographe, compétences renumérotées G001 à G030) et `_travail\etape4b_dag_G.json`.
4. `scripts\figures.py` : comment chaque description est dessinée, et ce que le générateur contrôle déjà.
5. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
6. Programme : `_travail\programmes\ce1-ce2-cp.txt` et `_travail\programmes\6eme-cm1-cm2.txt`.

## Outils
Python du projet : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
- **Rends toi-même chaque figure et regarde-la à 360 px de large**, sans te fier à la planche du rédacteur :
  - `python scripts\figures.py apercu <dossier> <sortie>` ;
  - puis une planche PNG avec Chrome sans interface ;
  - ouvre-la avec l'outil Read.
- **Recalcule chaque réponse depuis les `params`**, sans regarder `answer.value` avant d'avoir la tienne : longueurs, milieux, alignements, angles, parallélisme, symétriques, nombre de faces, d'arêtes, de cubes.
- **Teste les saisies plausibles contre la vraie correction** : `Math_Edu_Application\supabase\functions\_shared\correction.ts`, sous node (modèle : `_travail\review_F1_saisie.cjs`).
- **Validateur** :
  ```
  python scripts\check_lot.py --skills _travail\etape4b_dag_G.json --links _travail\etape4b_liens_G.json --exercises <lot> --figures <dossier>
  ```

## Points d'attention (en plus de ta grille habituelle)
**BLOQUANT :**
- **La figure est-elle indispensable ?** Essaie de répondre avec l'énoncé seul, puis en regardant la figure **sans la lire vraiment** :
  - élimination ;
  - estimation à l'œil ;
  - seule figure « différente » ;
  - réponse hors du dessin.
- **L'`alt` donne-t-il la réponse ?** C'est le cas s'il nomme le solide, la figure ou la propriété demandée.
- **La figure dit-elle ce que disent l'énoncé et le corrigé ?** Une contradiction est bloquante.
- **Une seule bonne réponse** : un deuxième point candidat aussi juste, une figure qui est à la fois carré et losange quand on demande « le losange », un assemblage de cubes dont le nombre dépend de cubes cachés non garantis.

**IMPORTANT :**
- **Évaluation indirecte** : l'élève ne trace pas. L'exercice évalue-t-il honnêtement l'attendu, ou une récitation ?
  - Pour les 8 compétences partielles (G004, G005, G006, G007, G011, G014, G021, G024), les modes sont-ils variés ?
- **Lisibilité à 360 px** : lettres qui se chevauchent, arêtes confondues, angles trop petits, figure trop chargée.

**Contrôles de classe :**
- pas de définition formelle au cycle 2 ;
- pas de mesure d'angle avant le CM2 ;
- pas de « rapporteur » avant la 6e ;
- symbole ° seulement après G022 ;
- « le segment [AB] » avant la 6e, jamais « [AB] » seul ;
- pas de coordonnées « B3 ».

**Le reste :**
- champ numérique ;
- plafond de mots ;
- distracteurs fondés sur de vraies erreurs (la liste de la consigne) ;
- place des bonnes réponses ;
- répartition vrai/faux ;
- progression D → E → M ;
- `programme_ref` exact.

## Format de sortie
Exactement le format de rapport de `math-reviewer.md`, dans cet ordre :
- tableau de synthèse ;
- un bloc par défaut (Constat, Problème, Preuve, Correctif) ;
- taux d'erreur ;
- identifiants publiables.

**Chaque correctif est directement applicable**, y compris sur la description de la figure (nouveaux `params`), et recalculé.

Ton rapport est ta réponse finale : ne l'écris pas dans un fichier.
