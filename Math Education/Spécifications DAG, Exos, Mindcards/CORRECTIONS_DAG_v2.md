# Corrections du DAG v1.0 vers v2.0 (tranche pilote)

> À relire et valider ligne par ligne par Marius avant fusion.
> Chaque correction est justifiée par une citation d'un programme officiel. Aucune n'a été faite « au jugé ».

Date : 28 juillet 2026. Périmètre : 26 compétences (domaines A, B, C partiels).

---

## 1. Méthode

Les 16 PDF du dossier `Programme mathématiques/` ont été extraits en texte (`scripts/extract_programmes.py`), puis chaque compétence de la tranche a été confrontée aux attendus du programme de son domaine.

**Point de vigilance sur la base documentaire.** Les 16 PDF ne sont que 12 documents distincts, et deux d'entre eux posent problème :

| Fichier | Ce que c'est réellement |
|---|---|
| `EDUSCOL_CM1_...`, `EDUSCOL_CM2_...`, `EDUSCOL_6eme_...` | Le **même** fichier : le programme du cycle 3, organisé année par année |
| `EDUSCOL_CP_...`, `EDUSCOL_CE1_CE2_...` | Le **même** fichier : le programme du cycle 2 |
| `EDUSCOL_5eme_...` | « Annexe 2 – Programme de mathématiques pour le cycle 4 ». Couvre **5e, 4e et 3e**. C'est la référence maths du collège. |
| `EDUSCOL_3eme_...`, `EDUSCOL_4eme_...` | « Annexe 3 – Programme d'enseignement du cycle 4 », 138 pages, **toutes disciplines**. Document plus ancien et non spécifique aux maths. |

**À faire :** remplacer les deux derniers par le programme de maths de cycle 4 à jour, ou les supprimer pour éviter qu'ils servent de référence par erreur.

---

## 2. Le constat central

Le DAG v1.0 place les fractions **beaucoup trop tard** au primaire et **trop tôt** au collège. Le programme est explicite :

> « L'étude des fractions à l'école élémentaire, **débutant dès le CE1**, s'est appuyée sur des manipulations et des représentations variées. »
> — Cycle 3, classe de 6e, *Les fractions*

Le v1 fait démarrer les fractions en CM2, soit **quatre ans plus tard**. Conséquence produit directe : un élève de CE2 ou de CM1 en difficulté sur les fractions ne trouvait dans le DAG **aucune compétence à son niveau**. Le moteur de remontée à la lacune racine, qui est le différenciateur du produit, ne pouvait pas fonctionner sur ce domaine.

---

## 3. Prérequis fantômes supprimés

Trois compétences du v1 servaient de prérequis alors qu'elles **n'apparaissent dans aucun programme du collège** :

| Compétence v1 | Niveau v1 | Réalité |
|---|---|---|
| `A020` PGCD | 6e | Le terme « PGCD » n'apparaît ni dans le programme du cycle 3, ni dans celui du cycle 4. |
| `A021` PPCM | 6e | Idem, aucune occurrence. |
| `A019` Décomposition en facteurs premiers | CM2 | Le programme la situe au **cycle 4**, pas au CM2. |

Or dans le v1 :
- `C007` (Simplification de fraction) dépendait de `A020`
- `C008` (Fraction irréductible) dépendait de `A020`
- `C011` (Réduction au même dénominateur) dépendait de `A021`

Ces trois arêtes rendaient les fractions du collège inatteignables via des nœuds qui n'existent pas au programme. **Elles ont été supprimées.** Le programme décrit d'ailleurs une méthode sans PGCD :

> « Simplifier une fraction dont le numérateur et le dénominateur sont dans une même table de multiplication. »
> — Cycle 4, *Nombres rationnels*

D'où le nouveau prérequis retenu : `B006` (tables de multiplication).

---

## 4. Tableau des corrections, domaine C

| ID | Compétence | Niveau v1 | Niveau v2 | Écart | Citation justificative |
|---|---|---|---|---|---|
| C001 | Fraction comme partage | CM2 | **CE1** | −4 ans | « Les fractions rencontrées au CE1 sont les fractions d'un tout. » |
| C002 | Numérateur | CM2 | **CE1** | −4 ans | « Connaître et utiliser les mots dénominateur et numérateur. » (CE1) |
| C003 | Dénominateur | CM2 | **CE1** | −4 ans | idem |
| C009 | Comparer, même dénominateur | 6e | **CE1** | −5 ans | « Comparer des fractions ayant le même dénominateur. » (CE1) |
| C012 | Additionner, même dénominateur | 6e | **CE1** | −5 ans | « Additionner et soustraire des fractions de même dénominateur. » (CE1) |
| C006 | Fractions équivalentes | 6e | **CE2** | −4 ans | « Au début du CE2, les élèves réinvestissent les fractions d'un tout étudiées au CE1 afin d'établir des égalités entre fractions. » |
| C005 | Fraction sur droite graduée | 6e | **CE2** | −4 ans | « Au CE2, le partage d'une unité de longueur en fractions de cette unité permet de positionner des fractions sur une bande-unité graduée. » |
| C004 | Fraction d'une quantité | CM2 | **CM1** | −1 an | « au CM1, les élèves apprennent à calculer des fractions de quantités ou de grandeurs comme un tiers de 12 billes. » |
| C011 | Réduction au même dénominateur | 6e | **5e** | +1 an | « Additionner et soustraire des fractions de dénominateurs quelconques. » (5e) |
| C010 | Comparer, dénominateurs différents | 6e | **5e** | +1 an | « Comparer des fractions. » (5e, objectifs d'apprentissage) |
| C007 | Simplification de fraction | 6e | **4e** | +2 ans | « Simplifier une fraction. » (4e, objectifs d'apprentissage) |
| C008 | Fraction irréductible | 6e | **3e** | +3 ans | « Mettre une fraction sous forme irréductible. » (3e) |

### Prérequis modifiés, domaine C

| ID | Prérequis v1 | Prérequis v2 | Raison |
|---|---|---|---|
| C001 | `A004`, `B008` | `A001` | La division euclidienne (`B008`, CM1) ne peut pas être prérequis d'une notion de CE1. |
| C006 | `C004`, `B006` | `C001`, `C009` | Au CE2 les égalités s'établissent par représentation, pas par la multiplication. |
| C005 | `C004` | `C001`, `C006` | Le positionnement sur bande-unité précède la fraction d'une quantité (CM1). |
| C007 | `C006`, `A020` | `C006`, `B006` | Suppression du prérequis PGCD, remplacé par les tables. |
| C008 | `C007`, `A020` | `C007` | Suppression du prérequis PGCD. |
| C011 | `C006`, `A021` | `C006`, `B006` | Suppression du prérequis PPCM, remplacé par les tables. |
| C012 | `C009`, `B001` | `C009`, `B001` | Inchangé. |

---

## 5. Tableau des corrections, domaine A

Le domaine A est **globalement correct** dans le v1. Une seule correction.

| ID | Compétence | Niveau v1 | Niveau v2 | Citation |
|---|---|---|---|---|
| A011 | Pair / impair | CE2 | **CE1** | « L'élève sait dire si un nombre est pair ou impair. » et « L'élève sait donner tous les nombres pairs compris en 767 et 778. » (section CE1) |

Les autres compétences A001 à A010 sont confirmées par les bornes de domaine numérique du programme : nombres jusqu'à cent au CP, jusqu'à mille au CE1, jusqu'à 10 000 au CE2.

---

## 6. Ce qui n'a PAS été vérifié

À prendre en compte avant de généraliser cette méthode aux 15 domaines.

1. **Domaine B (3 compétences).** `B001`, `B005` et `B006` sont incluses uniquement comme prérequis structurels, pour que le graphe soit connexe et validable. Leurs niveaux sont ceux du v1, **non vérifiés**. Elles n'ont ni exercice ni carte mentale.
2. **Quatre compétences du domaine A sans citation** : `A004`, `A005`, `A006`, `A008`. Le programme ne les isole pas comme attendus distincts ; leur niveau v1 est plausible mais n'est pas sourcé. Leur champ `programme_ref` est vide, ce qui rend le manque visible.
3. **Le reste du DAG v1, soit 388 compétences.** Vu ce qui a été trouvé sur le domaine C, il faut s'attendre à des écarts comparables ailleurs, notamment sur les domaines qui ont bougé dans les programmes récents.

---

## 7. Question ouverte pour la suite

Si les fractions démarrent au CE1 et non au CM2, le domaine C mérite probablement **plus de 25 compétences** : le v1 en consacre 4 au primaire (dont aucune au CE1 ou CE2), alors que le programme y détaille une progression sur quatre années. À arbitrer avant d'industrialiser la production de contenu.

Même remarque au niveau du DAG entier : le v1 compte **6 compétences au CP et 10 au CE1**, contre 66 en 2nde. Cette répartition ne reflète pas le poids réel du primaire dans les lacunes des élèves, qui est justement la promesse du produit.
