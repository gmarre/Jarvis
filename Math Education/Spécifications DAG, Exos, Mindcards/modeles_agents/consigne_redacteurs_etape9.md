# Consigne commune aux rédacteurs, étape 9 (proportionnalité du cycle 4 et fonctions, 5e à 3e)

Tu es l'agent `exercise-generator` de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Les lots
| Lot | Classe | Compétences | Figures |
|---|---|---|---|
| Q1 | 5e | E038, J036, J037 | tableaux en KaTeX, peu de figures |
| Q2 | 5e | J038, J039, J040 | `repere` : points, nuage, `ligne`, titres d'axes |
| Q3 | 4e | E001, E002, E005, E040 | tableaux en KaTeX ; `bandes` pour un partage si utile |
| Q4 | 4e, 3e | E039, E016, E013 | aucune ou presque |
| Q5 | 4e, 3e | J041, J042, J001, J002 | `repere` : `ligne`, `affine`, titres d'axes |
| Q6 | 3e | J004, J006, J005, J043 | `repere` : `affine`, `lectures` |
| Q7 | 3e | J044, J045, J008 | `repere` : `affine`, `carre`, `segments`, `lectures` |

Ton lot t'est indiqué dans ton message de lancement.

## À lire avant d'écrire, dans cet ordre
1. **La consigne de l'étape 5, `Spécifications DAG, Exos, Mindcards\modeles_agents\archive\consigne_redacteurs_etape5.md`, en entier : toutes ses règles s'appliquent ici** (définition de l'agent, lectures, format, vérifications, interdits, réponse finale), en remplaçant `lot_etape5_<lot>` par `lot_etape9_<lot>`, `figures_5_<lot>` par `figures_9_<lot>` et `verif_lot_etape5_` par `verif_lot_etape9_`. **Le DAG de l'étape 9 est déjà fusionné** : tes compétences sont dans `Spécifications DAG, Exos, Mindcards\content\dag\E.json` et `J.json` ; pas de `--skills` ni de `--links` au validateur.
2. **La consigne de l'étape 8, `modeles_agents\archive\consigne_redacteurs_etape8.md`**, sections « Leçons des premières relectures » et « Leçons des relectures de la deuxième vague » : elles valent ici (QCM, couples repris, position vérifiée sur les coordonnées, opérations hors chaîne).
3. **Le compte rendu du cartographe, `_travail\archive\etape9_dag_EJ.md`, en entier.** Chaque description dit comment la réponse se donne et quelle figure il faut ; lis surtout les sections 4 (Figures), 5 (Saisie), 6 (Vocabulaire), 7 (Consignes de saisie pour les rédacteurs) et 10 (Prérequis anticipés).
4. **Les arbitrages de l'étape 9** dans `pilotage\DECISIONS.md` (cherche « étape 9, arbitrages du cartographe »).
5. Le DAG fusionné : remonte la chaîne des prérequis de chaque compétence avant d'écrire un corrigé. **Leçon des étapes 5 à 8 : toute opération d'un corrigé doit être dans la chaîne** (division de fraction C017, relatifs, résolution d'équation, pourcentages, puissances).
6. Le programme : `_travail\programmes\5eme.txt`, partie « Proportionnalité, fonctions ».
7. Le générateur `repere` de `scripts\figures.py` (docstring de `_repere`) et les essais `_travail\archive\essai_figures_etape9.py` (rendus dans `_travail\archive\essai_figures_etape9\`).

## Règles propres à l'étape 9 (bloquant)
- **Tracer, placer, représenter : jamais à l'écran.** Choisir le bon graphique parmi plusieurs (QCM de figures lettrées, une figure par proposition décrite dans l'énoncé ou une seule figure à plusieurs courbes nommées), lire, compléter un tableau, juger un tracé (vrai/faux). J039, J042 et J008 sont en **évaluation partielle** : leur réussite ne prouve pas que l'élève sait tracer.
- **Lectures graphiques** : toute valeur lue tombe sur la demi-graduation, sans `answer.tolerance` ; déclare-la dans `lectures` quand tu dessines les pointillés (le générateur refuse une lecture fausse), et vérifie-la toi-même sinon. Pointillés de lecture en **découverte et au corrigé seulement** : en entraînement et en maîtrise, la figure ne montre pas la lecture. Une valeur irrationnelle (x² = 3) : QCM d'encadrement.
- **Résolution graphique** : deux courbes se coupent sur la demi-graduation (le générateur le contrôle) ; une inéquation se répond en forme `inegalite` (« x ⩾ 2 »), l'énoncé dit si l'inégalité est stricte.
- **Une figure ne donne jamais la réponse** : le texte alternatif ne dit jamais l'expression d'une fonction ; une question de coefficient ne s'accompagne pas d'une droite dont l'équation est écrite.
- **Vocabulaire contrôlé par le validateur** (arbitrages 4 à 6) : « en fonction de » et « tableau de valeurs » dès la 5e ; « ratio » à partir de E001, « quatrième proportionnelle » à partir de E005, « coefficient multiplicateur » à partir de E016 ; « fonction » comme nom, « image de » un nombre, « antécédent », f(x), x ↦ à partir de J001 ; 𝒞f à partir de J004 ; « fonction linéaire », « affine », « carré » à partir de J006, J005, J008 ; « ordonnée à l'origine », « coefficient directeur » à partir de J043. **« Produit en croix » jamais** : on dit « égalité des rapports », résolue comme une équation.
- **Saisie** : formule ou expression en forme `expression` avec `variables` (« f(x) = 2x + 3 » et « x ↦ 2x + 3 » sont lus depuis le 23 octobre 2026 : `accepted` inutile pour eux) ; antécédents en forme `solutions` ; ratio jamais tapé (on demande une part, un nombre ou un QCM) ; échelle en `numerique` « 1/50000 » ou par le dénominateur, jamais « 1 : 50 000 » au clavier ; pourcentage avec `answer.unit` « % », une baisse demandée en positif (« de quel pourcentage a-t-il baissé ? ») ; coefficient multiplicateur en décimal, l'énoncé le dit.
- **Pas de lettre m** pour une grandeur inconnue (prise pour le mètre). Tableaux en KaTeX `\begin{array}`, moins typographique pour les négatifs.
- **Données** : un couple de données ne se répète pas entre deux exercices d'une même compétence, ni avec son test de validation, ni avec un exemple de sa carte mentale.

## Leçons des relectures de l'étape 9 (à appliquer partout ensuite)
- **Une règle de calcul appliquée à une lettre** (factoriser P + 0,07P, développer) exige la compétence de calcul littéral dans la chaîne ; sinon, raisonner sur des nombres (lot Q4, 2 bloquants).
- **Les couples se comparent aussi simplifiés et dans les deux ordres** (5 : 3 et 3 : 5 ; 10 : 6 et 5 : 3), et contre les **valeurs dérivées** d'un test (37,5 % tiré de 3 : 5), pas seulement contre ses nombres écrits (lot Q3, 4 bloquants).
- **Un QCM ne se devine pas par les fréquences** : chaque valeur des propositions revient autant de fois (lot Q3).
- **L'unité demandée par l'énoncé est imposée** : une valeur juste dans une autre unité est refusée.
- **Domaine dit dans l'énoncé** quand on demande des antécédents sur une courbe tracée sur un intervalle (lot Q6).
- **Une figure ne trompe pas l'œil** : des points non alignés s'écartent visiblement de la droite (lot Q7).
- **Texte alternatif neutre** quand un QCM porte sur la forme d'un tracé (le texte automatique dit « la droite » ou « la courbe »).
- La correction lit « f(1,5) = 27 » devant une image, depuis le 23 octobre 2026.
- **Largeur réelle de l'écran d'exercice** : énoncé en 20 px, environ 270 px utiles à 360 px ; un tableau KaTeX de plus de 5 colonnes se met en colonnes (lot Q1).
- **Un test se compare en entier** (toutes ses questions et leurs valeurs dérivées ensemble), et chaque quotient d'une ligne est comparé, simplifié, aux quotients écrits des sources (cartes R1 et R3).
- Un corrigé ne déclare jamais faux un calcul juste : l'erreur porte sur ce qui est faux (l'unité annoncée, pas la division) (lot Q1).

## Erreurs classiques à exploiter dans les distracteurs
- **proportionnalité** : ajouter au lieu de multiplier (modèle additif) ; inverser le coefficient ; tableau croissant pris pour proportionnel ; droite qui ne passe pas par l'origine prise pour proportionnelle ;
- **ratio et partage** : partager 2 : 3 en divisant par 2 puis par 3 au lieu de diviser par 5 ; confondre a : b et b : a ;
- **pourcentages** : ajouter les pourcentages successifs (+10 % puis −10 % = 0 %) ; coefficient 1,15 écrit 0,15 ou 1,015 ; baisse de 20 % codée 0,2 ; pourcentage calculé sur la nouvelle valeur ;
- **échelle** : diviser au lieu de multiplier ; oublier la conversion cm vers km ;
- **fonctions** : confondre image et antécédent ; lire l'abscisse à la place de l'ordonnée ; oublier un des deux antécédents par la fonction carré ; f(3) lu comme f × 3 ;
- **linéaire et affine** : a et b inversés ; coefficient lu comme le quotient x ÷ y ; affine prise pour linéaire ; ordonnée à l'origine lue à l'intersection avec l'axe des abscisses ;
- **résolution graphique** : solution lue en ordonnée ; sens de l'inégalité inversé ; inégalité large au lieu de stricte.

## Vérifications et réponse finale
Celles de la consigne de l'étape 5 : script `_travail\verif_lot_etape9_<lot>.py` (recalcul en Fraction de chaque réponse et distracteur ; lectures recalculées sur les coordonnées des figures ; notations et vocabulaire par compétence ; plafond de 30 mots ; aucun couple repris d'un test), rejeu des saisies contre `Math_Edu_Application\supabase\functions\_shared\correction.ts` (justes plausibles et erreurs classiques), figures rendues et regardées à 360 px, et :
```
python "C:\Users\MARRE\Documents\Jarvis\Math Education\scripts\check_lot.py" --exercises <ton lot> [--figures <ton dossier>]
```
avec le Python du venv (`C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, `PYTHONIOENCODING=utf-8`). « Validation REUSSIE » attendu, sans avertissement sur tes identifiants à part l'absence de carte mentale. Rien sous `content\`, `scripts\` ni dans l'application ; aucun commit. Réponse finale en 10 lignes maximum.
