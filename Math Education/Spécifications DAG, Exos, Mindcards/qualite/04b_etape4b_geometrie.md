## Étape 4b : domaine G, espace et géométrie, CP à 6e (19 octobre 2026)

**Livré :** 30 compétences G001 à G030, numérotées dans l'ordre de la progression
(le v1 avait G001 à G044, aux niveaux souvent faux ; table de correspondance dans
`_travail/etape4b_dag_G.md`), 3 liens vers P (P010 ← G012, P023 ← G013, P026 ←
G020), 180 exercices, tous à figure, et 6 cartes mentales (MM-G-01 à 06). La banque
passe à 150 compétences, 847 exercices, 30 cartes. Quatre générateurs nouveaux
(`geometrie`, `rapporteur`, `solide`, `cubes`) et `quadrillage` étendu.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| L1 repérage, déplacements, patrons | 18 | 1 | 3 | 5 |
| L2 solides, assemblages de cubes | 24 | 1 | 4 | 9 |
| L3 premières figures (CP-CE1) | 36 | 2 | 15 | 2 |
| L4 figures usuelles (CE2-CM2) | 36 | 2 | 9 | 4 |
| L5 angles (CM1-6e) | 30 | 2 | 5 | 6 |
| L6 cercle, symétrie | 36 | 1 | 5 | 4 |
| Cartes mentales | 6 cartes | 1 | 6 | 12 |

Aucune réponse fausse sur 180 exercices : chaque réponse est recalculée depuis la
description de la figure. Toutes les corrections ont été contre-relues.

### Ce que l'étape a appris

1. **L'élève ne trace pas.** Les attendus « tracer, construire, plier » s'évaluent
   indirectement (lire, vérifier, repérer l'erreur, choisir parmi des figures,
   compléter un programme). 8 compétences sont marquées « évaluation partielle » :
   leur réussite ne prouve pas que l'élève sait construire.
2. **Un « vérifier » doit porter sur la figure.** « X dit : 6 carrés, donc c'est un
   patron » se réfute sans regarder ; une justification jointe (« car », « même
   si ») souffle la réponse. Deux bloquants par lot sur L3 et L4 venaient de là.
3. **Pastille et lettre.** L'application affiche la clé d'une proposition en
   majuscule : « La surface B » derrière la pastille « A » fait compter faux un
   élève qui a juste. Contrôle ajouté au validateur ; il a trouvé aussi trois
   exercices déjà publiés (P017, E006), corrigés.
4. **Le dessin, plus que le contenu, causait les défauts de lecture** : arêtes
   cachées confondues avec des arêtes visibles (prisme hexagonal), noms coupés par
   le quadrillage, chiffres du rapporteur rayés, longueurs posées sur un trait.
   Corrigés dans le générateur, pour toute la banque.
5. **Le programme fixe des frontières fines** : pas de mesure d'angle avant le
   CM2, pas de rapporteur avant la 6e, pas de carré parmi les rectangles au cycle
   2, « le segment [AB] » et jamais [AB] seul avant la 6e. Les deux dernières sont
   au validateur ; un instrument absent de l'écran (équerre) est remplacé par le
   coin d'une feuille posé sur l'écran.
6. **Une carte qui décrit la figure d'un exercice en donne la réponse** (la lettre
   H, un patron en croix). Le contrôle des couples des cartes lit désormais aussi
   réponses, propositions et paramètres des figures, et chaque exemple est comparé
   aux figures de la carte.

### Contrôles et outillage

- Générateurs : `geometrie` refuse un angle codé droit qui ne l'est pas, un angle
  presque droit (75 à 105 degrés), trois points presque alignés, des longueurs
  codées égales qui ne le sont pas (à 0,2 % près pour l'équilatéral).
- Validateur : symbole du degré (après G022), « rapporteur » et notations seules
  avant la 6e, pastille contre lettre.
- Correction : « 120° » sans espace, « 120 degrés » accepté.

### Ce qui reste ouvert

- **Accessibilité** : comme pour les figures précédentes, les exercices de
  géométrie ne sont pas faisables par un élève aveugle.
- **Dessins à venir** : règle et équerre posées (« repérer l'erreur » sur un
  instrument), pictogrammes pour le plan du CP, patron du pavé et vues d'un
  assemblage en 6e.
- Les 8 compétences à évaluation partielle sont à signaler à Marius pour la recette.
