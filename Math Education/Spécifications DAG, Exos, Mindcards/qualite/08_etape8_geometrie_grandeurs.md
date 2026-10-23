## Étape 8 : géométrie et grandeurs du cycle 4 (21 au 23 octobre 2026)

46 compétences (G038, G040 à G043, G045 à G067, G070 à G076, P028 à P038),
toutes rédigées, relues par un agent indépendant et corrigées par leur
rédacteur d'origine :

| Contenu | Nombre | Touchés par un correctif | Bloquants |
|---|---|---|---|
| Exercices, première vague (M1 à M7) | 192 | 63 | 20 (10,4 %) |
| Exercices, deuxième vague (N1 à N5) | 84 | 27 | 3 (3,6 %) |
| Cartes mentales (R1 à R5) | 14 (533 lignes) | 14 | 7 lignes |
| Cartes défi (D8a à D8d) | 229 | 33 | 7 |
| Super exercices (S8a à S8f) | 46 | 32 | 1 |

| Lot d'exercices | Exercices | Touchés | Bloquants | Cause principale |
|---|---|---|---|---|
| M1 (angles, parallélisme) | 30 | 15 | 9 | angle cherché dessiné à sa vraie mesure |
| M2 (demi-tour, quadrilatères) | 30 | 13 | 1 | distracteur vrai |
| M3 (hauteurs, médianes, aires) | 30 | 10 | 5 | figure mesurable à la règle, couple du test |
| M4 (volumes, disque, vues) | 24 | 8 | 1 | figure qui ment sur l'ordre des longueurs |
| M5 (droite des milieux, Pythagore) | 30 | 1 | 0 | |
| M6 (grandeurs quotients, Thalès) | 30 | 5 | 0 | |
| M7 (trigonométrie) | 18 | 11 | 4 | angle cherché à sa vraie mesure, couple repris |
| N1 à N3 (transformations, vecteurs, prismes) | 54 | 19 | 2 | position d'un objet, QCM |
| N4 (pyramide, cône, patrons) | 18 | 5 | 0 | |
| N5 (sphère, sections, boule) | 18 | 3 | 1 | division de fraction hors chaîne |

| Lot de super exercices | Super exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| S8a (5e) | 7 | 0 | 2 | 10 |
| S8b (5e) | 6 | 0 | 4 | 6 |
| S8c (4e) | 7 | 0 | 23 | 8 |
| S8d (3e) | 8 | 0 | 14 | 10 |
| S8e (4e, 3e) | 10 | 0 | 21 | 11 |
| S8f (4e, 3e) | 8 | 1 | 0 | 3 |

Aucun résultat final faux dans les super exercices. Le seul bloquant : l'angle
droit de SX-G074-01 se lisait sur la figure.

### Ce que l'étape a appris

1. **La figure qui donne la réponse est la première source de bloquants** (au moins 14
   des 23 exercices bloquants, plus SX-G074-01). « Pas en vraie grandeur » ne
   protège pas un angle. L'angle cherché est dessiné à au moins 5° de sa
   valeur, une longueur cherchée déformée d'au moins 15 %, sauf quand la
   propriété impose l'égalité. L'option `cherche` du générateur refuse une
   mesure lisible, mais ne voit que les points déclarés : les points construits
   restent à mesurer en relecture.
2. **La consigne revue en cours d'étape a porté** : 10,4 % de bloquants dans la
   première vague (au-dessus du seuil de 5 %), 3,6 % dans la seconde, après les
   leçons de M5 et M7 puis de N1 à N3 ajoutées au brief.
3. **Les couples repris se cherchent aussi dans les tests de validation** : M3,
   M7 et les 3 bloquants de D8a (cartes qui retombaient sur la question d'un
   test), cartes de D8b à D8d qui donnaient la réponse d'un exercice.
4. **Toute opération doit être dans la chaîne, y compris la géométrie
   d'appoint** : division de fraction (C017) dans N5 et MM-P-09, soustraction
   dans MM-G-15, trapèze sans G023, additions avec retenue sans B013. Cinq
   séries de liens DAG ajoutés : P030 ← P024 et D006, G057 ← G049, G070 et
   G071 ← B013, P029, G045, G047 et G055 ← G023.
5. **Une phrase générale de carte mentale doit valoir pour toutes les
   configurations des exercices** : « les arêtes latérales sont en biais »,
   « nombre impair d'arêtes cachées » étaient faux sur certaines figures (4
   des 7 lignes bloquantes, R4 et R5).
6. **QCM** : aucune proposition juste avec une justification fausse ; « Aucune »
   juste au moins une fois quand elle est proposée ; deux distracteurs jamais
   égaux ; bonnes réponses réparties sur les lettres.
7. **Les cascades reviennent dans les super exercices** (S8b, S8d, S8e) : c'est
   la majorité des importants. La question qui porte la compétence redonne
   toujours le résultat dont elle dépend.
8. **Saisies justes refusées** : nom recopié devant la réponse (« L'N' = 4,8 cm »,
   « HGJ = 38° », « KN = 20 »), « sqrt(29) », « ≈ 5,8 », « environ 39° »,
   « Aire = 50 cm² ». Toutes acceptées depuis, par `correction.ts`.

### Contrôles et outillage

- `figures.py` : flèche de vecteur, images par demi-tour, symétrie et
  translation en fractions exactes, chevrons, option `cherche` ; `solide` à
  l'échelle, cotes, coupes, solides couchés ; 858 figures anciennes rendues à
  l'identique, 35 refus testés.
- `validate_content.py` : π (P023), cos, sin, tan (G063), notation vecteur
  (G066), AB² (A029), angle cherché à sa vraie mesure (points déclarés).
- `correction.ts` : π lu comme une constante, hectares et ares, unités
  composées, noms recopiés, √, ≈ ; `corriger` v17 déployée.
- Règle de π harmonisée : tolérance d'un demi-rang, l'arrondi obtenu avec 3,14
  doit aussi être accepté.

### Ce qui reste ouvert

- Recette de Marius dans `/recette`.
- Points construits par le générateur, non contrôlés par le validateur : à
  mesurer en relecture à chaque étape.
