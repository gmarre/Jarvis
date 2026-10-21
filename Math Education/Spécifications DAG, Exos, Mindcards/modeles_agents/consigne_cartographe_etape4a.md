# Consigne du cartographe, étape 4a (domaine P, grandeurs et mesures, CP à 6e)

Tu es le cartographe de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.
Ta mission : proposer les nœuds du DAG du **nouveau domaine P « Grandeurs et mesures »**, du CP à la 6e, chacun justifié par le programme officiel. Tu ne rédiges aucun exercice.

## Le contexte
- Le v1 du DAG réservait les lettres A à O et n'avait **aucun domaine des grandeurs**. Le chef de projet a ouvert le domaine **P** (migration 0009, schémas élargis à A-P). Identifiants : **P001, P002…** ; `domain` : `"P"` ; `domain_name` : `"Grandeurs et mesures"`. Cartes : `MM-P-01`…
- L'étape est découpée : **4a (toi) = grandeurs et mesures**, **4b (plus tard) = géométrie plane** (domaine G du v1), qui attend que l'application sache afficher des figures.
- **L'application n'affiche pas encore d'images.** Tes compétences doivent pouvoir s'évaluer par des énoncés écrits (données chiffrées, situations décrites). Quand un attendu ne s'évalue honnêtement qu'avec une figure (lire une règle graduée, mesurer un segment dessiné, lire une horloge à aiguilles, compter des carreaux), garde le nœud s'il est essentiel, mais signale-le dans le compte rendu (« figure nécessaire ») : ses exercices viendront avec les figures.

## À lire avant de proposer, dans cet ordre
1. `Spécifications DAG, Exos, Mindcards\CORRECTIONS_DAG_v2.md` : la méthode (niveau d'introduction, une notion sur deux classes = deux nœuds, pas de prérequis fantôme).
2. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Le modèle de livrable de l'étape précédente : `_travail\etape3_dag_E.md` (compte rendu, la meilleure référence), `_travail\etape3_dag_E.json` (format des compétences), `_travail\etape2_liens_D.json` (format des liens vers l'existant). Reprends exactement ces formats et ce plan de compte rendu. Le seuil de maîtrise est `{"required": 3, "out_of": 4}`.
4. Le DAG existant, fusionné : `Spécifications DAG, Exos, Mindcards\content\dag\A.json`, `B.json`, `C.json`, `D.json`, `E.json` (93 compétences). Tes prérequis viennent de là ou de ta proposition. Note ce qui touche déjà aux grandeurs :
   - D014 (convertir des mesures écrites avec une virgule, CM1) ;
   - D016 et D017 (monnaie, CE1 et CE2) ;
   - E006 (échelle) et E007 (vitesse moyenne) ;
   - B036 à B038 (problèmes).
   
   Ne les duplique pas. S'ils doivent dépendre de tes nœuds (par exemple D014 ← relations entre unités de longueur), propose le lien dans le fichier de liens.
5. Le v1, pour mémoire : les compétences de périmètre, d'aire et de volume étaient rangées dans G (`Spécifications DAG, Exos, Mindcards\skills_dag.json` : G027, G028, G029, G030, G031, G033, G034). Elles relèvent du programme « Grandeurs et mesures » : reprends celles qui sont dans le périmètre **dans P, avec de nouveaux identifiants P**, et dis lesquelles dans le compte rendu (table de correspondance v1 → P).
6. Le programme officiel, en texte : `_travail\programmes\ce1-ce2-cp.txt` (cycle 2) et `_travail\programmes\6eme-cm1-cm2.txt` (cycle 3). Les parties « Grandeurs et mesures » sont ta source principale. Regarde `5eme.txt` seulement pour savoir ce qui est reporté au-delà de la 6e.

## Le périmètre
- **Dedans** : longueurs, masses, contenances, durées et repérage dans le temps (lecture de l'heure si elle s'évalue sans figure : heure écrite en chiffres, durées), monnaie au-delà de D016-D017, unités et conversions (tableaux de conversion compris si le programme les nomme), périmètres, aires (comparaison, unités, formules du rectangle et du carré, puis ce que la 6e ajoute), volumes et contenances (CM2, 6e), résolution de problèmes de mesure.
- **Dehors** :
  - les angles (repérage et mesure) : ils vont à l'étape 4b avec la géométrie, car ils exigent des figures ;
  - tout ce qui est au-delà de la 6e ;
  - la proportionnalité, déjà faite dans E.
- Vise **20 à 28 compétences** du CP à la 6e. Moins si le programme ne le justifie pas.

## Ce que tu produis
1. `_travail\etape4a_dag_P.json` : un tableau de compétences au format de `etape3_dag_E.json`, avec `exercise_ids: []` et `mindmap_id: null`. Le champ `programme_ref` contient des citations **exactes**, copiées du texte du programme, avec leur source (cycle, classe, rubrique). La première citation est au niveau de la compétence ; aucune ne vient d'une classe postérieure.
2. `_travail\etape4a_liens_P.json` : les prérequis à ajouter à des compétences existantes (D014, E006, E007…), au format de `etape2_liens_D.json`, chacun avec sa raison. Tableau vide sinon.
3. `_travail\etape4a_dag_P.md` : le compte rendu, sur le plan de `etape3_dag_E.md` :
   - les compétences (tableau, avec une colonne « Figure » qui vaut oui ou non) et le constat central ;
   - la correspondance avec le v1 ;
   - les liens vers l'existant ;
   - le découpage en **cartes mentales** de 4 à 8 compétences ;
   - les **points à arbitrer**, numérotés, chacun avec ta recommandation.

## Vérifications obligatoires avant de rendre
Python du projet : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. Un script `_travail\verif_etape4a_dag_P.py`, sur le modèle de `_travail\verif_etape3_dag_E.py`. Il vérifie :
   - que chaque citation figure mot pour mot **dans la section de sa classe** ;
   - qu'aucun prérequis n'est d'un niveau postérieur ;
   - que tous les identifiants existent ;
   - qu'il n'y a ni cycle ni arête redondante.
2. Le validateur complet, sur une copie temporaire :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_dag_P.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape4a_liens_P.json" --tout
   ```
   Il doit afficher « Validation REUSSIE ». Seuls avertissements tolérés sur P : « aucun exercice » et « pas de carte mentale ». Si le validateur refuse la lettre P quelque part, **ne le modifie pas** : signale-le.

## Ce que tu ne fais jamais
Modifier quoi que ce soit sous `content\`, dans `scripts\` ou dans l'application. Tu écris uniquement les trois fichiers `etape4a_*` et ton script de vérification.

## Ta réponse finale
15 lignes maximum :
- les chemins de tes fichiers ;
- le nombre de compétences par classe et le nombre de compétences qui demandent une figure ;
- le résultat des vérifications ;
- les points à arbitrer, en une ligne chacun.
