# Suivi qualité du contenu

---

## Lot 001 ter — Relecture finale des 69 (20 août 2026)

| | |
|---|---|
| Taux d'erreur | **2 / 69 = 2,9 %** (17,4 % → 4,5 % → 2,9 %) |
| Recalculs | 69 valeurs, 52 égalités de corrigé, 34 comparaisons, 21 QCM avec réfutation de chaque distracteur : **0 désaccord** |
| Verdict de l'agent | 67 des 69 pouvaient passer en `relu_agent` |
| **État après correction** | **les 69 sont en `relu_agent`**, prêts pour la relecture humaine |

### Les 2 bloquants : une distinction CM1 / CM2 que j'avais manquée

`EX-C004-E-01` (3/4 de 20) et `EX-C004-M-01` (3/7 de 28) étaient au CM1 avec des fractions **non unitaires**. Le programme est explicite et le contraste est délibéré :

> « au CM1, les fractions acquièrent le statut d'opérateur multiplicatif **pour le cas particulier des fractions unitaires** ; comme **un tiers** de 12 billes ou **un quart** de 100 mètres. »
> « au CM2, les élèves apprennent à calculer des fractions de quantités comme **deux tiers** de 12 € ou **trois quarts** de 100 mètres. »

« Trois quarts de 20 » est un attendu de **CM2**, pas de CM1.

Corrigés : E-01 devient « un quart de 100 mètres », l'exemple littéral du CM1 ; M-01 devient un problème inverse, « le tiers de son argent vaut 7 €, combien avait-elle ? », qui reste unitaire tout en exigeant de raisonner à l'envers.

**Le contrôle automatique ne pouvait pas les voir** : la borne violée n'est pas le dénominateur mais le **numérateur**, qui doit valoir 1 à ce niveau.

### Cause racine, cinquième occurrence du même mécanisme

`C004.validation_test` valait « Calculer 3/4 de 20 », c'est-à-dire l'énoncé fautif lui-même. Le générateur suivait fidèlement une consigne fausse. C'était déjà le cas de A004, A008, C009 et C012, corrigés un par un aux passes précédentes.

**Sixième contrôle ajouté** à `validate_content.py` : `check_validation_tests` applique le champ numérique du niveau aux 38 tests de positionnement du DAG. Il a immédiatement trouvé `A006` (« Comparer 4 302 et 4 320 » au CE1, plafonné à mille), que j'avais laissé passer en corrigeant seulement les compétences signalées.

Trois tests corrigés : `A003`, `A005`, `A006`.

**Limite connue du contrôle** : il ne détecte pas les nombres écrits **en lettres**. `A005` demandait d'écrire « trois mille deux cent cinq » au CE1 ; seule une lecture humaine l'a vu.

### Défaut systématique n°3 : toujours pas éteint

L'agent relève trois nouvelles occurrences de « corriger l'instance et non la classe », toutes commises le 20 août, c'est-à-dire **le jour même où la règle de processus a été adoptée** : le mot « demi-droite » laissé sur `C005-M-01` alors que `C005-E-01` avait été corrigé pour ce motif, l'orthographe rectifiée appliquée aux énoncés mais pas aux corrigés, et des inversions de progression laissées sur `A007` et `A003`.

C'est le défaut le plus tenace du projet. Il ne se corrige pas par une consigne mais par un contrôle automatique : à ce jour, six contrôles ont été ajoutés, chacun après avoir découvert que le défaut qu'il détecte existait en plusieurs exemplaires.

### Reste à traiter, non bloquant

`EX-C003-M-01` évalue en réalité C026, compétence désormais créée mais toujours sans exercice ; `EX-A007-M-01` et `EX-A003-M-01` ont une progression inversée ; 14 défauts mineurs de formulation.

---

---

## Lot 001 bis — Seconde relecture, 22 exercices modifiés (19-20 août 2026)

| | |
|---|---|
| Périmètre | les 22 exercices retouchés après la première relecture, dont 5 entièrement réécrits |
| Taux d'erreur | **1 / 22 = 4,5 %** (contre 17,4 % au premier passage) |
| Recalculs | 40 vérifications indépendantes, **0 désaccord** |
| Champ numérique | conforme sur les 22 |
| Substitutions | diff champ par champ contre la version d'origine : **aucun résidu** des anciennes valeurs |

Les 12 bloquants du premier lot sont bien corrigés, aucun n'est réapparu, et aucune erreur de calcul n'a été introduite.

### Le bloquant

`EX-C009-E-01` décrivait une situation **impossible** : « Tom a mangé 2/6 d'une tarte. Lisa **en** a mangé 5/6 », le pronom renvoyant à la même tarte, soit 7/6 d'un tout. Le corrigé, lui, parlait de « deux cas », donc de deux tartes. Énoncé et corrigé ne décrivaient pas la même situation.

**Corrigé le 20/08** : les deux touts sont désormais explicitement dissociés, et le corrigé retourne le piège en montrant que 2/6 + 5/6 dépasserait la tarte entière.

### Défaut systématique n°2 : l'exemple de format donne la réponse

Le générateur écrivait « Écris ta réponse sous la forme *X* » en choisissant systématiquement pour *X* **la réponse elle-même**. L'exercice devient vide : l'élève recopie, et rien ne distingue plus celui qui sait de celui qui ne sait pas.

**11 exercices sur les 12** où le gabarit s'appliquait étaient touchés. Le seul épargné était celui que la première relecture avait fait réécrire pour ce motif.

Pire : pendant la rédaction du rapport, **12 nouveaux exercices ont été produits avec le même défaut**. Le gabarit fautif s'est même propagé lors des substitutions de valeurs (« sous la forme 5/7 » est devenu « sous la forme 3/5 »).

**Corrigé le 20/08 sur les 23 exercices concernés**, banque et lots en attente confondus, par un script traitant la classe entière et non les instances signalées. Les exemples sont remplacés par des formes génériques : « numérateur/dénominateur », « d'un entier plus une fraction », « entier < fraction < entier ».

**Contrôle automatique ajouté** à `validate_content.py` : `check_exemple_format` compare l'exemple de format à la réponse, à ses éléments et à son début. Il aurait attrapé les 23 sans intervention humaine.

**Consignes ajoutées** à l'agent `exercise-generator` : règle 3 (l'exemple ne donne jamais la réponse) et règle 4 (une situation doit pouvoir exister, énoncé et corrigé doivent décrire la même chose).

### Défaut systématique n°3 : corriger l'instance et non la classe

C'est le mécanisme le plus coûteux, et il relève du processus, pas du prompt. Trois occurrences constatées sur cette seule passe :

- le défaut « la réponse figure dans l'énoncé » a été corrigé sur l'exercice signalé, et les 11 autres exercices atteints n'ont pas été relus ;
- une misconception fausse a été remplacée par un texte faible, aussitôt recopié sur un second exercice, créant un défaut là où il n'y en avait pas ;
- la suppression d'une proposition hors champ a rempli au passage un champ `misconception` qui valait `null`, produisant une régression collatérale.

**Règle de processus adoptée :** tout défaut relevé sur un exercice doit d'abord être requalifié en question, « ce défaut existe-t-il ailleurs ? », et balayé sur tout le fichier **par script** avant qu'une seule correction ne soit écrite.

### Reste à traiter

Défauts importants et mineurs identifiés mais **non corrigés** à ce stade :

| Exercice | Défaut | Gravité |
|---|---|---|
| EX-C005-D-01, EX-C005-E-01 | compétence intrinsèquement graphique, sans illustration (`image: null`) | important |
| EX-C010-D/E/M | progression non croissante : la maîtrise est la plus rapide des trois | important |
| EX-A004, EX-A005 (4 exercices) | orthographe non rectifiée : « quatre cent sept » au lieu de « quatre-cent-sept », alors qu'Eduscol relie tous les éléments | mineur |
| EX-C006-M-01 | `misconception` non nulle sur la bonne réponse, seul cas du fichier ; l'app l'affiche à un élève qui a juste | mineur |
| EX-A006-M-01, EX-C010-D-01, EX-C010-M-01, EX-A001-M-01 | misconceptions peu plausibles ou charge de lecture excessive | mineur |

---

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

---

## Relecture du 22/08/2026 — les 84 exercices des domaines A et C

Quatre agents `math-reviewer` en parallèle, 21 exercices chacun, sur A012, A013,
A014, A026, A027, A028, C026, C027, C029, C030, C031, C032.

### Exactitude mathématique : zéro erreur sur 84

Les quatre agents ont recalculé par machine toutes les réponses, toutes les
étapes de corrigé, toutes les listes de diviseurs et toutes les conversions de
fractions. **Aucune réponse fausse, aucun distracteur mathématiquement juste
présenté comme faux** en dehors des deux QCM signalés ci-dessous.

C'est un changement de nature des défauts : le générateur ne se trompe plus sur
les nombres, il se trompe sur la valeur pédagogique de la question posée.

### Défauts bloquants (7)

| Exercice | Défaut |
|---|---|
| EX-C009-D-01, EX-C026-D-01, EX-C029-D-02, EX-C029-E-03 | `\frac` écrit avec un seul antislash : le parseur JSON produit un U+000C, l'élève lit `$␌rac{3}{8}$`. Quatre exercices infaisables, 12 zones de texte touchées. |
| EX-A028-M-02 | QCM à deux réponses défendables : le distracteur « Entre 9 000 et 10 000 » est vrai. |
| EX-C027-M-01 | QCM à deux réponses défendables : le distracteur propose $1 + \frac{5}{4}$, qui vaut effectivement $\frac{9}{4}$. Sa `misconception` était en outre factuellement fausse. |
| EX-A028-E-03 | Le corrigé comptait des intervalles là où l'énoncé parlait de graduations. |

Les quatre antislashs ont été introduits par une correction manuelle, en réponse
au retour V1.2 de Marius. **Une correction faite à la main sans repasser la
validation est elle-même une source de défauts bloquants.**

### Le défaut structurel : la compétence contournée faute d'image

A028 (« placer un entier sur une demi-droite graduée ») et C030 (« placer une
fraction ») n'ont aucune illustration. Le générateur a compensé en décrivant la
demi-droite entièrement par le texte : pas, origine, position. Résultat, les 14
exercices se résolvent par le calcul et **un élève incapable de lire une
graduation les réussit tous les quatorze**. La même mécanique joue sur C026,
compétence de partage visuel au CE1 dont aucun des 7 exercices ne porte d'image.

Ce n'est pas un défaut de rédaction, et il n'a pas de correction textuelle :
c'est la validité de trois compétences qui dépend de la production des figures.
Les schémas ASCII ayant été rejetés, aucun repli n'existe.

### Corrections appliquées

**43 exercices modifiés, 2 créés** (EX-A027-D-03 sur les multiples communs et
EX-C027-D-03 sur le sens réciproque, deux notions qui démarraient directement au
niveau entraînement). Les corrections sont tracées dans `_travail/rapport_lot*.md`.

Corrections notables au-delà des bloquants :

- EX-A013-E-03 évaluait A012 et non A013 ;
- EX-A026-E-03 était plus difficile que les deux exercices de maîtrise de sa
  compétence : son contenu et celui de EX-A026-M-01 ont été échangés ;
- EX-C032-E-03 et EX-C032-M-02 étaient réussissables par recopie, la réponse
  figurant en toutes lettres dans l'énoncé ;
- les cinq énoncés de C026 qui dépassaient le plafond de 20 mots du CE1 sont
  repassés dessous ;
- « cran » remplacé par « graduation » dans tout C030, pour s'aligner sur A028
  qui porte la même notion au même niveau.

### Ce que l'audit a révélé au-delà des quatre lots

Deux défauts que les agents ont vus sur leur périmètre se sont avérés systémiques
une fois mesurés sur la banque entière :

1. **Le `validation_test` recopié dans l'exercice de découverte** : 19 compétences
   sur 35. L'élève envoyé travailler une compétence parce qu'il a raté le test de
   positionnement y retrouvait exactement le même item. Les 19 tests ont été
   réécrits avec d'autres nombres, les exercices n'ont pas bougé.
2. **Le schéma ASCII rejeté par Marius était toujours présent** dans EX-C005-D-01
   et EX-C005-E-01. Il avait été retiré d'un exercice, pas de la classe.

### Sept contrôles ajoutés, dix au total

| Contrôle | Ce qu'il attrape | Gravité |
|---|---|---|
| `check_notations` étendu aux corrigés et indices | Une notation employée avant la compétence qui l'introduit. L'élève lit le corrigé autant que l'énoncé : 7 exercices employaient `<` et `>` au CE1 dans leurs corrigés, dont 2 hors des lots relus. | erreur |
| `check_caracteres_controle` | Antislash non doublé dans le JSON, et tout caractère U+0000–U+001F. | erreur |
| `check_schema_ascii` | Figure dessinée en caractères. | erreur |
| `check_test_recopie` | Découverte reprenant les nombres du test de positionnement. | avertissement |
| `check_reponses_dupliquees` | Deux exercices d'une compétence attendant la même réponse. | avertissement |
| `check_enonce_orphelin` | Énoncé supposant que le précédent vient d'être servi, tant que le champ `serie` n'existe pas. | avertissement |

**Principe confirmé une fois de plus :** chaque défaut trouvé par un humain ou un
agent doit devenir un contrôle, sinon il revient. Les trois quarts des défauts de
cette passe étaient des réapparitions de classes déjà rencontrées.

### Ce qui reste ouvert

- **Les figures de A028, C030 et C026.** Producteur, format et rendu dans
  l'application ne sont toujours pas décidés. C'est le premier point bloquant.
- **Le champ `serie`**, toujours absent du schéma : cinq énoncés ont dû être
  rendus autonomes alors qu'ils gagneraient à être enchaînés.
- **Aucune compétence du DAG n'introduit la division.** Le domaine B s'arrête aux
  tables de multiplication du CE2, alors que `÷` et la division euclidienne sont
  employés dans A026, C027 et C032. `check_notations` est prêt à l'attraper, il
  manque la compétence.
- Les niveaux de A004, A005, A006 et A008 restent non sourcés.
- Les énoncés de C001, C003 et C009 restent au-dessus du plafond du CE1.

---

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

## Étape 3 : domaine E, proportionnalité et pourcentages, CM1 à 5e (5 octobre 2026)

**Livré :** 17 compétences E (E003, E006, E007, E010, E023 repris du v1 et
re-nivelés ; E026 à E037 nouvelles), 1 compétence B ajoutée (B043, comparaison
multiplicative « fois plus, fois moins », CE2), 108 exercices, 4 cartes mentales
(MM-E-01 à MM-E-04) et MM-B-04 étendue à B043. La banque passe à 93 compétences,
504 exercices, 18 cartes. Même circuit : cartographe, 4 rédacteurs, 4 relecteurs
indépendants, corrections par les rédacteurs d'origine, contre-relecture.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| G1 proportionnalité en phrases (CE2-CM2) | 30 | 0 | 3 | 6 |
| G2 6e : unité, tableau, échelle | 24 | 0 | 6 | 5 |
| G3 pourcentages (6e-5e) | 30 | 0 | 2 | 4 |
| G4 5e : coefficient, vitesse, graphique | 24 | 0 | 1 | 4 |
| Cartes mentales | 5 cartes | 0 | 7 | 14 |

Aucune réponse fausse et aucun défaut bloquant sur 108 exercices et 5 cartes.
Toutes les corrections ont été contre-relues.

### Ce que l'étape a appris

1. **Le v1 construisait le domaine sur des outils que le programme exclut.**
   Ratio, produit en croix, quatrième proportionnelle : « ni l'utilisation du
   coefficient de proportionnalité, ni le recours au produit en croix ne sont
   enseignés au cours moyen » ; en 6e, « la technique du produit en croix n'est
   pas enseignée » ; le coefficient arrive en 5e. Le domaine commence donc au
   CM1, en phrases, sans tableau. Le validateur bloque désormais ce vocabulaire
   selon la classe, dans les exercices comme dans les cartes.
2. **Les rédacteurs révèlent les trous du DAG.** Trois compétences de 5e ou 6e
   n'avaient pas, parmi leurs ancêtres, un calcul dont elles ont besoin
   (× 100, décimal × entier, division décimale) : arêtes ajoutées en cours
   d'étape (E036 ← D023, E037 ← D007, E010 ← D024), lots revérifiés.
3. **Un tableau en formule peut sortir de l'écran.** Le relecteur de G2 a mesuré
   dans Chrome : quatre tableaux de proportionnalité débordaient d'un téléphone
   de 360 px, colonne de la question coupée. En-têtes courts (« Masse (kg) »),
   au plus 4 colonnes ; l'application fait défiler les formules en bloc et les
   resserre sous 400 px.
4. **Les cartes recopiaient les données des tests et des exercices** (6 cas) :
   une carte qui donne « 75 % = 0,75 » donne la réponse du test de E032. Le
   contrôle porte maintenant sur les couples de données, carte par carte.
5. **Une maîtrise peut se résoudre sans la compétence** : l'exercice de maîtrise
   du coefficient se faisait par linéarité additive, et l'indice y poussait.
   L'énoncé impose désormais la procédure évaluée.

### Contrôles et outillage

- Notation contrôlée : le symbole %, après E032 (6e) ; `\%` dans une formule.
- Vocabulaire contrôlé selon la classe : « produit en croix » jamais au
  collège, « coefficient » à partir de la 5e, « tableau de proportionnalité » à
  partir de la 6e (exercices et cartes).
- Application : un prix s'affiche avec ses centimes dans le corrigé (« 3,90 € »).

### Ce qui reste ouvert

- **La simplification de fraction (C007) est placée en 4e**, alors que le
  programme de 6e la mentionne déjà (« diviseur et multiple […] réactivés en vue
  de leur utilisation dans le calcul sur les fractions (simplification […]) »).
  Les exercices de E036 l'écrivent comme une égalité de fractions par
  multiplication (C006). À revoir dans le domaine C.
- **Désignation des sources de 5e dans C** (C007, C008, C010, C011 : « Cinquième »
  au lieu de « classe de 5e ») : le validateur ne date pas leurs citations.
- **E023 (graphique) sans prérequis de repérage** : à lier quand le domaine du
  repérage existera.
- **Écriture des tableaux** : KaTeX en 6e (E003, objet de la compétence), texte
  « Nombre : 4 ; 6 ; 10 » en 5e. À unifier si Marius le juge utile.

