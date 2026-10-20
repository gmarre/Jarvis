# Consigne du rédacteur des cartes mentales, étape 6 (fractions du cycle 4, puissances, racine carrée, notation scientifique, 5e à 3e)

Tu rédiges des cartes mentales de l'étape 6 de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Les cartes (découpage du cartographe, section 7 de `_travail\etape6_dag_C.md`, validé par Gauthier)
| Carte | Compétences | Classes | Rédacteur | Fichier |
|---|---|---|---|---|
| MM-A-06 | A029, A030, A031, A032, A033 | 5e, 4e | R1 | `_travail\etape6_mm_A.json` |
| MM-A-07 | A034, A035, A040 | 4e, 3e | R1 | idem |
| MM-A-08 | A036, A037, A038, A039 | 3e | R1 | idem |
| MM-B-07 | B052, B022, B053, B023 | 5e, 4e, 3e | R1 | idem |
| MM-C-05 | C013, C033 | 5e | R2 | `_travail\etape6_mm_CD.json` |
| MM-C-06 | C034, C015, C035, C018, C017, C036, C037 | 4e | R2 | idem |
| MM-D-05 | D026 | 5e | R2 | idem |

Ton rôle (R1 ou R2) t'est indiqué dans ton message de lancement. Les cartes courtes (MM-A-07, MM-C-05, MM-D-05) sont gardées telles quelles (décision 8).

## À lire avant d'écrire
1. **La consigne de l'étape 5, `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_cartes_etape5.md`, en entier** : format, règles, leçons des relectures, vérifications et interdits s'appliquent tous ici. Remplace `etape5_dag_AB` par `etape6_dag_C`, `etape5_liens_AB` par `etape6_liens_C`, et `etape5_mm_AB` par ton fichier. Les règles « Aucune puissance (avant l'étape 6) » et « pas d'exposant dans MM-A-05 » tombent, et sont remplacées par les notations ci-dessous. Le modèle le plus proche est `_travail\etape5_mm_AB.json`, avec son script `_travail\verif_mm_AB.py`.
2. Tes compétences dans `_travail\etape6_dag_C.json` et le compte rendu `_travail\etape6_dag_C.md` en entier, notamment la section 7, les « Décisions de Gauthier » et les ajouts de fin de fichier (A032 ← A031 ; A034 ← B049 ; A038 n'est plus en évaluation partielle).
3. Les exercices relus et corrigés de tes cartes, ainsi que leurs figures :
   - R1 : `_travail\lot_etape6_L3.json`, `L4` et `L5`, figures dans `figures_6_L3\` ;
   - R2 : `_travail\lot_etape6_L1.json` et `L2`, figures dans `figures_6_L1\` et `figures_6_L2\`.
4. La consigne des rédacteurs, `_travail\brief_etape6.md` : saisie, notations contrôlées, erreurs classiques.

## Règles propres à l'étape 6 (bloquant)
- **Notations par branche, jamais au-dessus de la compétence de la branche :**
  - ² et ³ après un nombre : seulement dans les branches qui descendent de A029 ;
  - les autres exposants : seulement dans celles qui descendent de A031 ;
  - un exposant négatif : seulement dans MM-A-08 et dans la branche B023 de MM-B-07 ;
  - √ : seulement dans MM-A-07.
  - Le validateur le contrôle. Dans une formule KaTeX, écris `5^2`, `10^{-3}` et `\sqrt{2}`.
- **MM-C-06** : pas d'écriture « a⁻¹ » ; l'inverse de a s'écrit $\frac{1}{a}$, comme le veut la notation de 4e.
- **Sections titrées par classe** quand une carte couvre plusieurs classes : une branche `##` par compétence, étiquetée de sa classe (« (4e) »), dans l'ordre de la progression.
- **Fractions** : une fraction a/b compte comme une seule donnée dans le contrôle des couples. Aucune fraction d'un énoncé, d'une réponse, d'un `accepted`, d'une proposition, d'un corrigé ou d'un indice de la même carte ne sert d'exemple.
- **Notation scientifique** : la mantisse est toujours dans [1 ; 10[. Une écriture hors de cet intervalle n'apparaît que dans une ligne « Erreur à éviter ».
- **Racine carrée** : la racine d'un nombre négatif n'existe pas (B049 est maintenant dans la chaîne de A034). Une valeur approchée se donne avec sa précision (« au dixième »).
- **Erreurs à éviter** : reprends les erreurs classiques de `brief_etape6.md` qui concernent la branche :
  - pour les fractions : additionner les numérateurs et les dénominateurs, ou confondre l'inverse et l'opposé ;
  - pour les puissances : écrire 2⁵ = 10, multiplier les exposants d'un produit, écrire (−3)² = −9, écrire 10⁻³ = −1 000 ;
  - pour la racine carrée : écrire √(a + b) = √a + √b, ou √9 = 4,5 ;
  - pour la notation scientifique : une mantisse hors de l'intervalle, ou un exposant compté dans le mauvais sens ;
  - pour la division : décaler la virgule d'un seul des deux nombres.
  - Garde la formule « Erreur à éviter : … ; c'est **faux**, … ».
- **Leçons des relectures de l'étape 6, appliquées aussi aux cartes :**
  - les tables de multiplication apprises s'arrêtent à 10 : jamais « dans la table de 12 » ni « de 15 », écris « 36 = 12 × 3 » ;
  - aucune opération hors de la chaîne de la branche, par exemple une division décimale par un nombre à deux chiffres avant D026, ou la règle des signes avant B049 ;
  - le mot « puissance » au sens physique (watts) est banni des cartes de puissances.

## Vérifications obligatoires
Python : `C:\Users\MARRE\AppData\Local\Temp\claude\c--Users-MARRE-Documents-Jarvis\ea40d22e-4298-472f-ad2f-ecce13c7b8cb\scratchpad\venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. **Un script `_travail\verif_mm_6_<R1|R2>.py`**, sur le modèle de `verif_mm_AB.py`. Il contrôle :
   - la structure et le vocabulaire contrôlé ;
   - le KaTeX ;
   - le recalcul de chaque égalité, en Fraction pour les puissances entières et à 10⁻⁴ près pour les racines ;
   - les lignes « Erreur à éviter » ;
   - les notations par branche (règle ci-dessus) ;
   - **aucun couple de données** d'un exercice, d'un corrigé, d'un indice ou d'un test de la même carte.
2. **Rendu KaTeX** : sur le modèle de `verif_mm_AB_katex.cjs`, aucune formule ne doit lever d'erreur.
3. **Le validateur**, sur une copie temporaire qui fusionne tes lots :
   ```
   python scripts\check_lot.py --skills _travail\etape6_dag_C.json --links _travail\etape6_liens_C.json --exercises <copie fusionnée de tes lots> --mindmaps <ton fichier>
   ```
   Il doit afficher « Validation REUSSIE », sans avertissement de carte manquante sur tes compétences. Les compétences de l'autre rédacteur peuvent rester signalées sans carte.

## Ce que tu ne fais jamais
Modifier quoi que ce soit hors de ton fichier de cartes et de tes scripts `_travail\verif_mm_6_*`. Aucun commit.

## Ta réponse finale
8 lignes maximum : le fichier, le nombre de lignes par carte, le résultat des vérifications, ce qui reste à trancher.
