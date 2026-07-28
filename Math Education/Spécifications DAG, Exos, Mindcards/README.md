# Contenu pédagogique MATH EDUCATION

> Livraison de Marius (lead contenu) pour Gauthier (lead développement).
> Tranche pilote : 26 compétences, 69 exercices, 4 cartes mentales.

---

## 1. Ce que contient ce dossier

```
Spécifications DAG, Exos, Mindcards/
│
├── schemas/                      ← LE CONTRAT D'INTERFACE (roadmap §2.2)
│   ├── skills_dag.schema.json
│   ├── exercises.schema.json
│   └── mindmaps.schema.json
│
├── content/                      ← LE CONTENU, conforme aux schémas
│   ├── skills_dag_v2.json        26 compétences (A, B partiel, C)
│   ├── exercises.json            69 exercices
│   └── mindmaps.json             4 cartes mentales
│
├── skills_dag.json               ← v1.0 d'origine, 414 compétences. CONSERVÉ tel quel.
├── CORRECTIONS_DAG_v2.md         ← ce qui a changé entre v1 et v2, et pourquoi
└── README.md                     ← ce fichier
```

Le fichier `skills_dag.json` v1.0 n'est pas modifié. La v2 est une **tranche**, pas un remplacement : elle ne couvre que 26 des 414 compétences.

---

## 2. Pour Gauthier : comment consommer ces fichiers

### Le principe

Les 3 fichiers de `schemas/` sont le **contrat d'interface** de la roadmap §2.2. Tant qu'ils ne changent pas, tu peux développer sans attendre le contenu définitif : les fichiers de `content/` grossiront, leur forme ne bougera pas.

### Génération des types TypeScript

Les schémas sont au format JSON Schema draft 2020-12. Pour obtenir les types de `src/types/` sans les écrire à la main :

```bash
npx json-schema-to-typescript "Spécifications DAG, Exos, Mindcards/schemas/skills_dag.schema.json" \
  -o src/types/skills.ts
```

À faire pour les trois schémas. Cela te donne `Skill`, `Exercise`, `Mindmap` alignés sur ce que je livre.

### Correspondance avec les écrans

| Écran (Brief_Design_MVP) | Ce qu'il consomme |
|---|---|
| Espace personnel / profil, vue DAG | `skills_dag_v2.json` : `label`, `domain`, `prerequisites`, `school_level` |
| Lecteur d'exercice | `exercises.json` : `statement`, `type`, `choices`, `answer`, `solution_steps`, `hint` |
| Carte mentale | `mindmaps.json` : le champ `markdown`, à passer tel quel à Markmap |
| Test de positionnement | `validation_test` de chaque compétence |

### Points d'attention pour le code

- **`statement` et `solution_steps` contiennent du LaTeX** entre `$...$`. Il faut KaTeX pour les rendre. Un rendu brut afficherait `\frac{3}{4}`.
- **`type` détermine le composant de saisie** : `numerique` (champ nombre), `qcm` (boutons radio, propositions dans `choices`), `texte` (champ libre), `vrai_faux` (deux boutons).
- **`answer.accepted`** liste les autres écritures acceptées. Pour les réponses en texte, comparer après avoir retiré les espaces, sinon `3/4` et `3 / 4` seront comptés différemment.
- **`choices[].misconception`** décrit l'erreur de raisonnement que révèle chaque distracteur. Inutile au MVP, mais c'est la matière première du diagnostic fin plus tard : ne pas la jeter.
- **`mastery_threshold`** vaut `{required: 2, out_of: 3}` dans cette tranche, parce qu'il n'y a que 3 exercices par compétence. La cible de la roadmap une fois la banque complète (5 × 3) est `{3, 4}`. **Lis toujours la valeur du fichier, ne la code pas en dur.**
- **`mindmap_id` peut être `null`**, et `exercise_ids` peut être vide (c'est le cas des 3 compétences du domaine B). Prévoir l'état vide.
- **Les exercices sont tous en `review_status: "brouillon"`.** Aucun n'a encore passé la double validation exigée par la roadmap §9. Utilisables pour développer, **pas** pour être montrés à un élève.

---

## 3. Valider une livraison

C'est le `npm run validate` demandé par la roadmap §2.2, en Python plutôt qu'en Node car le script de vérification du DAG (networkx) est lui aussi en Python.

```powershell
. .\tools\activate.ps1
python .\scripts\validate_content.py
```

Le script vérifie :

- la conformité des 3 fichiers à leur schéma ;
- l'**acyclicité** du graphe (roadmap §1.1) ;
- les **prérequis inexistants** ;
- les **incohérences de niveau** : une compétence qui dépendrait d'une compétence enseignée plus tard, donc inatteignable ;
- les **nœuds isolés** ;
- les **références croisées** : chaque `exercise_id` et chaque `mindmap_id` du DAG existe bien, et réciproquement ;
- la cohérence des identifiants d'exercices avec la compétence et le niveau annoncés ;
- que la bonne réponse d'un QCM figure bien parmi les propositions ;
- les compteurs de `metadata`.

Sortie 0 si tout passe, 1 sinon. À lancer avant chaque PR de contenu.

Si la toolchain n'est pas installée sur ta machine :

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\setup-toolchain.ps1
```

---

## 4. État actuel et limites connues

| Point | État |
|---|---|
| Contrat d'interface (3 schémas) | Posé, à valider par Gauthier |
| Compétences | 26 sur 414 |
| Exercices | 69, soit 3 par compétence (cible roadmap : 15) |
| Cartes mentales | 4, couvrant les 23 compétences des domaines A et C |
| Relecture mathématique | **Aucune.** Tout est en `brouillon`. |
| Illustrations | Aucune. `image` vaut `null` partout, les énoncés sont formulés pour s'en passer, mais le primaire en aura besoin. |
| Domaine B | 3 compétences sans contenu, présentes uniquement comme prérequis |

**Ce qui manque avant de montrer quoi que ce soit à un élève :** le passage de l'agent `math-reviewer` puis la relecture humaine, sur 100 % des exercices de la tranche pilote (roadmap §1.4). C'est la prochaine étape côté contenu.

---

## 5. Ce qu'il faut lire avant de toucher au DAG

`CORRECTIONS_DAG_v2.md`. Les niveaux du domaine C ont été corrigés de plusieurs années par rapport à la v1, sur la base des programmes officiels. Le document donne la citation qui justifie chaque changement, et liste ce qui n'a pas été vérifié.
