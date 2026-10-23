# Consigne du rédacteur des cartes mentales, étape 8 (géométrie et grandeurs du cycle 4, 5e à 3e)

Tu rédiges des cartes mentales de l'étape 8 de MATH EDUCATION. Réponds en français, ton direct, sans tirets longs.

## Les cartes de la première vague (exercices relus et fusionnés)
| Carte | Titre | Compétences | Classes | Rédacteur | Fichier |
|---|---|---|---|---|---|
| MM-G-08 | Angles, parallélisme et première démonstration | G046, G047, G048, G050 | 5e | R1 | `_travail\etape8_mm_R1.json` |
| MM-G-09 | Triangles : somme des angles, constructions, droites remarquables | G051, G052, G053, G054 | 5e | R1 | idem |
| MM-G-11 | Pythagore, réciproque, contraposée | G060, G040, G041, G061 | 4e | R1 | idem |
| MM-G-12 | Théorème de Thalès | G042, G062, G043 | 3e | R2 | `_travail\etape8_mm_R2.json` |
| MM-G-13 | Trigonométrie | G063, G064, G065 | 3e | R2 | idem |
| MM-P-07 | Aires : triangle, parallélogramme, disque ; unités d'aire | P028, P029, P030, P033 | 5e | R2 | idem |
| MM-P-10 | Grandeurs quotients et changements d'unités | P036, P037 | 4e | R2 | idem |

Numérotation arrêtée par le chef de projet (les deux cartographes s'étaient chevauchés) : 8a garde MM-G-07 à MM-G-14 ; les cartes d'espace de 8b deviennent MM-G-15 (solides : G070, G071, G072) et MM-G-16 (pyramide, cône, sphère, sections : G073 à G076) ; MM-P-07 à MM-P-10 pour les grandeurs. MM-G-07, MM-G-10, MM-G-14, MM-G-15, MM-G-16, MM-P-08 et MM-P-09 attendent les exercices de la deuxième vague : n'y touche pas.

## Les cartes de la deuxième vague (lots N1 à N5)
| Carte | Titre | Compétences | Classes | Rédacteur | Fichier |
|---|---|---|---|---|---|
| MM-G-07 | Symétrie centrale et parallélogrammes | G038, G045, G049, G055, G056 | 5e | R3 | `_travail\etape8_mm_R3.json` |
| MM-G-10 | Transformations et droite des milieux | G057, G058, G059 | 4e | R3 | idem |
| MM-G-14 | Translations et vecteurs | G066, G067 | 3e | R3 | idem |
| MM-G-15 | Représenter les solides : vues, perspective cavalière, patrons | G070, G071, G072 | 5e | R4 | `_travail\etape8_mm_R4.json` |
| MM-P-08 | Volumes et contenances : unités, pavé, prisme, cylindre | P031, P032, P034 | 5e | R4 | idem |
| MM-G-16 | Pyramide, cône, sphère et sections | G073, G074, G075, G076 | 4e, 3e | R5 | `_travail\etape8_mm_R5.json` |
| MM-P-09 | Volumes de la pyramide, du cône et de la boule | P035, P038 | 4e, 3e | R5 | idem |

Notations propres à la deuxième vague : la notation vecteur `$\overrightarrow{AB}$` seulement dans MM-G-14 ; « translation » et « glissement » sont permis dès MM-G-10 (G057) ; la carte MM-G-14 définit le vecteur nul ($\overrightarrow{AA}$, $\overrightarrow{AB} + \overrightarrow{BA}$), qu'aucun exercice de G066 n'évalue (relecture N2). π seulement dans la chaîne de P023 (MM-P-08 pour le cylindre, MM-P-09). Une valeur exacte en π est écrite « 12π ».

Choix validés à la relecture des cartes R1 (à reprendre dans ton script) : un couple formé uniquement de 2, 90 ou 180 n'est pas compté comme une donnée reprise ; le contrôle des paraphrases ignore le vocabulaire courant (angle, droite, sommet, face, arête…) ; une carte enseigne la méthode qu'un exercice demande, mais jamais avec ses lettres, ses nombres ni sa configuration. Vérifie la présence de G022 dans la chaîne avant d'écrire le symbole °. Leçon des relectures R1 et R3 : quand un exercice ou un test ne porte que sur des lettres (images de points, vecteurs, liste de figures), changer les lettres ne suffit pas, l'exemple reste le même exercice ; une liste qui classe les figures d'un exercice le tranche. Leçons des relectures R2 et R5 : un énoncé général se teste contre toutes les configurations des exercices de la carte (une arête latérale peut être la hauteur ; un côté de face peut être une diagonale du cube) ; chaque opération d'un exemple est dans la chaîne (division par un nombre à deux chiffres, priorités opératoires B011, division de fraction C017) ; le contrôle des couples lit aussi les descriptions des compétences, et compte la reprise d'un calcul d'exercice même sans unité (« 35 × 3,6 »). Leçons de la relecture R4 : tout exemple décrit une configuration qui existe (un prisme a un nombre impair d'arêtes cachées) ; une valeur exacte en π exige P033 dans la chaîne (P023 seul ne calcule qu'avec 3,14) ; une soustraction exige B003.

Ton rôle (R1 à R5) est dans ton message de lancement.

## À lire avant d'écrire
1. **La consigne des cartes de l'étape 6, `Spécifications DAG, Exos, Mindcards\modeles_agents\consigne_cartes_etape6.md`, en entier**, et celle de l'étape 5 qu'elle cite : format, règles, leçons des relectures (dont celles de l'étape 7), vérifications et interdits s'appliquent tous. Modèle le plus récent : `_travail\mm_etape7.json` et son script `_travail\verif_mm_etape7.py`.
2. Le découpage et les règles des cartographes : section 7 de `_travail\etape8a_dag_G.md` et de `_travail\etape8b_dag_GP.md`.
3. Tes compétences dans `Spécifications DAG, Exos, Mindcards\content\dag\G.json` et `P.json` (descriptions, tests de validation), et leurs **exercices fusionnés** dans `content\exercices\G\` et `content\exercices\P\`, avec leurs figures dans `content\figures\`.
4. `_travail\brief_etape8.md` : notations, vocabulaire, erreurs classiques, leçons des relectures.

## Règles propres à l'étape 8 (bloquant)
- **Notations par carte, jamais au-dessus de la compétence de la branche** : « réciproque » et « contraposée » jamais avant MM-G-11 (en 5e : « la propriété dans l'autre sens ») ; AB² seulement dans MM-G-11 et après ; cos, sin, tan seulement dans MM-G-13 ; π écrit « π » (jamais « pi ») et seulement dans la chaîne de P023 ; unités composées en symbole (km/h, L/min) ; angles en `$\widehat{ABC}$`.
- **Aucune formule de volume de pyramide, de cône ou de boule** dans ces cartes.
- **Une carte ne se lit pas comme une figure** : si tu décris une configuration, elle ne doit reprendre ni une figure ni un couple de données d'un exercice ou d'un test de la même carte (le contrôle des couples porte aussi sur les textes visibles des figures).
- **La mesure n'est pas une preuve** : aucune ligne ne laisse croire qu'un angle ou une longueur se lisent sur le dessin.
- **Valeurs approchées** : le rang d'arrondi est toujours dit (« au dixième »), arrondir à la fin seulement.
- **Erreurs à éviter** : reprends celles de `brief_etape8.md` qui concernent la branche (angles alternes-internes sans parallèles, somme à 360°, diagonales égales pour tout parallélogramme, hauteur confondue avec médiane, additionner les longueurs dans Pythagore, côtés non homologues dans Thalès, cosinus et sinus inversés, oublier ÷ 2 pour l'aire du triangle, 2πr pour l'aire du disque, moyenne des vitesses). Formule : « Erreur à éviter : … ; c'est **faux**, … ».

## Vérifications obligatoires
Python : `C:\Users\MARRE\Documents\Jarvis\Math Education\.venv\Scripts\python.exe`, avec `PYTHONIOENCODING=utf-8`.
1. Un script `_travail\verif_mm_8_<R1|R2>.py` sur le modèle de `verif_mm_etape7.py` : structure et vocabulaire contrôlé, KaTeX, recalcul de chaque égalité (Fraction ; racines et lignes trigonométriques à 10⁻⁴ près), lignes « Erreur à éviter », notations par carte (règle ci-dessus), **aucun couple de données** d'un exercice, d'un corrigé, d'un indice, d'un test ou d'une figure de la même carte.
2. Rendu KaTeX, sur le modèle de `verif_mm_etape7_katex.cjs` : aucune formule ne lève d'erreur.
3. Le validateur, avec ton fichier : `python scripts\check_lot.py --mindmaps <ton fichier>`. « Validation REUSSIE » attendu, sans avertissement de carte manquante sur tes compétences.

## Ce que tu ne fais jamais
Modifier quoi que ce soit hors de ton fichier de cartes et de tes scripts `_travail\verif_mm_8_*`. Aucun commit.

## Ta réponse finale
8 lignes maximum : le fichier, le nombre de lignes par carte, le résultat des vérifications, ce qui reste à trancher.
