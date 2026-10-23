# Consigne commune aux rédacteurs, étape 5 (nombres relatifs et arithmétique, 5e à 3e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Les lots
| Lot | Compétences | Figures |
|---|---|---|
| L1 | A015, A016, A017, A024, A025 (arithmétique) | aucune |
| L2 | A018, A019, A020, A021, A022 (relatifs : repérage) | `droite_graduee`, `repere` |
| L3 | A023, B044, B045, B046, B047 (comparer, additionner, soustraire) | `droite_graduee` (B044, B045) ; aucune pour A023 |
| L4 | B048, B011, B049, B050, B051 (problèmes, priorités, multiplication, division) | `droite_graduee` verticale possible pour B048 |

Ton lot t'est indiqué dans ton message de lancement.

## À lire avant d'écrire, dans cet ordre
1. `C:\Users\MARRE\Documents\Jarvis\Math Education\.claude\agents\exercise-generator.md` : ta définition complète, qui prime sur tout (règle zéro, règle du champ numérique, sixième et septième règles, format de sortie).
2. `Spécifications DAG, Exos, Mindcards\PRINCIPES_PEDAGOGIQUES.md`.
3. Tes compétences dans `_travail\etape5_dag_AB.json` (proposées, pas encore dans la banque) : `label`, `description`, `school_level`, `validation_test`, `prerequisites`, `programme_ref`.
   - **Le compte rendu du cartographe, `_travail\etape5_dag_AB.md`, est à lire en entier** : colonnes « Figure » et « Évaluation », constat central, sections « Consignes de saisie pour les rédacteurs » et « Décisions de Gauthier ».
   - Les compétences existantes (prérequis) sont dans `Spécifications DAG, Exos, Mindcards\content\dag\*.json`.
4. Si ton lot a des figures : **`scripts\figures.py`**, en particulier les docstrings de `_droite_graduee` et `_repere` (nouveaux), et la consigne `_travail\brief_figures.md`, dont toutes les règles s'appliquent (figure indispensable, « sans lire la figure », test de substitution, `alt` neutre, une figure par exercice).
5. Le style des exercices déjà relus : `content\exercices\D\` (décimaux) et `content\exercices\B\` (calcul).
6. Le programme officiel : `_travail\programmes\5eme.txt` (cycle 4 découpé par classe : Cinquième, Quatrième, Troisième) et `_travail\programmes\6eme-cm1-cm2.txt`. Chaque `programme_ref` d'exercice cite un attendu existant, d'une classe égale ou inférieure à celle de la compétence.

## Ce que tu produis
1. **`_travail\lot_etape5_<ton lot>.json`** : 6 exercices par compétence (2 `decouverte`, 2 `entrainement`, 2 `maitrise`), identifiants `EX-<compétence>-<D|E|M>-01` et `-02`, `review_status: "brouillon"`.
2. Si tu as des figures : **`_travail\figures_5_<ton lot>\`**, une description `<id de l'exercice>.json` par figure, au format `{"type": ..., "params": {...}, "alt": "..."}` ; l'exercice y renvoie par `"image": "figures/<id>"`.

## Écrire les nombres relatifs (bloquant)
- **Dans `answer.value`** d'un exercice numérique : un nombre JSON (`-3`, `-2.5`). Dans `accepted`, des écritures ASCII.
- **Dans les textes lus par l'élève** (énoncé, propositions, corrigé, indice) : le signe moins typographique « − » (U+2212), jamais le trait d'union, qui est trop court pour un élève qui découvre les négatifs. Dans une formule KaTeX (`$...$`), écris `-` : KaTeX l'affiche correctement.
- Une parenthèse autour d'un négatif suit le programme : « (−3) + (+5) » en 5e pour l'apprentissage, puis l'écriture simplifiée « −3 + 5 » à partir de B046.
- **L'élève peut taper** « -3 », « − 3 », « – 3 » ou « (-3) » : la correction les accepte tous (vérifié, `correction.ts`). Une température : unité `°C`, et « -3 °C », « -3 degrés » sont acceptés.
- **Couples de coordonnées et décompositions** : jamais en saisie libre. QCM, ou question numérique (« Quelle est l'abscisse de A ? », « Combien de fois le facteur 2 apparaît-il ? »).
- Coordonnées en français : « (−3 ; 2) », point-virgule.
- **Valeur absolue** : jamais la notation |x| (validateur). On dit « la distance à zéro ».
- **Décomposition (A025)** : un produit sans puissances, « 2 × 2 × 3 × 5 », facteurs rangés dans l'ordre croissant.
- **Pas de nombre négatif dans un exercice d'une compétence antérieure à la 5e** : le validateur le refuse.

## Figures (lots L2, L3, L4)
- `droite_graduee` : `min <= 0 <= max`. Pour A019, l'abscisse demandée **n'est jamais écrite** sur la figure ; n'écris que 0 et une autre graduation (`"etiquettes": [0, 1]`) pour obliger à compter.
- `repere` (A020) : un QCM « Quel point a pour coordonnées (−3 ; 2) ? » contient toujours le point (2 ; −3) (inversion) et un point au signe changé. Les pointillés de lecture (`lecture: true`) seulement en découverte ou pour illustrer un corrigé, jamais quand ils donnent la réponse.
- A023 (comparer) : **aucune figure**, elle donnerait l'ordre.
- Flèches de déplacement (B044) : l'étiquette automatique écrit l'écart signé ; si la question porte sur cet écart, mets `"etiquette": false`.
- Calcule tout depuis les `params`, jamais à l'œil. Une seule bonne réponse sur la figure.
- Regarde chaque figure à 360 px de large.

## Ce que le programme impose
- 5e : addition, soustraction, sommes et enchaînements ; **pas de multiplication de relatifs avant la 4e** (B049).
- Les étapes d'un corrigé n'emploient que des opérations couvertes par les prérequis de la compétence (remonte la chaîne dans le DAG fusionné plus `etape5_dag_AB.json`).
- Plafond de mots des énoncés : 30 mots en moyenne au collège.
- Programmes de calcul (B051) : traduits par QCM entre plusieurs expressions.
- Arithmétique : « divisible par », « multiple de », « diviseur de » ; un nombre premier a exactement deux diviseurs, 1 et lui-même (1 n'est pas premier).

## Erreurs classiques à exploiter dans les distracteurs
- **ordre des négatifs** : croire que −7 > −3 parce que 7 > 3 ; ranger par distance à zéro ;
- **addition** : additionner les distances à zéro sans regarder les signes (−5 + 3 = −8) ; garder toujours le signe du premier terme ;
- **soustraction** : oublier d'ajouter l'opposé (−2 − (−6) = −8) ;
- **repère** : inverser abscisse et ordonnée ; lire la graduation suivante ;
- **droite graduée** : compter les traits au lieu des intervalles ; partir de 1 au lieu de 0 ;
- **opposé et valeur absolue** : confondre opposé et inverse ; croire que la distance à zéro peut être négative ;
- **règle des signes** : (−) × (−) = (−) ; appliquer la règle des signes à l'addition (−3 + (−4) = +7) ;
- **priorités** : calculer de gauche à droite (2 + 3 × 4 = 20) ;
- **divisibilité** : critère de 3 confondu avec « finit par 3 » ; 1 compté comme premier ; 9 compté comme premier ; décomposition qui garde un facteur non premier (2 × 6).

## Vérifications obligatoires avant de rendre
Python : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.

1. **Un script jetable `_travail\verif_lot_etape5_<ton lot>.py`.** Pour chaque exercice, il recalcule la réponse (Fraction, jamais de flottants pour les égalités) et la compare à `answer.value` ; recalcule chaque distracteur depuis son erreur ; pour les figures, relit la description et fait le test de substitution ; contrôle le champ numérique, le plafond de mots, l'absence de caractère de contrôle, et qu'aucun texte élève ne contient de trait d'union devant un chiffre hors formule KaTeX.
2. **Rejoue les saisies plausibles contre la vraie correction** : `Math_Edu_Application\supabase\functions\_shared\correction.ts`, transpilé et lancé sous node (modèle : `_travail\review_F1_saisie.cjs`). Pour chaque réponse négative, rejoue au moins « -3 », « −3 » et « (-3) ».
3. **Figures** : `python scripts\figures.py apercu _travail\figures_5_<ton lot> _travail\apercu_5_<ton lot>`, puis une planche PNG à 360 px de large, ouverte avec l'outil Read. Pour faire la capture, un script existe : `node "C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\5625dac1-2271-41d0-bf2b-fc23fb862aa9\scratchpad\fig\shot.cjs" <page.html> <sortie.png> 360`.
4. **Le validateur**, sur une copie temporaire :
   ```
   python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --skills "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape5_dag_AB.json" --links "C:\Users\MARRE\Documents\Jarvis\Math Education\_travail\etape5_liens_AB.json" --exercises <ton lot> [--figures <ton dossier de figures>]
   ```
   Il doit afficher « Validation REUSSIE », sans avertissement sur tes identifiants, à part l'absence de carte mentale.

## Ce que tu ne fais jamais
Tu ne modifies rien sous `content\`, dans les fichiers `etape5_*` du cartographe, dans `scripts\` ni dans l'application. Aucun commit. Si un dessin indispensable manque ou si le validateur refuse à tort, **signale-le** sans contourner.

## Ta réponse finale
10 lignes maximum : chemins du lot et du dossier de figures ; nombre d'exercices par compétence ; résultat des vérifications ; ce que tu as vu sur la planche ; difficultés à trancher.
