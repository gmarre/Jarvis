## Étape 4a : domaine P, grandeurs et mesures, CP à 6e (14 octobre 2026)

**Livré :** un domaine nouveau, P « Grandeurs et mesures » (le v1 n'avait aucun
domaine des grandeurs ; migration 0009 pour la lettre P). 27 compétences, dont
5 « à figure » sans exercice pour l'instant (P001 règle, P004, P007, P013
horloge, P017 quadrillage), 4 liens vers l'existant (D014 ← P015, D016 ← P003,
D006 ← P018, E007 ← P027), 132 exercices, 6 cartes mentales (MM-P-01 à 06). La
banque passe à 120 compétences, 636 exercices, 24 cartes. L'étape 4 est
découpée : 4b (géométrie plane) attend l'affichage des figures.

| Lot | Exercices | Bloquants | Importants | Mineurs |
|---|---|---|---|---|
| G1 premières mesures (CP-CE1) | 24 | 0 | 2 | 10 |
| G2 l'heure et les durées | 24 | 0 | 7 | 6 |
| G3 unités et conversions | 30 | 0 | 1 | 3 |
| G4 le périmètre | 24 | 0 | 5 | 3 |
| G5 aires et volumes | 30 | 0 | 2 | 3 |
| Cartes mentales | 6 cartes | 1 | 1 | 11 |

Aucune réponse fausse sur 132 exercices. Le bloquant de carte : 1 400 g dans
une section de CE1 (plafond 1 000). Toutes les corrections ont été contre-relues.

### Ce que l'étape a appris

1. **Le v1 n'avait aucune mesure au cycle 2**, et plaçait les formules de
   périmètre et d'aire au CM1, alors que « il n'est pas attendu de mémorisation
   de formules […] au CM1 » ; elles s'installent en 6e.
2. **Un domaine neuf manque de ses opérations de base.** Les rédacteurs ont
   signalé, lot après lot, que leurs compétences n'avaient pas parmi leurs
   ancêtres la soustraction, la multiplication, la comparaison, la virgule. Un
   audit complet du cartographe a ajouté une vingtaine d'arêtes. Leçon : pour un
   domaine neuf, faire cet audit AVANT la rédaction.
3. **Une compétence sans exercice bloquait tout ce qui en dépend** (le moteur
   exige des prérequis maîtrisés). Le moteur franchit désormais une compétence
   vide, transitivement (`isCleared`, lib/dag.ts).
4. **Beaucoup de réponses justes étaient refusées par la correction**, ce que
   seuls des relecteurs testant les saisies contre le vrai code ont vu. La
   correction ignore désormais les accents et la ponctuation finale, accepte
   les unités en toutes lettres et normalise les durées et horaires, pour toute
   la banque.
5. **L'environnement Python s'est corrompu** (installation interrompue par une
   coupure de session) et le validateur échouait en silence. Reconstruit depuis
   `scripts/requirements.lock.txt` ; `check_lot.py` affiche désormais un
   plantage.

### Contrôles et outillage

- Validateur : « formule » et « tableau de conversion » interdits avant la 6e ;
  unités d'aire (²) après P017, de volume (³) après P026 ; champ numérique des
  cartes, section par section.
- Moteur : compétences vides transparentes (`isCleared`).
- Correction : accents, ponctuation, unités en toutes lettres, durées.

### Ce qui reste ouvert

- **Figures** : 5 compétences sans exercice (règle, horloge, quadrillage). Leur
  carte les décrit en mots. Elles viendront avec l'affichage des images, comme
  la géométrie (étape 4b).
- La compétence P027 ne couvre plus l'année bissextile ni le siècle (faits à
  mémoriser, sortis de la compétence) : à loger ailleurs si Marius y tient.
