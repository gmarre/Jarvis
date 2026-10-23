## Tranche pilote : complément à 6 exercices par compétence (20 octobre 2026)

**Livré :** 69 exercices (D-02, E-02, M-02) pour les 23 compétences de la tranche
pilote qui n'en avaient que 3 (A001 à A011, C001 à C012, du CP à la 3e), dont 19
à figure. Plus aucune compétence sous 6 exercices : la banque passe à 1 036
exercices. Avant ce complément, la même journée : citations du programme pour
A004, A005, A006, A008 ; énoncés de C001, C003, C009 sous le plafond du CE1 ; les
6 anciennes cartes en brouillon remises au niveau.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| P1 A001-A006 (CP, CE1) | 18 | 0 | 2 | 5 |
| P2 A007-A011 (CE1, CE2) | 15 | 0 | 2 | 6 |
| P3 C001-C006 | 18 | 0 | 5 | 1 |
| P4 C007-C012 | 18 | 2 | 2 | 6 |

Aucune réponse fausse. Les deux bloquants de P4 étaient des **trous du DAG**,
pas des erreurs de calcul : trois liens ajoutés (C011 ← C012, C012 ← B004,
C008 ← A025).

### Ce que l'étape a appris

1. **Le clavier du téléphone fait partie de l'exercice.** Un exercice
   `numerique` ouvre le pavé décimal, qui n'a ni « / » ni, sur iPhone, de signe
   moins : une fraction se demande en `texte`, et l'application ajoute un bouton
   « ± » à partir de la 5e.
2. **Une maîtrise doit être plus exigeante qu'une découverte** : un vrai/faux
   (une chance sur deux) ou une situation d'addition déguisée en comptage
   ne mesurent pas la compétence visée.
3. **« Le bout du dessin, c'est 1 »** : une droite graduée de maîtrise doit
   continuer après 1, sinon l'erreur classique donne la bonne réponse.
4. **Le contrôle de chaîne reste manuel et c'est là que naissent les
   bloquants** : critères de divisibilité, soustraction avec retenue. Le
   relecteur propose que `check_lot.py` signale les marqueurs hors chaîne
   (« somme des chiffres », « nombre premier », soustraction sans B003).

### Ce qui reste ouvert

- EX-C030-D-01, E-03 et M-02 (déjà publiés) demandent une fraction en
  `numerique` : à passer en `texte`.
- EX-C010-D-02 reprend 5/6 et 7/10 d'autres exercices de C010 (mineur).
- Le distracteur 30014 de EX-A005-D-02 sort du champ du CE1, gardé
  volontairement (erreur réelle).
