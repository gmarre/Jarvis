## Lot B, calcul de base (3 octobre 2026)

Les trois dernières compétences vides du DAG v2.1 : **B001** (addition sans
retenue, CP), **B005** (multiplication par un chiffre, CE1) et **B006** (tables,
CE2). Elles bloquaient respectivement 18, 13 et 12 compétences en aval, et la
recette du 3 octobre a montré qu'un élève de CM1 typique tombait sur B005 dès sa
première session, avec un plan du jour vide.

**19 exercices** (6 pour B001, 7 pour B005, 6 pour B006), rédigés par Claude selon
les règles de `exercise-generator`, chaque réponse recalculée par script, puis
relus par un agent `math-reviewer` indépendant de l'auteur.

| Passe | Exercices | Bloquants | Importants | Mineurs | Taux d'erreur |
|---|---|---|---|---|---|
| Relecture agent | 18 | 0 | 8 | 7 | **0 %** |

Défauts importants relevés, tous corrigés :

1. **Bonne réponse toujours en « a »** dans les QCM. Systémique : les 44 QCM de la
   banque l'ont en « a », et `AnswerInput` affiche les choix dans l'ordre du
   fichier. Corrigé dans le lot. Le vrai correctif est côté application :
   mélanger les choix à l'affichage.
2. **Énoncés de CP plus longs que ceux de CE1** (19,7 mots contre 17,8). Ramenés
   à 17 en moyenne.
3. **Maîtrise qui n'en était pas une** : B001-M-02 (addition plus grande, sans
   transfert) devient un problème en deux étapes. La commutativité de B005 passe
   en entraînement, remplacée en maîtrise par un problème de partage.
4. **Opération hors de la chaîne de prérequis** : B005-M-02 demandait une
   soustraction avec passage de dizaine, alors qu'aucune compétence de
   soustraction n'existe dans le DAG. Un élève qui sait multiplier mais rate la
   soustraction aurait été diagnostiqué faux sur la multiplication.
5. Un distracteur quasi absurde (« 52 » pour 5 + 2), remplacé par l'erreur de
   surcomptage typique du CP.

La validation a ensuite levé deux avertissements légitimes (table de 7 reprise
du test de positionnement de B006, « maintenant » lu comme un renvoi), corrigés.

La fiche de relecture a enfin relevé des énoncés au-dessus du plafond de mots,
et un niveau non sourcé. Les énoncés ont été raccourcis (CP 14 mots, CE1 17,
CE2 14 en moyenne), et les trois compétences citent désormais le programme dans
le DAG. **Changement d'outil à connaître :** `build_review_sheet.py` comptait
chaque `●` d'une collection dessinée comme un mot, ce qui gonflait la charge de
lecture (24 « mots » de points sur un seul énoncé). Les symboles `●` et `○` ne
sont plus comptés.

### Ce qui reste ouvert

- **Le DAG n'a ni soustraction, ni addition avec retenue** (pas de B002 à B004).
  Le relecteur a dû écarter tout problème qui en avait besoin, alors que le
  programme du CE2 en contient. À arbitrer par Marius : ajouter ces compétences.
- **Contrôles à ajouter**, pour que ces défauts ne reviennent pas : position de
  la bonne réponse des QCM, plafond de mots par énoncé au CP et au CE1, et
  opérations d'un problème couvertes par les prérequis de la compétence.
- B001, B005 et B006 n'ont pas de carte mentale.
- Les 19 exercices sont en `brouillon` : **relecture humaine de Marius à faire.**

---

## Étape 1 : domaine B, calcul et opérations, CP à 6e (3 octobre 2026)

Première étape du plan d'extension (`PLAN_CONTENU.md`). Produite par agents :
un cartographe (nœuds du DAG d'après le programme), quatre rédacteurs en
parallèle, un rédacteur de cartes, cinq relecteurs indépendants, puis des
contre-relectures ciblées.

**Livré :** 18 compétences (B002, B003, B004, B007, B008, B012 à B017 repris du
v1 et re-nivelés ; B036 à B042 nouvelles), 11 prérequis ajoutés à des
compétences existantes, 108 exercices, 4 cartes mentales (MM-B-01 à MM-B-04).
Le domaine B passe de 3 à 21 compétences, la banque de 174 à 282 exercices.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| G1 addition, soustraction (+ B042) | 36 | 0 | 2 | 5 |
| G2 calcul CE1 à CM1 (+ B041) | 30 | 1 (nœud du DAG) | 8 | 6 |
| G3 division | 24 | 0 | 3 | 4 |
| G4 problèmes | 18 | 0 | 5 | 4 |
| Cartes mentales | 4 cartes | 1 (formulation) | 4 | 9 |

Aucune réponse fausse sur 108 exercices et 110 calculs de cartes. Les défauts
étaient tous de niveau, de méthode ou de forme, et tous ont été corrigés puis
contre-relus.

### Ce que l'étape a appris (reporté dans `exercise-generator.md`, 7e règle)

1. **Le niveau d'un nœud se joue dans ses citations.** B015 était au CE1 avec un
   attendu du CE2 : tous ses exercices en héritaient. Corrigé par scission
   (B015 au CE1, B041 au CE2) et par un contrôle nouveau.
2. **Les procédures du corrigé ont un niveau**, pas seulement les nombres :
   compter de 4 en 4 au CP, passer par la dizaine inférieure au CP, ont été
   retirés.
3. **Une opération sans nœud se voit dans les corrigés** : la multiplication
   posée additionnait des lignes à trois chiffres sans compétence en amont,
   d'où B042.
4. **« fois » ne s'emploie qu'au sens de ×** (« la moitié trois fois de suite »
   était faux à la lettre).

### Contrôles ajoutés au validateur

| Contrôle | Ce qu'il attrape |
|---|---|
| Notation `×` (après B005) et `÷` (après B039) | Un symbole employé avant la compétence qui l'introduit. A fait ajouter 8 liens vers des compétences A et C qui écrivaient déjà ces symboles. |
| Niveau des citations du DAG | Une compétence justifiée seulement par des attendus de classes postérieures (erreur), ou citant aussi une classe postérieure (avertissement : A014, C001, C005 à relire). |
| Position de la bonne réponse des QCM | 13 compétences existantes ont toujours leur bonne réponse en « a ». |
| Longueur moyenne des énoncés | C001, C003, C009 au-dessus du plafond du CE1. |

### Outillage

`check_lot.py` (valider un lot sur une copie, avant fusion), `merge_dag.py`
(fusionner compétences, liens et cartes). `set_review_status.py` corrigé : il
écrivait un champ interdit dans les métadonnées des cartes.

### Ce qui reste ouvert

- **Relecture humaine de Marius** des 108 exercices et 4 cartes, en particulier
  B004 (soustraction par cassage : le programme laisse l'école choisir entre
  cassage et compensation) et B002 au CP (addition posée avec retenue, conforme
  au programme mais inhabituel).
- **B005 limité aux tables de 1 à 5 au CE1**, alors que le programme du CE1
  demande les tables de 0 à 10 dans les deux sens. Cause profonde du problème de
  B015. À arbitrer.
- Notions du programme écartées pour cette étape : doubles et moitiés,
  « fois plus, fois moins », priorités opératoires sans parenthèses (5e).

---
