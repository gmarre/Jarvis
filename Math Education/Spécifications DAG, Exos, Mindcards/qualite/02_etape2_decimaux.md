## Étape 2 : domaine D, nombres décimaux, CE1 à 6e (4 octobre 2026)

**Livré :** 19 compétences (D001, D003, D004, D006, D007, D008, D009, D012, D014
repris du v1 et re-nivelés ; D016 à D025 nouvelles), 1 prérequis ajouté à une
compétence existante (C032 ← D007), 114 exercices, 4 cartes mentales
(MM-D-01 à MM-D-04). Le domaine D apparaît ; la banque passe à 75 compétences,
396 exercices, 14 cartes. Même circuit qu'à l'étape 1, sur un contenu désormais
découpé en petits fichiers.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| G1 monnaie, écriture à virgule | 30 | 0 | 3 | 4 |
| G2 comparer, placer, arrondir | 30 | 1 | 4 | 1 |
| G3 opérations, conversions, division | 30 | 0 | 1 | 6 |
| G4 multiplier | 24 | 1 | 5 | 7 |
| Cartes mentales | 4 cartes | 1 (niveau) | 4 | 4 |

Aucune réponse fausse sur 114 exercices. Les deux bloquants d'exercices : un
encadrement en saisie libre sans « qui se suivent » (41 réponses justes, une
seule acceptée), et une phrase d'explication fausse sur la place d'une virgule.
Toutes les corrections ont été contre-relues.

### Ce que l'étape a appris

1. **Le niveau d'une convention, pas seulement d'une notion.** La règle
   « pile au milieu, on arrondit au-dessus » apparaissait au CM1 dans une carte,
   alors que le programme ne l'énonce qu'en 6e et que les exercices de CM1
   l'évitaient. Cartes et exercices doivent suivre la même convention.
2. **Une question à plusieurs réponses justes ne se pose pas en saisie libre**
   (encadrer, intercaler, ranger) : QCM, vrai/faux, ou « qui se suivent ».
3. **Les antislashs se perdent à chaque réécriture de JSON** : `\times` devient
   une tabulation, `\frac` un saut de page. Arrivé trois fois à l'étape 2, et
   deux exercices de l'étape 1 étaient déjà touchés en banque (EX-B038-D-01,
   E-01, réparés). Le validateur détecte désormais la tabulation et les
   commandes LaTeX privées de leur antislash.
4. **Le corrigé affichait « 3.5 »** à un élève à qui l'on apprend la virgule :
   corrigé dans le moteur avant la rédaction (`formatExpected`).

### Contrôles et outillage

- Fractions décimales (dénominateurs 10, 100, 1 000) autorisées au-delà du
  plafond de dénominateur, comme le prévoit le cycle 3.
- Notation contrôlée : la virgule décimale, après D016 (sommes d'argent, CE1),
  y compris écrite `{,}` dans une formule.
- Tabulation et commandes LaTeX sans antislash détectées.

### Ce qui reste ouvert

- **Figures à produire** (l'application n'affiche pas encore `image`) :
  - D019, les 6 exercices : demi-droites graduées (le texte livre aujourd'hui la
    valeur d'une graduation, que l'élève devrait lire sur la figure) ;
  - D018-D-01 (carré de 100 carreaux, 37 coloriés), D018-D-02 (unité partagée
    en dixièmes puis en centièmes), D016-E-02 (pièces) ;
  - cartes MM-D-01 et MM-D-02 (fractions décimales, demi-droite).
- **Saisie dans l'application** : une réponse tapée avec un zéro final ET son
  unité (« 2,80 m ») est refusée ; les milliers s'affichent sans espace dans le
  corrigé (« 1250 g »).
- A007 (ranger des entiers) est classée au CE2, alors que le CE1 demande déjà
  d'ordonner quatre prix : à revoir dans le domaine A.
