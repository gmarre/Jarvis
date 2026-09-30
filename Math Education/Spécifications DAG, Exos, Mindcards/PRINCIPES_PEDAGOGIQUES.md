# Principes pédagogiques du contenu

> Retours de relecture de Marius, lead contenu. Ce document prime sur les habitudes du générateur.
> Source : `Retour RELECTURE.md`, 22 août 2026.

---

## Le principe directeur

> « Notre rôle n'est pas d'accumuler des notions, c'est d'aider à la compréhension, pour aider les élèves qui seraient en difficulté. »

Tout le reste en découle. Un exercice conforme au programme, mathématiquement juste et validé par six contrôles automatiques peut malgré tout être **mauvais**, s'il ne fait que vérifier une connaissance au lieu de la construire.

Les contrôles automatiques mesurent la conformité. Ils ne mesurent pas la pédagogie.

---

## 1. Un exercice se construit en plusieurs questions

**Ce qui était fait :** une question isolée, une réponse. « Dans 5/8, quel est le numérateur ? »

**Ce qui est demandé :** un contexte unique, puis plusieurs questions qui montent en difficulté.

> « L'élève a besoin de prendre confiance sur un énoncé avant d'arriver sur la difficulté technique, à savoir les mathématiques. »

Exemple donné pour `C002` (Numérateur, CE1). Contexte commun : un gâteau coupé en 6 parts, on en mange 3.

1. Si je mange une part, peut-on dire que j'ai mangé $\frac{1}{6}$ du gâteau ?
2. Quelle fraction du gâteau ai-je mangée en tout ?
3. À quoi correspond le numérateur ?

La première question est facile et met l'élève en confiance dans la situation. La dernière est la question conceptuelle. L'ordre inverse fait échouer un élève qui aurait pu comprendre.

**Mise en oeuvre :** pas de refonte du schéma. Voir la section 6, qui retient la solution de la **série** : plusieurs exercices ordonnés partageant le même contexte, avec un seul champ optionnel ajouté.

---

## 2. Les images ne sont pas optionnelles au primaire

**Constat de Marius :** `C001` et `C002` sont « trop durs sans image ». Pour `C005`, il faut « un format png ou jpeg pour les règles graduées, sinon on risque de ne pas comprendre ».

Le schéma texte proposé en remplacement (`0 |----|----|----|----| 1`) a été explicitement rejeté : « Je n'ai pas compris l'exercice avec le format / et -- ». **La solution de repli ne fonctionne pas.**

Pour `C006` (fractions équivalentes), l'image est demandée à deux endroits : pour introduire la notion, et **dans chaque correction**.

> « Il n'est pas logique pour un élève que 2/4 = 1/2, tout comme que 0,5 = 0,50. »

Une égalité de fractions n'a rien d'évident : elle se voit avant de se démontrer.

**État actuel :** 57 des 69 exercices relèvent du primaire, 33 au CE1. Aucun ne porte d'image. L'application déclare le champ `image` dans ses types mais ne l'affiche nulle part.

---

## 3. Rappeler les notions précédentes plutôt que les empiler

Pour `C003` (Dénominateur), Marius demande de « ramener du C001 et du C002 ». Reposer la question « qu'est-ce que le numérateur ? » à l'intérieur de l'exercice sur le dénominateur, précisément pour que l'élève **distingue** les deux.

C'est un principe de contraste : deux notions voisines s'apprennent l'une contre l'autre, pas l'une après l'autre.

---

## 4. L'ordre de lecture doit être l'ordre d'apprentissage

> « Pourquoi passe-t-on de C003 à C009 ? Pour moi ces deux notions sont dans la continuité l'une de l'autre. »

Elles le sont : dans le DAG, `C009` a précisément pour prérequis `C002` et `C003`. Le graphe est correct.

Le problème est **l'identifiant**. Les numéros viennent du DAG v1, où l'ordre supposé était différent. Après le re-nivellement d'après les programmes, la numérotation ne suit plus la progression : au CE1 on lit C001, C002, C003, puis C009 et C012, tandis que C004 est au CM1, C005 et C006 au CE2, C007 en 4e et C008 en 3e.

Le saut n'est pas pédagogique, il est cosmétique, mais il gêne la lecture et fera trébucher tout nouvel arrivant sur le projet.

---

## Ce que cela implique, à arbitrer

| Sujet | Portée | Impact |
|---|---|---|
| Exercices multi-questions (séries) | Un champ optionnel `serie`, plus le groupement côté app | Rétrocompatible, aucun exercice existant à modifier |
| Images réelles au primaire | Production d'illustrations, stockage, rendu dans l'app | ~57 exercices concernés, aucun outil en place |
| Rappel des notions voisines | Contenu seul | Réécriture des exercices, pas de changement technique |
| Numérotation du DAG | Identifiants, donc toutes les références croisées | Renuméroter, ou masquer les identifiants dans les vues destinées aux humains |

---

## 5. La difficulté doit croître le long du parcours

> « L'élève va avancer peu importe son âge et son niveau de façon linéaire suivant un parcours défini par le DAG, donc la difficulté doit rester uniquement croissante. »

C'est une contrainte structurelle, désormais **contrôlée automatiquement** : sur chaque arête prérequis → compétence, la difficulté ne doit jamais redescendre.

**Vérification du 22 août 2026 : 0 arête en baisse.** L'ordre topologique du parcours donne une difficulté strictement croissante, 1 → 2 → 3 → 4 → 5 → 6. Le graphe est sain sur ce critère.

### Mais la difficulté ressentie ne vient pas du DAG

Marius trouvait `C009` (CE1, difficulté 2) plus dur que `C004` (CM1, difficulté 3), alors que le DAG dit l'inverse. La mesure explique pourquoi : **la charge de lecture des énoncés ne suit pas la difficulté déclarée.**

| Compétence | Niveau | Difficulté | Mots par énoncé |
|---|---|---|---|
| `C009` Comparer fractions de même dénominateur | CE1 | 2 | **23,3** |
| `C001` Fraction comme partage | CE1 | 2 | **23,0** |
| `C003` Dénominateur | CE1 | 2 | **21,3** |
| `C005` Fraction sur droite graduée | CE2 | 2 | **24,7** |
| `C004` Fraction d'une quantité | CM1 | 3 | **13,0** |
| `C007` Simplification | 4e | 5 | 10,7 |
| `C008` Fraction irréductible | 3e | 6 | 9,0 |

Le bloc « fractions » du CE1 est **le plus lourd en lecture de toute la banque**, plus lourd que les compétences de 4e et de 3e. Pour des élèves de CE1 qui apprennent encore à lire, c'est un obstacle qui n'a rien de mathématique.

Cas le plus net : l'entraînement de `C009` fait **38 mots**, contre 10 pour celui de `C004`. Il a été allongé le 20 août pour corriger un défaut de cohérence (deux enfants mangeant la même tarte), en réglant le problème logique au prix de la lisibilité.

**Règle qui en découle :** la longueur de l'énoncé doit décroître, pas croître, quand le niveau scolaire baisse. Un énoncé de CP ou de CE1 tient en une ou deux phrases courtes. Contrôle à ajouter : plafond de mots par énoncé selon le niveau.

**Lien avec le format multi-questions :** un contexte partagé entre plusieurs questions **amortit** la charge de lecture au lieu de la répéter. Les deux retours se rejoignent.

---

## 6. Multi-questions : la série, sans casser le schéma

Proposition de Marius, retenue :

> « Il est possible de garder le format actuel, il faut juste prendre un énoncé de base en M01 par exemple et s'assurer qu'il arrive toujours avant une M02 qui reprend le même énoncé. »

> « Ce que j'aime ici c'est qu'on peut identifier au cours d'un exercice la faille. Si sur une question préliminaire l'élève se trompe, on sait quelle notion il doit revoir. »

C'est nettement moins coûteux qu'une restructuration en sous-questions, et **cela ne change pas la forme d'un exercice**. Il manque une seule chose au schéma : la garantie que les exercices d'une série sont servis ensemble et dans l'ordre. Sans elle, l'application peut servir la deuxième question seule, avec un énoncé orphelin.

**Ajout minimal proposé**, champ optionnel donc rétrocompatible, aucun exercice existant à modifier :

```json
"serie": { "id": "SER-C002-01", "position": 1, "total": 3 }
```

L'application groupe par `serie.id` et sert par `position` croissante.

**Pour le diagnostic**, second champ optionnel : `diagnostic_skill_id`, la compétence réellement sondée par cette question, qui peut être un **prérequis** de la compétence de la série. Une question préliminaire ratée désigne alors précisément le nœud où redescendre, ce qui est exactement le mécanisme central du produit.

`skill_id` reste la compétence à laquelle la série appartient, pour que le service par compétence ne change pas.

---

## 7. Exercices bilan : valider une notion, pas un geste isolé

> « J'aimerais avoir des exercices croissants en difficulté et qui soient bilan, pour valider l'ensemble d'une notion et repérer des points faibles. Les exercices de validation d'une compétence unique sont à mon goût insuffisants. »

**Le constat est juste.** Réussir `C001`, `C002`, `C003`, `C009` et `C012` une par une ne prouve pas qu'un élève maîtrise « les fractions au CE1 ». L'intégration est une compétence en soi, et l'évaluation atomisée la manque systématiquement. C'est le défaut classique de l'apprentissage par maîtrise : on valide des micro-gestes, et l'élève reste bloqué devant un problème composite.

### Le chapitre existe déjà : c'est la carte mentale

Aucun objet nouveau n'est nécessaire. Les six cartes mentales regroupent déjà les compétences en notions :

| Carte | Niveaux | Compétences | Difficultés |
|---|---|---|---|
| `MM-A-01` Les nombres entiers | CP → CM1 | 12 | 1 à 3 |
| `MM-C-01` Découvrir les fractions | CE1 | 6 | 2 |
| `MM-C-02` Fractions égales, droite graduée, quantité | CE2, CM1 | 3 | 2 à 3 |
| `MM-A-02` Multiples et diviseurs | CM1, CM2 | 5 | 3 à 4 |
| `MM-C-04` Fractions supérieures à 1 et produit | CM1 → 6e | 5 | 3 à 4 |
| `MM-C-03` Opérer sur les fractions | 5e → 3e | 4 | 4 à 6 |

### Un bilan est une série rattachée à un chapitre

Le mécanisme de la section 6 suffit :

- `serie.id` identifie le bilan, `position` garantit l'ordre et la difficulté croissante ;
- le bilan porte un `mindmap_id` au lieu d'un `skill_id`, puisqu'il valide un chapitre ;
- chaque question porte un `diagnostic_skill_id` **différent**, pointant une compétence du chapitre ;
- le contexte est partagé, ce qui amortit la charge de lecture (section 5).

**Le repérage des points faibles tombe alors tout seul** : la question 3 ratée désigne exactement la compétence à revoir. Une question ratée fait repasser sa compétence en `in_progress`, et le moteur redescend. C'est la promesse du produit, appliquée à l'échelle du chapitre au lieu du nœud isolé.

### Ce qui reste à trancher

1. **Quand servir le bilan.** À la fin du chapitre pour valider, ou aussi à l'entrée pour positionner ? Ce ne sont pas le même objet, et le test de positionnement initial existe déjà via `validation_test`.
2. **Seuil de maîtrise du chapitre.** `mastery_threshold` est aujourd'hui par compétence. Un bilan en demande un au niveau du chapitre, donc un champ nouveau dans `mindmaps.json`.
3. **Tension avec la charge de lecture au primaire.** Un bilan est par nature plus long, et le CE1 est déjà le niveau où nos énoncés sont trop lourds. Le bilan de `MM-C-01` est le plus difficile à réussir de tous, et il devra être court et illustré.

### Recommandation

Concevoir maintenant, car tout existe. **Prototyper un seul bilan, sur `MM-C-01`**, puis différer les cinq autres après la bêta. Un bilan est le meilleur endroit pour découvrir qu'un découpage de chapitre est mauvais : autant le découvrir sur un chapitre que sur six. Les compétences viennent par ailleurs de beaucoup bouger, re-nivellement et douze ajouts, et un bilan n'a de sens que sur un chapitre stabilisé.

