# Décisions de Gauthier et questions ouvertes

> Une ligne datée par décision, la plus récente en bas de chaque section. À lire avant de trancher quoi que ce soit ou de reposer une question. Les décisions du chef de projet (délégation de Gauthier) sont marquées « CP », Gauthier peut revenir dessus.

---

## 1. Questions ouvertes (à poser à l'ouverture du sprint concerné)

**Bloc B (mobile)**
- Avancer une partie du déploiement (domaine, Netlify, HTTPS) pour faire la PWA, ou attendre le bloc D ? Recommandation : PWA, puis TWA, puis Capacitor iOS après la bêta (`FEUILLE_DE_ROUTE.md`, bloc B).

**Bloc C (application), failles du sprint 6** (revue de sécurité du 21 octobre 2026 ; chacune touche une décision produit, rien n'est codé) :
1. **Corrigés du parent** (`corriges_pour_parent`, migration 0019) : tout parent ayant un enfant rattaché lit les réponses de tous les exercices de n'importe quelle compétence. Un élève peut donner une seconde adresse comme « parent », confirmer lui-même, puis lire toutes les réponses. *Recommandation :* ne rendre au parent que les corrigés des exercices que son enfant a déjà faits (la révision ensemble reste possible, la fuite disparaît).
2. **Exercice refait après sa correction** : un exercice raté puis réussi plus tard compte comme réussi ; un élève peut donc acquérir une compétence en recopiant les corrigés. *Recommandation :* n'ajouter un exercice à `exercices_reussis` que s'il est juste du premier coup, ou après 24 heures.
3. **Super exercice repassé** : après un premier passage, l'élève connaît les corrigés et peut le réussir au second. *Recommandation :* un délai de 24 heures entre deux passages, et le 5 sur 5 (sans faute) seulement au premier passage réussi.

**Bloc C, produit**
- **Page « Séance » en temps réel** (le professeur choisit une carte ou un exercice, les élèves de la séance le voient s'afficher ; Supabase Realtime, table `seance_etat`), oui ou non. Aujourd'hui : version 1 sans temps réel (le professeur partage son écran, les élèves ouvrent le lien de l'exercice), choix de l'avis critique à confirmer.
- **Propositions du sprint 5** pour enrichir le suivi : devoirs assignés par le professeur (une liste de compétences, avec échéance) ; bilan mensuel automatique ; objectif de la période fixé ensemble ; note privée du professeur sur l'élève.
- **Refus du consentement par le parent** : bloquer, supprimer après un délai, ou relancer le parent (aujourd'hui « en attente », sans blocage).

**Bloc A (contenu)**
- Le programme du CP emploie `<` et `>` alors que le DAG les introduit au CE1 (A006) : à trancher avec la reprise du domaine A (sprint A5).

**Business**
- Les **8 hypothèses du business plan** (`Management de Projet/Business_plan.md`, §9).
- Supabase Pro, ou ping hebdomadaire (bloc D).

---

## 2. Décisions prises

### Cadre et calendrier
- 19/10/2026 : le déploiement vient en dernier, une fois tous les points du backlog et tout le contenu jusqu'à la 3e terminés ; la bêta suit et sera replanifiée.
- 19/10/2026 : domaine, dépôt dédié et déploiement au sprint final, avec un guide pas à pas.
- 19/10/2026 : pas de Docker Desktop (tests SQL sous PGlite).
- 19/10/2026 : business plan à proposer par Claude (fait le 21/10/2026, `Business_plan.md`).
- 20/10/2026 : avancer sans s'arrêter, tests manuels gardés pour une séance commune (`TESTS_MANUELS.md`).
- 21/10/2026 : « continuer à coder le reste en suivant les sprints ».
- 23/10/2026 : ordre de la suite : bloc A contenu, B mobile, C application, D sprint final ; sprints courts A1, A2… ; une session, un seul bloc.
- 23/10/2026 : CLAUDE.md découpé (socle, `pilotage/`, `.claude/rules/`, skills) ; `_travail/` des étapes closes archivé ; fiches RELECTURE archivées (la recette passe par `/recette`), `build_review_sheet.py` ne garde que le contrôle de coordination.

### Compte, profil, parents
- 19/10/2026 : accord du parent pour changer date de naissance ou email : **oui pour un mineur, non pour un majeur**.
- 19/10/2026 : réponses et corrigés visibles librement dans l'espace parent (on part du principe que l'enfant n'y va pas). Voir la faille 1 ci-dessus.
- 19/10/2026 : refus du parent : on ne bloque pas pour l'instant.
- 20/10/2026 : sprint 1 clos ; le point 4 (« connexion quand en arrière ») visait l'image de fond de l'écran de connexion (`captures/Fenetre_co.jpg`), en place. La page publique du parent est `/accord/:jeton`. Les pastilles de QCM gardent leur lettre d'origine (11 corrigés citent « la proposition c »).
- 20/10/2026 : Resend configuré (secret posé).

### Style
- 19/10/2026 : logo fourni (`Math_Edu_Application/logos/`), style graphique dérivé du logo ; palette du logo validée le soir même.

### Pédagogie
- 19/10/2026 : maîtrise exigeante, notée sur 5, avec contrôles réguliers, y compris sur ce que le test d'entrée a validé.
- 19/10/2026 : cartes défi écrites par agents.
- 19/10/2026 : super exercices : au minimum 1 par classe et par domaine, viser 4 à 5 ; ils portent sur la compréhension des énoncés et la convergence des notions ; jamais pendant le test d'entrée.
- 20/10/2026 : commencer par un super exercice par compétence, compléter ensuite, par domaine et par classe.
- 20/10/2026 : **table de maîtrise validée** :

| Niveau | Sens | Ce que fait l'application |
|---|---|---|
| 0 | Pas encore travaillée | Dans le plan si c'est une lacune |
| 1 | Un exercice réussi | Dans le plan de travail |
| 2 | Deux exercices différents réussis, aucun de niveau maîtrise | Dans le plan de travail |
| 3 | Rouverte après un contrôle raté, **ou exercices faits et super exercice à réussir** | Dans le plan ; rouverte : un exercice de maîtrise réussi la remonte à 4 (si le super exercice a déjà été réussi) ; sinon c'est **le super exercice réussi qui la fait passer à 4** |
| 4 | Acquise (2 exercices différents réussis, dont 1 de maîtrise, **et le super exercice réussi** s'il existe) ; **débloque les compétences suivantes** | Contrôles à J+3, J+10, J+30 ; 3 contrôles réussis d'affilée **et le super exercice réussi sans faute** la font passer à 5 |
| 5 | Complètement acquise (le plus dur à atteindre ; ne bloque rien) | Plus aucun contrôle |

  - Un contrôle : un exercice de la compétence non fait récemment, de niveau entraînement ou maîtrise ; il apparaît dans « À réviser » avec les cartes.
  - Contrôle raté : descente à 3, la compétence revient dans le plan.
  - Validée par le test d'entrée : niveau 4, contrôles plus espacés (J+14, puis J+45) ; un contrôle réussi ne change rien de visible, un raté rouvre (niveau 3).
  - Reprise des progressions existantes : « maîtrisée » devient 4 avec un contrôle à J+3 ; « en cours » devient 1 ou 2 selon les réussites.
  - L'élève voit son niveau sur 5 (5 petits ronds) par compétence.
- 20/10/2026 (soir) : **règle du super exercice** : il fait passer au niveau 4, qui débloque les suivantes ; le niveau 5 demande plusieurs réussites d'exercices **et** de super exercices sans faute. Mise en œuvre (`lib/maitrise.ts` : `apresEpreuve`, `attendEpreuve`, `viseSansFaute`) : un super exercice raté ne fait rien redescendre ; compétences sans super exercice (A001, G001, G004) : table d'origine ; progressions déjà au niveau 4 : gardées.
- 20/10/2026 (soir) : rythme choisi par l'élève et rappels par email ; avant 15 ans le parent accepte, ensuite l'élève active lui-même ; 1 par jour, 3 par semaine, arrêt après 2 sans effet ; garde-fou : pas de mécanique manipulatrice sur des mineurs (CNIL).

### Professeur
- 19/10/2026 : visio par **Jitsi Meet** (lien unique et difficile à deviner, par séance, visible des seuls inscrits) ; pas de visio développée.
- Vérification des professeurs par l'administrateur avant d'ouvrir l'offre à des inconnus.
- Messagerie de suivi : le parent voit tous les échanges et peut écrire ; jamais d'échange privé entre un adulte et un mineur hors de la vue du parent.

### Contenu
- 19/10/2026 : 13 arbitrages de l'étape 5 validés.
- 20/10/2026 : 9 arbitrages de l'étape 6 validés ; tranche pilote complétée.
- 20/10/2026 (soir), étape 7, Gauthier délègue (« suivre tes propres recommandations, prendre les initiatives, consigner tous les choix »). CP :
  1. B054 (programme de calcul en une expression) et B055 (distributivité numérique) en **B** ; F commence avec la lettre.
  2. **Numérotation du v1 gardée** (F002 à F031 quand la notion correspond, nouveaux F061 à F068) ; pas de renumérotation.
  3. Complément « pensée algébrique du cycle 3 » (B056 à B058, F069 à F071), prérequis de B054, B055, F003, F023.
  4. Découpage du cartographe validé (deux nœuds par notion sur deux classes, double distributivité en 3e, x² = a en F068).
  5. Tout rédigé, saisie des expressions comprise ; au moins un tiers de QCM ou de nombres par compétence à saisie d'expression ; F062 et F065 en évaluation partielle.
  6. Liens B049 ← B055 et B051 ← B054 adoptés, arête B049 ← B011 retirée.
  7. Validateur : x² après une lettre → A029 ; ⩽ ⩾ ≤ ≥ → F031. La règle « lettre désignant un nombre » n'est pas ajoutée (risque de faux positifs).
- 21/10/2026, étape 8, délégation reconduite. CP :
  1. Le programme en vigueur (`5eme.txt`) n'a plus la rotation, l'homothétie, les triangles égaux et semblables, l'inégalité triangulaire, la latitude et la longitude, le repérage dans un pavé ni l'agrandissement-réduction : **aucun nœud**, réserve gardée dans les deux comptes rendus.
  2. Numérotation du v1 gardée quand la notion correspond (G038, G040 à G043).
  3. Découpages validés tels quels (28 et 18 nœuds) ; nœuds en évaluation partielle gardés (G050, G051, G052, G071, G076).
  4. Pythagore en 4e (G040) avec une valeur approchée de racine (A034, A035 dans la chaîne) ; Thalès et trigonométrie en 3e.
  5. « Une médiane partage un triangle en deux aires égales » va dans P028 (aire du triangle), pour éviter un cycle.
  6. Grandeurs quotients en P (P036, P037) ; débit et masse volumique comme exemples.
  7. π : valeur exacte en texte (« 36π ») ou en QCM ; valeur approchée avec une tolérance d'un demi-rang d'arrondi (0,05 au dixième). La correction lit « 36pi », les hectares, les ares, « km.h-1 » et « kilomètres par heure ».
  8. Cartes mentales : les quatre cartes courtes de 8a acceptées.
  9. Figures nouvelles (vecteur, transformations, extensions de `solide`) codées avant la rédaction des nœuds qui en dépendent.

Le détail des sprints 1 à 6 (ce qui a été codé, quand, et pourquoi) est dans `archive/CLAUDE_avant_decoupage_2026-10-23.md`, §6.
