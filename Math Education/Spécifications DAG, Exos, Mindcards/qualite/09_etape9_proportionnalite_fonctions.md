## Étape 9 : proportionnalité du cycle 4 et fonctions (23 et 24 octobre 2026)

24 compétences (E038, E001, E002, E005, E040, E039, E016, E013 ; J036 à
J045, J001, J002, J004 à J006, J008, domaine J « Fonctions » créé), toutes
rédigées et relues par un agent indépendant, qui a livré sa copie corrigée :

| Contenu | Nombre | Touchés par un correctif | Bloquants |
|---|---|---|---|
| Exercices (Q1 à Q7) | 144 | 42 | 10 (6,9 %) |
| Cartes mentales (MM-E-05, MM-E-06, MM-J-01 à MM-J-04, branche E038 de MM-E-04) | 6 + 1 branche (≈ 320 lignes) | 7 | 11 lignes, plus 14 lignes anciennes de MM-E-04 |
| Cartes défi (D9a à D9c) | 138 | 19 | 4 |
| Super exercices (S9a à S9c) | 24 | 14 | 5 |

| Lot d'exercices | Exercices | Touchés | Bloquants | Cause principale |
|---|---|---|---|---|
| Q1 (échelle, tableau de valeurs, 5e) | 18 | 9 | 1 | corrigé qui déclarait faux un calcul juste |
| Q2 (formule, points, graphique, 5e) | 18 | 4 | 1 | nombre négatif hors chaîne |
| Q3 (ratio, quatrième proportionnelle, partage, 4e) | 24 | 7 | 4 | couples repris d'un test, ratio pris dans l'autre ordre |
| Q4 (pourcentages, coefficient multiplicateur) | 18 | 2 | 2 | factorisation d'une lettre hors chaîne |
| Q5 (formule et graphique, image, antécédent) | 24 | 8 | 0 | |
| Q6 (lectures, linéaires, affines, 3e) | 24 | 7 | 0 | |
| Q7 (résolution graphique, Thalès, fonction carré) | 18 | 5 | 2 | points presque alignés, unité non imposée |

| Lot de super exercices | Super exercices | Bloquants | Cause |
|---|---|---|---|
| S9a (E, 5e à 3e) | 8 | 0 | 2 importants : une question donnait à la porteuse son modèle |
| S9b (J, 5e et 4e) | 7 | 4 | saisie refusée, deux calculs hors chaîne, couple d'une carte défi |
| S9c (J, 3e) | 9 | 1 | « 16,1 € » refusé pour un coefficient |

Aucun résultat final faux dans tout le contenu de l'étape.

### Ce que l'étape a appris

1. **Les couples se comparent simplifiés, dans les deux ordres, et contre
   les valeurs dérivées d'un test lu en entier** : 5 : 3 et 3 : 5, 72 : 16
   et 36 ÷ 8, 37,5 % tiré de 3 : 5. C'est la première cause de bloquants
   (Q3, MM-E-05, MM-J-04, SX-J042) ; les scripts des rédacteurs coupaient
   les tests question par question.
2. **Une règle de calcul appliquée à une lettre exige le calcul littéral
   dans la chaîne** (factoriser P + 0,07P en E016) ; sinon on raisonne sur
   des nombres. Lien E016 ← F012 ajouté.
3. **Une carte défi ne tranche pas un exercice** : un vrai/faux ou une
   règle qui écarte trois propositions d'un QCM aux mêmes nombres (règle
   3 bis). Les règles centrales de J041, J042, E001, E013 restent aux
   cartes mentales.
4. **L'unité demandée par l'énoncé est imposée** (« 1 h 30 » refusé quand on
   demande des minutes) ; une unité attendue s'écrit dans `answer.unit`,
   même dans une inégalité.
5. **Une figure ne trompe pas l'œil** : des points non alignés s'écartent
   visiblement de la droite ; le texte alternatif reste neutre quand un QCM
   porte sur la forme du tracé.
6. **Largeur réelle de l'écran d'exercice** : énoncé en 20 px, environ
   270 px utiles à 360 px ; un tableau de plus de 5 colonnes se met en
   colonnes.
7. **Une question qui précède la porteuse ne lui donne ni son modèle ni son
   coefficient** (S9a), et la porteuse ne dépend pas de la même lecture que
   la question d'avant (S9c).

### Contrôles et outillage

- `figures.py`, `repere` : droites, fonction carré, lignes brisées, lectures
  d'image et d'antécédents, titres d'axes, segments libres ; lectures et
  intersections hors de la demi-graduation refusées ; 587 figures anciennes
  identiques.
- `validate_content.py` : vocabulaire de l'étape réservé à sa compétence
  (ratio, quatrième proportionnelle, coefficient multiplicateur, fonction,
  image, antécédent, f(x), ↦, 𝒞f, linéaire, affine, carré, ordonnée à
  l'origine) ; « en fonction de » et « tableau de valeurs » dès la 5e.
- `correction.ts` : « f(x) = 2x + 3 », « x ↦ 2x + 3 », « f(1,5) = 27 » lus.
  `corriger` v18 et `rendre-super` v4 déployées, comparées au code local
  sur un compte temporaire : 3 545 saisies et 40 copies identiques.
- DAG : E023 ← J039, P036 ← E005, G042 ← E005, E016 ← F012, J043 ← G016 ;
  six arêtes redondantes retirées.
- MM-E-04 reprise en entier (couples d'exercices et liste de coordonnées
  hérités d'avant les règles actuelles).

### Ce qui reste ouvert

- Recette de Marius dans `/recette`.
- Saisies de l'étape à essayer sur un vrai compte (`TESTS_MANUELS.md`).
- Étape 10 : nœuds de lecture de tableaux et de courbes du cycle 3, à
  raccorder à J036 et J040.
