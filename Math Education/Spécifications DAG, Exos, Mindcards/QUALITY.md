# Suivi qualité du contenu

> Journal des relectures, du taux d'erreur par lot et des ajustements de prompt.
> Exigé par la roadmap §1.4 : « Si le taux d'erreur d'un lot dépasse ~5 %, revoir le prompt de génération avant de continuer. »

---

## Lot 001 — Tranche pilote CP à 4e, 69 exercices

| | |
|---|---|
| **Contenu** | 23 compétences (domaines A et C), 3 exercices chacune |
| **Généré le** | 28 juillet 2026 |
| **Relu par l'agent le** | 19 août 2026 |
| **Relu par Marius le** | à faire |
| **Taux d'erreur (défauts bloquants)** | **17,4 %** (12 / 69) |
| **Seuil roadmap** | 5 % |
| **Verdict** | **Au-dessus du seuil. Corriger la cause avant de générer un nouveau lot.** |

### Répartition

| Gravité | Nombre | Signification |
|---|---|---|
| Bloquant | 12 exercices | Hors programme du niveau visé. Ne peut pas être montré à un élève. |
| Important | 9 exercices | Compétence mal attribuée, progression cassée, énoncé ambigu. |
| Mineur | 11 exercices | Formulation, `accepted` incomplet, misconception peu plausible. |
| Sans défaut | 39 exercices | 56,5 % du lot. |

### Ce qui est bon

**Zéro erreur de calcul sur 69 exercices.** 76 recalculs indépendants par script Python : valeurs attendues, chaque étape de corrigé, unicité de la bonne réponse des QCM, réfutation de chaque distracteur, tris, PGCD, arithmétique des fractions. Aucun écart.

Aucun QCM à deux réponses mathématiquement défendables. Aucune incohérence entre énoncé et corrigé. Les 23 compétences ont bien leurs trois niveaux.

Les exercices de cycle 4 (C007, C008, C010, C011) sont les plus solides du lot.

### La cause unique des 12 bloquants

Le générateur **calcule juste mais ignore les bornes du champ numérique du niveau**. Les 12 défauts se répartissent en exactement deux familles.

**Famille 1 — plafond d'entiers du CE1 dépassé (7 exercices)**
`EX-A004-D-01`, `EX-A004-M-01`, `EX-A005-E-01`, `EX-A006-E-01`, `EX-A008-D-01`, `EX-A008-E-01`, `EX-A008-M-01`

> « Les connaissances et savoir-faire attendus concernent les nombres jusqu'à mille. »
> — Cycle 2, CE1, *Les nombres entiers*

Or ces exercices utilisent 2 047, 1 090, 3 205, 4 302 et 1 024.

**Famille 2 — liste des dénominateurs autorisés ignorée (5 exercices)**
`EX-C009-D-01`, `EX-C009-M-01`, `EX-C012-D-01`, `EX-C006-E-01`, `EX-C006-M-01`

> « Les fractions rencontrées au CE1 ont un dénominateur égal à 2, 3, 4, 5, 6, 8 ou 10. »
> « Les fractions rencontrées au CE2 ont un dénominateur inférieur ou égal à douze et sont toutes inférieures ou égales à un. »
> — Cycle 2, *Les fractions*

Or ces exercices utilisent des septièmes, des neuvièmes, des quinzièmes et des vingtièmes.

### Cause racine : le DAG lui-même

**Quatre `validation_test` du DAG v2 sont eux-mêmes hors programme.** Le générateur a fidèlement suivi une consigne fausse.

| Compétence | Niveau | `validation_test` fautif | Problème |
|---|---|---|---|
| A004 | CE1 | « Lire correctement le nombre 2 047 » | plafond CE1 = mille |
| A008 | CE1 | « Combien de chiffres dans 1 024 ? » | idem |
| C009 | CE1 | « Comparer 3/7 et 5/7 » | 7 hors liste |
| C012 | CE1 | « Calculer 2/7 + 3/7 » | idem, alors que le programme donne l'exemple 1/5 + 2/5 |

**Corriger les exercices sans corriger le DAG les fera réapparaître à la prochaine génération.** C'est le correctif prioritaire.

### Signal de détection gratuit

Cinq exercices portent un `programme_ref` citant un niveau **supérieur** à celui de leur compétence : `EX-A005-E-01` et `EX-A006-E-01` citent le CE2 pour une compétence CE1, `EX-A008-M-01` cite le CE2, `EX-C005-E-01` cite le CM1 pour une compétence CE2, et `EX-C006-E-01` cite la **5e** pour une compétence **CE2**.

Le générateur s'auto-dénonce. Un contrôle automatique comparant le niveau cité dans `programme_ref` au `school_level` de la compétence aurait attrapé 5 des 12 bloquants sans aucune intelligence.

### Actions

- [x] Corriger les 4 `validation_test` hors programme du DAG v2 *(19/08)*
- [x] Corriger les 12 exercices bloquants *(19/08)*
- [x] Ajouter à `validate_content.py` un contrôle des bornes de champ numérique par niveau *(19/08)*
- [x] Ajouter à `validate_content.py` le contrôle `programme_ref` contre `school_level` *(19/08)*
- [x] Synchroniser la copie de l'application (`Math_Edu_Application/src/content/`) *(19/08)*
- [x] Traiter les 9 défauts importants *(19/08)*
- [ ] **Seconde passe de l'agent sur les 22 exercices modifiés** (voir ci-dessous)
- [ ] Injecter les bornes du niveau en consigne dure dans le prompt de `exercise-generator`
- [ ] Contraindre explicitement `maitrise` à être plus difficile que `entrainement` dans le prompt
- [ ] Traiter les 11 défauts mineurs
- [ ] Combler le manque de compétence « comparer des fractions de numérateur 1 » (voir ci-dessous)
- [ ] Relecture humaine de Marius, puis passage en `valide`

### Correctifs appliqués le 19 août 2026

**DAG v2, `validation_test`**

| Compétence | Avant | Après |
|---|---|---|
| A004 | Lire correctement le nombre 2 047 | Lire correctement le nombre 407 |
| A008 | Combien de chiffres dans 1 024 ? | Combien de chiffres dans 407 ? |
| C009 | Comparer 3/7 et 5/7 | Comparer 2/5 et 3/5 |
| C012 | Calculer 2/7 + 3/7 | Calculer 1/5 + 2/5 |

**Exercices** — l'obstacle pédagogique visé est conservé dans chaque cas.

| Exercice | Avant | Après | Obstacle conservé |
|---|---|---|---|
| EX-A004-D-01 | lire 2 047 | lire 407 | zéro intercalé non prononcé |
| EX-A004-M-01 | lire 1 090 | lire 190 | « quatre-vingt-dix » + zéro final |
| EX-A005-E-01 | écrire 3 205 | écrire 590 | rang vide à écrire explicitement |
| EX-A006-E-01 | 4 302 et 4 320 | 302 et 320 | comparaison rang par rang, chiffres permutés |
| EX-A008-D-01 | 1 024 | 407 | compter les chiffres |
| EX-A008-E-01 | 1 024 | 362 | chiffre des dizaines |
| EX-A008-M-01 | nombre de dizaines de 1 024 | 99 s'écrit-il avec plus de chiffres que 100 ? | distinction chiffre / nombre, ramenée au CE1 |
| EX-C009-D-01 | 3/7 et 5/7 | 3/8 et 5/8 | comparaison à dénominateur égal |
| EX-C009-M-01 | 7/9, 2/9, 5/9 | 7/10, 2/10, 5/10 | tri à dénominateur égal |
| EX-C012-D-01 | 2/7 + 3/7 | 1/5 + 2/5 | addition à dénominateur égal (exemple littéral du programme) |
| EX-C006-E-01 | 2/3 = …/15 | 2/3 = …/12 | facteur commun à appliquer en haut et en bas |
| EX-C006-M-01 | 4 propositions dont 15/20 | 3 propositions | repérer l'intrus 5/6 |

L'ancien EX-A008-M-01 portait en réalité sur les unités de numération (CE2), c'est-à-dire sur la compétence A009 et non A008. Il a été remplacé par un item de CE1, et non simplement re-numéroté.

**Nouveaux contrôles automatiques** (`scripts/validate_content.py`)

- `check_champ_numerique` : plafond d'entiers et dénominateurs autorisés par niveau. Bloquant sur l'énoncé et la réponse, avertissement sur les propositions et le corrigé, un distracteur pouvant légitimement sortir du champ pour matérialiser une erreur.
- `check_programme_ref` : compare le niveau cité en référence au `school_level` de la compétence. Avertissement seulement, car citer un programme de niveau supérieur qui décrit un niveau inférieur est légitime (le programme de 6e est celui qui indique que les fractions débutent au CE1).

Rejoués sur le lot corrigé : **0 erreur**. Les deux contrôles auraient détecté les 12 bloquants sans intervention humaine.

### Défauts importants corrigés le 19 août 2026

| Exercice | Défaut | Correctif |
|---|---|---|
| EX-A001-M-01 | Évaluait le rangement d'une liste, c'est-à-dire A007 et non « compter jusqu'à 10 » | Remplacé par un item sur l'**invariance du cardinal** : compter dans un autre ordre donne le même total. C'est un vrai attendu de maîtrise du dénombrement au CP. |
| EX-A005-E-01 / M-01 | La maîtrise (999) était plus facile que l'entraînement (3 205) | Intervertis. L'entraînement est 999, difficulté purement lexicale. La maîtrise est 590, qui cumule le lexique et le rang vide à écrire. |
| EX-A009-M-01 | La maîtrise redescendait à une simple lecture de rang, déjà faite en découverte | Devient « nombre de dizaines de 6 304 » (630). C'est l'item qui avait été retiré de A008, replacé ici où il relève bien du CE2. |
| EX-C002-M-01 | La réponse figurait littéralement dans l'énoncé | Devient un calcul de complément : 8 parts, 3 vertes, quel numérateur pour le jaune ? |
| EX-C009-E-01 | Comparait 1/5 et 1/3, soit des dénominateurs différents, sous une compétence « même dénominateur » | Remplacé par une comparaison contextualisée à dénominateur égal (2/6 et 5/6). |
| EX-C005-D-01 | « À quelle graduation se trouve 3/4 ? » : un élève qui comprend peut légitimement répondre « 3/4 » et être compté faux | Reformulé en « combien d'intervalles faut-il parcourir », et `accepted` complété. |
| EX-C005-E-01 | Utilisait une demi-droite graduée, notion de CM1, pour une compétence de CE2 | Reformulé en bande-unité, et `programme_ref` ramené au CE2. |
| EX-C010-D-01 | Misconception factuellement fausse : « un écart de 1 dans les deux cas », or 3−2=1 et 5−3=2 | Misconception réécrite. |
| EX-C010-M-01 | La proposition c décrivait une méthode correcte, donc défendable, et n'était pas une comparaison comme les deux autres | Remplacée par une troisième comparaison. La remarque sur la longueur de la méthode est passée dans le corrigé. |

### Gap identifié dans le DAG

Le programme du CE1 comporte **deux** objectifs distincts de comparaison :

> « Comparer des fractions ayant le même dénominateur. »
> « Comparer des fractions dont le numérateur est 1. »

Le DAG v2 ne couvre que le premier, avec C009. Le second n'a **aucune compétence**, alors que c'est un obstacle majeur : c'est là que se joue l'idée contre-intuitive que 1/5 < 1/3. L'exercice qui le traitait était rangé sous C009 par défaut, ce qui faussait la mesure de maîtrise.

À arbitrer : créer une compétence dédiée, ou élargir C009. Tant que ce n'est pas tranché, cet attendu du programme n'est pas couvert.

### Exercices modifiés après la relecture

**22 exercices ont été modifiés après le passage de l'agent**, dont **5 entièrement réécrits** : EX-A001-M-01, EX-A008-M-01, EX-A009-M-01, EX-C002-M-01, EX-C009-E-01.

Ces 5 contiennent du contenu que le relecteur n'a jamais examiné. Les 17 autres sont des substitutions de valeurs dans une structure déjà relue.

**Conséquence :** une seconde passe de l'agent sur ces 22 exercices est nécessaire avant la relecture humaine. Sans quoi la double validation ne serait pas respectée pour un tiers du lot.

Liste complète : EX-A001-M-01, EX-A004-D-01, EX-A004-M-01, EX-A005-E-01, EX-A005-M-01, EX-A006-E-01, EX-A006-M-01, EX-A008-D-01, EX-A008-E-01, EX-A008-M-01, EX-A009-M-01, EX-C002-M-01, EX-C005-D-01, EX-C005-E-01, EX-C006-E-01, EX-C006-M-01, EX-C009-D-01, EX-C009-E-01, EX-C009-M-01, EX-C010-D-01, EX-C010-M-01, EX-C012-D-01.

### Avertissements restants, à arbitrer par Marius

| Exercice | Avertissement | Enjeu |
|---|---|---|
| EX-A002-M-01 | distracteur 413 au CP (plafond 100) | Le distracteur matérialise une transcription mot à mot de « quatre-vingt-treize ». Le garder suppose d'accepter qu'un élève de CP voie un nombre à 3 chiffres. |
| EX-C001-D-01 | distracteurs 4/3 et 3/7 au CE1 | 4/3 est l'inversion classique, 3/7 l'addition parts prises + parts restantes. Deux erreurs authentiques, mais hors du champ du CE1. |
| EX-C001-E-01 | distracteur 5/2 au CE1 | Idem, inversion numérateur/dénominateur. |

La question de fond est la même dans les trois cas : **accepte-t-on qu'un distracteur sorte du champ du niveau ?** Un distracteur a vocation à être faux, et 4/3 comme 5/2 matérialisent l'inversion numérateur/dénominateur, qui est l'erreur la plus fréquente au CE1. Mais les afficher revient à montrer à un élève de CE1 une fraction supérieure à 1, qu'il ne rencontrera qu'au CM1. C'est un arbitrage pédagogique, pas un point technique.

### Note de méthode

L'agent a produit une affirmation fausse dans son rapport : il signalait comme inexistante la citation « L'élève sait dire et expliquer pourquoi 1/5 est plus petit que 1/3 ». Elle figure bien au programme du CE1. L'agent ne l'a pas trouvée parce que l'extraction PDF sépare le numérateur et le dénominateur sur deux lignes, ce qui casse la recherche textuelle sur « 1/5 ».

**Conséquence pour les relectures suivantes :** le rapport de l'agent doit être vérifié, en particulier toute affirmation du type « cette citation n'existe pas ». La limite est dans l'extraction des PDF, pas dans le programme.
