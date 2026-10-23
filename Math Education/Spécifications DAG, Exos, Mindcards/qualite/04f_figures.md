## Figures : reprises et compétences à figure (14 octobre 2026)

**Livré :** l'application affiche des figures, décrites en JSON et dessinées
par `scripts/figures.py` (demi-droite, règle, horloge, quadrillage, partage,
bandes, monnaie). 30 exercices repris pour que la figure soit indispensable
(A028, C030, D019 lecture de graduations ; C026, D016, D018 partages et
monnaie), et les 5 compétences « à figure » de l'étape 4a reçoivent leurs
exercices (31). La banque passe à 667 exercices, 61 figures.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| F1 demi-droites (reprises CM1) | 20 | 1 | 5 | 3 |
| F2 partages et monnaie (reprises) | 10 | 1 | 3 | 2 |
| F3 règle et aire (P001, P017) | 13 | 0 | 2 | 3 |
| F4 horloges (P004, P007, P013) | 18 | 2 | 6 | 3 |

Aucune réponse fausse. Toutes les corrections ont été contre-relues ; les
contre-relectures ont trouvé 2 défauts de plus (une réponse juste refusée,
« 100 centièmes » ; une heure du soir acceptée dans un contexte du matin),
corrigés avant fusion.

### Ce que l'étape a appris

1. **« Peut-on répondre sans la figure ? » ne suffit pas.** Il faut aussi se
   demander « peut-on répondre en regardant la figure sans lire la
   graduation ? » : bonne réponse seule non entière (élimination), seule dans
   la bonne région du dessin (estimation), vrai/faux tranché par une valeur
   hors du dessin. Les trois défauts de fond de F1 relevaient de ce cas.
   Règles ajoutées à la consigne : « sans lire la graduation », « test de
   substitution » (changer les params doit changer la bonne réponse).
2. **Une partie des défauts relevait du dessin, pas du contenu** : aiguille
   des minutes trop courte pour se lire à la minute, chiffres masqués, pièces
   illisibles sur téléphone, portion de demi-droite prise pour une
   demi-droite d'origine 0. Corrigés une fois dans le générateur, pour toute
   la banque. Les relecteurs regardent désormais les figures à 360 px.
3. **Deux écritures d'une même valeur** (17/6 et 2 + 5/6) : la correction est
   binaire, refuser l'une compte un échec à un élève qui a lu juste. On
   accepte les deux, sauf quand l'écriture est l'objectif (fraction décimale
   en D019).

### Ce qui reste ouvert

- **Accessibilité** : le texte alternatif ne donne pas la réponse ; un élève
  aveugle ne peut donc pas faire ces exercices. À trancher avec Marius.
- **Outils** : superposition de surfaces, deux segments sur une même règle,
  générateurs de géométrie (segments, polygones, angles) pour l'étape 4b.
