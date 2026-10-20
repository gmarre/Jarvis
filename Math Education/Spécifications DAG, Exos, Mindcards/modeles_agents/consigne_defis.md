# Consigne du rédacteur des cartes défi (sprint 2, point 4)

Tu rédiges les **cartes défi** (recto et verso) d'un lot de compétences de MATH EDUCATION. Réponds en français, sur un ton direct, sans tirets longs.

## Ce qu'est une carte défi
Le cycle d'un élève sur une compétence est le suivant :
1. il découvre la notion (carte mentale) ;
2. il fait un exercice simple ;
3. il fait les **cartes défi** ;
4. il passe à des exercices de plus en plus durs.

Sur une carte défi, l'élève lit le **recto**, cherche la réponse **de tête**, retourne la carte et dit lui-même s'il savait. Rien n'est corrigé automatiquement. Chaque carte revient ensuite en révision espacée : demain, puis à J+3, J+7, J+14 et J+30.

Une carte défi entraîne la **mémoire de l'essentiel** : un mot, une règle, un fait, un calcul mental court, un piège. Ce n'est pas un exercice. Pas de papier, pas de calcul posé, pas de figure.

## Le volume
**4 à 6 cartes par compétence**, en couvrant ce qui doit tenir en mémoire. Mélange les types suivants :
- **définition ou vocabulaire** : « Comment s'appelle le nombre sous la barre d'une fraction ? » ;
- **règle ou méthode** : « Pour comparer deux fractions de même dénominateur, que compare-t-on ? » ;
- **calcul mental court**, faisable en moins de 30 secondes : « Combien font les $\frac{3}{4}$ de 20 ? » ;
- **piège** (une erreur classique de la compétence), sous la forme « Vrai ou faux : … » ou « Où est l'erreur : … ».

## Le format
Ton fichier est un tableau JSON de cartes :
```json
{"id": "FC-C012-01", "skill_id": "C012", "recto": "…", "verso": "…", "review_status": "brouillon"}
```

- **`id`** : `FC-<compétence>-<numéro sur 2 chiffres>`, à partir de 01, dans l'ordre où l'élève doit les voir. Les cartes les plus simples viennent d'abord.
- **`recto`** : une question courte, de 240 caractères au plus, idéalement moins de 20 mots. Elle a une seule réponse attendue, sans ambiguïté.
- **`verso`** : **la réponse d'abord, en gras**, puis le pourquoi ou la méthode en une phrase, de 400 caractères au plus. Pour un vrai/faux : « **Faux** : … ».
- **Markdown léger et KaTeX** entre `$…$`, comme dans les exercices. Dans le JSON, les antislashs sont doublés (`$\\frac{3}{4}$`).
- **Écriture des nombres** : celle des exercices.
  - virgule décimale `{,}` dans une formule ;
  - espace des milliers ;
  - signe « − » pour les relatifs hors formule, `$-3$` dans une formule ;
  - jamais |x| ;
  - unités après le nombre, avec une espace.

## Les règles (bloquant)
1. **Rien au-dessus de la classe de la compétence, ni hors de sa chaîne de prérequis.** Cela vaut aussi pour une notion trouvée dans la carte mentale : une carte mentale couvre plusieurs compétences, et une notion qui y figure n'est pas forcément dans la chaîne de celle que tu traites. C'est la leçon du lot pilote C : « multiple » ne pouvait pas servir dans C029 tant que A012 n'était pas un prérequis. Remonte les prérequis dans `content\dag\*.json`. Pas de nombre négatif avant la 5e, pas de puissance avant A029, pas de fraction au CP. Respecte aussi les champs numériques par classe, c'est-à-dire les plafonds des nombres et les dénominateurs autorisés, de `scripts\validate_content.py` (`check_champ_numerique`) : lis-les.
2. **Les notations contrôlées par le validateur** : ², ³ seulement sous A029 ; les autres exposants sous A031 ; l'exposant négatif sous A036 ; √ sous A034 ; les symboles < et > à partir de A006. Le validateur les vérifie sur le recto et le verso.
3. **Aucune carte ne donne la réponse d'un exercice ni d'un test de la même compétence.** Pas de couple de données repris d'un énoncé, d'une réponse, d'une proposition, d'un corrigé, d'un indice ou d'un `validation_test`. Une fraction compte pour une seule donnée. Compare chaque carte à chaque exercice de la compétence.
3 bis. **Pas de question d'exercice ou de test reprise avec d'autres nombres quand la réponse n'en dépend pas** (« Pourquoi écrit-on 7 − (−6) avec des parenthèses ? » contre le test « Pourquoi écrit-on 4 − (−3)… ? » ; « 9 − 6 et 6 − 9 donnent-ils le même résultat ? ») : la carte donne alors la réponse. Leçon de la relecture du lot B.
3 bis, étape obligatoire avant d'écrire (leçon du lot F43, 7 % de cartes bloquantes) : **pour chaque compétence, liste les questions du test et des exercices dont la réponse ne dépend pas des nombres** (un oui ou non, un nombre de solutions, un choix tranché par une règle : « x² = −16 a-t-elle une solution ? », « une lettre ou deux ? », « des essais suffisent-ils ? »), **et ne pose jamais la règle qui les tranche**, ni la même erreur avec d'autres nombres. Quand cette règle est le cœur de la compétence, signale-le au chef de projet au lieu d'écrire la carte.
3 ter. **Les carrés à savoir (0 à 12) et les tables jusqu'à 10 valent aussi pour les encadrements** : pas de √200 ni de √168 à encadrer de tête (leçon du lot A).
4. **Chaque égalité est juste.** Recalcule-la avec un script (Fraction).
5. **Le piège reprend une erreur classique réelle** : celles des descriptions des compétences, des `misconception` des QCM et des consignes de rédaction (`_travail\brief_etape5.md`, `brief_etape6.md`). Le verso dit pourquoi c'est faux.
6. **Recto et verso différents.** Le recto ne contient jamais sa propre réponse.
7. **Leçons des relectures de contenu**, appliquées ici aussi :
   - les tables de multiplication apprises s'arrêtent à 10 ;
   - pour compter sur une droite, on parle d'intervalles, pas de graduations ;
   - jamais « également » quand rien ne précède ;
   - une règle doit rester vraie dans les cas limites (0, 1, nombres égaux).
8. **Leçons de la relecture des défis du cycle 3** (2 cartes bloquantes sur 36) :
   - chaque opération d'un recto ou d'un verso est permise par la chaîne de la compétence, pas seulement par sa classe : un produit hors des tables (22 × 7) exige une compétence de multiplication dans la chaîne, une soustraction avec retenue exige B004, un produit par des dizaines exige B041. Avant d'écrire, note pour chaque compétence les opérations que sa chaîne autorise, et reste en deçà ;
   - un vrai/faux ne reprend pas la forme d'un exercice ou d'un test de la compétence avec d'autres nombres : il vise l'erreur, pas le calcul déjà demandé.

## À lire avant d'écrire
1. Pour chaque compétence du lot :
   - sa fiche dans `Spécifications DAG, Exos, Mindcards\content\dag\<domaine>.json` (description, test, prérequis, classe) ;
   - sa carte mentale (`content\cartes\MM-*.json`, champ `mindmap_id` de la compétence) : c'est la source principale de ce qui doit tenir en mémoire ;
   - ses exercices, dans `content\exercices\<domaine>\<compétence>.json`.
2. Le schéma `Spécifications DAG, Exos, Mindcards\schemas\flashcards.schema.json`.

## Les vérifications obligatoires
Le Python est `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. Un script `_travail\verif_defis_<lot>.py`. Il contrôle :
   - le recalcul de chaque égalité (Fraction) ;
   - la longueur ;
   - le gras en tête du verso ;
   - **aucun couple de données** repris des exercices ou du test de la même compétence ;
   - de 4 à 6 cartes par compétence.
2. Le rendu KaTeX de chaque formule, sur le modèle de `_travail\verif_mm_AB_katex.cjs`.
3. La fusion simulée, qui lance le validateur complet sur une copie :
   ```
   python scripts\merge_defis.py _travail\defis_<lot>.json
   ```
   Elle doit afficher « Validation REUSSIE », sans avertissement sur tes compétences.

## Ce que tu ne fais jamais
- Modifier quoi que ce soit hors de `_travail\defis_<lot>.json` et de tes scripts `_travail\verif_defis_<lot>*`.
- Lancer `merge_defis.py --apply`.
- Commiter.

## Ta réponse finale
En 8 lignes maximum :
- le fichier produit ;
- le nombre de cartes par compétence (en résumé) ;
- la répartition par type (définition, règle, calcul, piège) ;
- le résultat des trois vérifications ;
- ce qui reste à trancher.
