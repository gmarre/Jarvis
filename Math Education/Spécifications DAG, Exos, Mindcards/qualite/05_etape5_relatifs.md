## Étape 5 : nombres relatifs et arithmétique, 5e à 3e (19 octobre 2026)

**Livré :** 20 compétences (A015 à A025, B011, B044 à B051 ; 5e : 15, 4e : 3, 3e : 2),
numérotées dans l'ordre de la progression avec reprise des identifiants du v1 quand
la notion correspond ; 1 lien vers l'existant (E023 ← A020) ; 120 exercices, dont
21 à figure ; 5 cartes mentales (MM-A-03 à 05, MM-B-05 et 06). La banque passe à
170 compétences, 967 exercices, 35 cartes. Premier contenu du cycle 4. Deux
générateurs nouveaux : `droite_graduee` (relatifs, horizontale ou verticale,
flèches de déplacement, écarts) et `repere` (quatre quadrants).

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| L1 arithmétique (A015-A017, A024, A025) | 30 | 0 | 0 | 7 |
| L2 repérage (A018-A022) | 30 | 0 | 2 | 0 |
| L3 comparer, additionner, soustraire | 30 | 0 | 2 | 4 |
| L4 problèmes, priorités, ×, ÷ | 30 | 0 | 1 | 3 |
| Cartes mentales | 5 cartes | 1 | 4 | 9 |

Aucune réponse fausse sur 120 exercices. Toutes les corrections ont été
contre-relues par le relecteur d'origine.

### Ce que l'étape a appris

1. **Le signe moins se tape de plusieurs façons.** « −3 » (U+2212), « – 3 »,
   « (-3) » et « +8 °C » étaient comptés faux, même identiques à la réponse.
   `correction.ts` les accepte tous, et le corrigé s'affiche avec « − ».
2. **Les règles de notation par classe doivent connaître leurs faux amis** : le
   « °C » d'une température n'est pas le degré d'un angle (G022), et son « C »
   n'est pas la pastille c d'un QCM. Deux faux positifs du validateur, corrigés.
3. **Les relectures trouvent des prérequis manquants** que le cartographe ne voit
   pas : comparer des décimaux (D003) pour additionner des relatifs (B044), les
   priorités (B011) pour justifier la règle des signes (B049), la division
   euclidienne (B008) pour vérifier une divisibilité (A015).
4. **Un correctif de figure peut créer un défaut** : resserrer une droite graduée
   a fait sortir du dessin le résultat d'un distracteur, qui s'éliminait sans
   lire. Une figure se relit après chaque changement.
5. **Une carte mentale fuit par des chemins détournés** : un nombre formé par un
   énoncé à trou et une proposition (« 4■ » et « 9 » font 49), une ligne
   « Erreur à éviter » qui paraphrase un vrai/faux. Les deux contrôles sont dans
   la consigne des cartes (`modeles_agents/consigne_cartes_etape5.md`).
6. **« Graduation » désigne un trait** : pour compter, on parle d'intervalles,
   sinon la carte enseigne l'erreur qu'elle dénonce.

### Contrôles et outillage

- Validateur : nombre négatif interdit avant la 5e, notation |x| interdite ;
  « °C » distingué du degré d'angle et des pastilles de QCM.
- Correction : signe moins typographique, parenthèses, « °C » et « degrés
  Celsius », signe plus devant une unité ; fonction `corriger` version 7.
- Tests SQL sans Docker (`npm run test:sql`, PGlite).
- Consignes de l'étape rangées en modèles (`modeles_agents/consigne_*_etape5.md`).

### Ce qui reste ouvert

- Convention « 0 est à la fois positif et négatif » (A018, A023) : à confirmer par
  Marius.
- Attendus de 5e sans nœud : diviser par un décimal, traduire un programme de calcul
  en une seule expression, distributivité simple ; à placer à l'étape 6 ou 7.
- A024 cite le nombre premier comme « prolongement possible » de 5e et le programme
  de 2020 : à revoir si le programme change.
