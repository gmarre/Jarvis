## Étape 6 : fractions du cycle 4, puissances, racine carrée, notation scientifique, 5e à 3e (20 octobre 2026)

**Livré :** 26 compétences (C013, C015, C017, C018, C033 à C037, D026, A029 à
A040, B022, B023, B052, B053 ; 5e : 6, 4e : 14, 3e : 6) ; 5 liens vers l'existant
(A025 ← A031, C007 ← A015, C007 ← A027, C011 ← A027, et A034 ← B049 ajouté en
relecture) et 3 arêtes devenues redondantes retirées (C007 ← B006, C007 ← B039,
C011 ← B006) ; A025 réécrite avec les puissances. 156 exercices, dont 4 à
figure ; 7 cartes mentales (MM-A-06 à 08, MM-B-07, MM-C-05, MM-C-06, MM-D-05).
La banque passe à 196 compétences, 1 192 exercices, 42 cartes.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| L1 fractions, division décimale (C013, C033, D026, C034, C015) | 30 | 1 | 4 | 4 |
| L2 rationnels (C035, C018, C017, C036, C037) | 30 | 0 | 0 | 6 |
| L3 carrés, cubes, puissances (A029 à A032, B052, B022) | 36 | 0 | 4 | 7 |
| L4 puissances, racine carrée (B053, A033, A034, A035, A040) | 30 | 1 | 2 | 2 |
| L5 exposants négatifs, notation scientifique (A036 à A039, B023) | 30 | 0 | 3 | 5 |
| Cartes mentales | 7 cartes | 1 | 5 | 14 |

Aucune réponse fausse sur 156 exercices. Les deux bloquants d'exercices et celui
des cartes sont des **opérations hors chaîne** : une division par un nombre à
deux chiffres avant D026 (deux fois), et la règle des signes dans un corrigé de
racine carrée, réglée par le lien A034 ← B049. Toutes les corrections ont été
contre-relues par le relecteur d'origine.

### Ce que l'étape a appris

1. **Un défaut de saisie vu dans plusieurs lots se règle dans la correction,
   pas lot par lot.** « n = 13 », « 1,496 fois 10^8 », « 225 cm^2 »,
   « 6/(−10) » étaient refusés dans trois ou quatre lots ; `correction.ts` les
   accepte désormais, sans jamais ramener « −3/−7 » ni « −(−3/7) » à « 3/7 »
   (simplifier deux signes est ce que C034 évalue). La tolérance du contenu est
   une borne incluse des deux côtés.
2. **Lever une évaluation partielle dès que l'outil le permet** : la correction
   lisant « a × 10ⁿ », A038 (notation scientifique) se tape désormais. Seule C035
   (représenter une fraction de fraction) reste partielle.
3. **Une carte fuit aussi par décalage de virgule** : 0,3⁴ = 0,0081 donne 3⁴ = 81,
   40³ = 64 000 donne 4³ = 64. Le contrôle des couples compare maintenant les
   chiffres significatifs, et une puissance ou une racine compte avec sa valeur.
4. **Les tables apprises s'arrêtent à 10** : « dans la table de 15 » n'a pas de
   sens pour l'élève, on écrit « 60 = 15 × 4 ».
5. **Répartir les bonnes réponses** : un lot avait 5 vrai/faux « faux » sur 6,
   un autre aucune bonne réponse de QCM en a.

### Contrôles et outillage

- Validateur : exposant après un nombre distingué de l'unité d'aire ; ², ³ à
  partir de A029, autres exposants à partir de A031, exposant négatif à partir de
  A036, √ à partir de A034.
- Correction : puissances et notation scientifique reconnues sans calcul, « fois »,
  fractions relatives, signe d'une fraction, lettre isolée suivie de « = »,
  tolérance incluse ; fonction `corriger` redéployée avec la publication.
- Exemptions du contrôle des couples dans les cartes : la liste des carrés de 0 à
  12 et les six préfixes de nano à giga, savoirs de référence du programme.
- Consignes de l'étape rangées en modèles (`modeles_agents/consigne_cartes_etape6.md`,
  `_travail/brief_etape6.md`).

### Ce qui reste ouvert

- « x = 7 » est accepté quand on demande n : la correction ne vérifie pas la
  lettre (valeur juste, jugé sans conséquence).
- Les cartes de puissances emploient des exemples peu courants (10¹⁴, 10⁻¹¹,
  encadrement entre 13 et 14), faute d'exemples courants libres : à revoir si
  Marius les juge déroutants.
- x² = a renvoyé à l'étape 7, résolution graphique à l'étape 9.
