## Étapes 7 et 7 bis : calcul littéral (5e à 3e) et pensée algébrique du cycle 3 (21 octobre 2026)

31 compétences (25 de l'étape 7, 6 du cycle 3), toutes rédigées, relues par un
agent indépendant et corrigées par leur rédacteur d'origine :

| Contenu | Nombre | Touchés par un correctif à la relecture |
|---|---|---|
| Exercices de l'étape 7 (lots L1 à L6) | 150 | 37 (L1 5, L2 3, L3 7, L4 15, L5 4, L6 3) |
| Exercices du cycle 3 | 36 | 13 |
| Cartes mentales de l'étape 7 (MM-B-08, MM-F-01 à MM-F-06) | 7 | 14 % de lignes bloquantes au premier passage |
| Cartes mentales du cycle 3 (MM-B-09, MM-F-07) | 2 | les 6 branches avaient un bloquant (même cause, voir 1.) |
| Cartes défi (F5, F43, C3) | 172 | F43 : 7 % bloquantes ; C3 : 2 sur 33 |
| Super exercices (L7a, L7b, L7c, C3) | 31 | voir ci-dessous |

| Lot de super exercices | Super exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| L7a (5e) | 10 | 0 | 2 | 5 |
| L7b (4e) | 8 | 1 | 4 | 5 |
| L7c (3e) | 7 | 0 | 1 | 9 |
| C3 (CM1, CM2) | 6 | 0 | 3 | 3 |

Aucun résultat final faux dans les super exercices. Le seul bloquant : une
parcelle de x sur x + 9 reprise de EX-F014-M-01.

### Ce que les étapes ont appris

1. **Au cycle 3, chaque opération doit être permise par la chaîne, pas par la
   classe** (règle 8 de `consigne_defis.md`) : un produit hors des tables (22 × 7)
   sans multiplication posée dans la chaîne, une soustraction avec retenue sans
   B004, un quotient hors des tables, l'aire en B056. C'est la cause de toutes les
   lignes bloquantes des cartes mentales du cycle 3. Les scripts des rédacteurs
   appliquaient une règle plus souple que celle du lot d'exercices : ils
   reprennent maintenant les contrôles de `verif_lot_C3.py`.
2. **La correction algébrique doit suivre l'exigence du professeur** : une
   factorisation laissant un facteur à racine rationnelle (« 2(x² − 36) ») était
   acceptée ; elle est refusée depuis le 21 octobre (racines rationnelles, test
   dans `algebre.test.ts`). Un test lit désormais toute la banque : chaque réponse
   attendue et chaque écriture acceptée doivent passer leur propre correction.
3. **Les écritures justes avec unité restent la première source de refus** :
   « 7(x + 8) € », « 5/6 litres », « 15,8 °F », « −40 °C », « 7 paires de patins ».
   La fiche pose `unit` dès qu'une réponse en a une, et la liste `accepted` couvre
   les fractions égales quand l'écriture n'est pas évaluée.
4. **Les cascades reviennent encore** (4 dans L7b) ; la question qui porte la
   compétence, à 4 points, ne doit jamais dépendre d'un résultat non redonné.
5. **Le contrôle des couples doit lire les tests et les expressions transposées** :
   {25, 64} du test de A030, (x + 7)(x − 7) et (x + 6)² croisés avec le test de F020.
6. **Indices** : trois indices de L7a désignaient la bonne proposition ou
   recopiaient la réponse d'une autre question ; un indice décrit une démarche.
7. **Lectures malignes** : la maîtresse comptée parmi les invités (43 au lieu de
   42), trois équipes nommées sur quatre classes, deux prix x pour deux produits.
8. **Une compétence de `skill_ids` doit avoir sa question** : un calcul qui
   emploie une compétence de la chaîne (18 ÷ 1,2, D026) ne l'ajoute pas à la liste.

### Contrôles et outillage

- `correction.ts` : factorisation complète (racines rationnelles), unités
  composées (« km.h-1 », « kilomètres par heure »), hectares et ares, π lu comme
  une constante (« 36pi », « 2πr »). Déploiement de `corriger` à faire avec ces
  changements.
- `validate_content.py` : π (P023), cos, sin, tan (G063), notation vecteur (G066),
  AB² (A029).
- DAG : F013 ← F002 (les corrigés contrôlent par substitution).

### Ce qui reste ouvert

- Publication des 36 exercices du cycle 3, des 9 cartes mentales et des 31 super
  exercices : après la migration 0022 (la publication en ligne ignorait les super
  exercices).
- Tests sur un vrai compte, au téléphone (CLAUDE.md §8, points 9, 11 et 12).
