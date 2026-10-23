# Feuille de route, du sprint en cours jusqu'à la bêta

> Mise à jour le 23 octobre 2026 (clôture de A1). Ordre validé par Gauthier : **bloc A (contenu), puis B (mobile), puis C (application), puis D (sprint final)**. Sprints courts numérotés A1, A2… ; un sprint dure environ 2 semaines à 4 h par semaine. Le sprint en cours est détaillé dans `SPRINT.md` ; ce fichier ne garde que ce qui reste à faire.

---

## Bloc A : contenu (le « mathématique pur »)

Chaque étape suit le circuit du skill `etape-contenu`. Le DAG v1 (`skills_dag.json`, 414 compétences, niveaux souvent faux) ne sert que de mémoire : chaque étape repart du programme officiel (`_travail/programmes/5eme.txt`, `3eme-4eme.txt`), avec les mêmes lettres de domaine que le v1 quand elles correspondent.

### A2. Étape 9 : proportionnalité du cycle 4 et fonctions (domaines E et J) (en cours, voir `SPRINT.md`)

- Contenu : proportionnalité du cycle 4 ; fonctions linéaires, affines, lecture graphique, tableaux de valeurs.
- **Avant la rédaction :** générateur de **courbes dans un repère** dans `scripts/figures.py` (étendre `repere`) ; domaine J ajouté aux métadonnées du DAG à la fusion. Aucune migration : les contraintes `[A-P]` de la base, des schémas et de `corriger` couvrent déjà J (constat du 23 octobre 2026).
- Probablement 2 sprints (A2a cartographe et outils, A2b rédaction).

### A3. Étape 10 : statistiques et probabilités (domaines K et L)

- Contenu : moyenne, médiane, étendue, diagrammes ; probabilités.
- Avant la rédaction (aucune migration, `[A-P]` couvre K et L) : générateurs de **diagrammes en barres et circulaires**, et d'**arbres**.

### A4. Étape 11 : super exercices de fin de cycle et cartes défi transverses

- Super exercices de fin de cycle (CM2, 6e, 3e), transverses, sur la compréhension des énoncés et la convergence des notions.
- Cartes défi pour tout le collège (compléter les domaines J, K, L).
- Objectif de volume (décision de Gauthier) : au moins 1 super exercice par classe et par domaine, viser 4 à 5.

### A5. Restes de contenu, en une seule passe

- Scinder **MM-A-01** (12 compétences, règle : 4 à 8).
- **EX-C030-D-01, E-03, M-02** : la fraction demandée en `numerique` passe en `texte`.
- `<` et `>` au CP : le validateur les réserve aux descendants de A006 (CE1), alors que le programme du CP les emploie ; vérifier le programme avant de changer la règle (question ouverte, `DECISIONS.md`).
- Exemple de **MM-C-03** (C011) : 95/60 non simplifié.
- Dessins encore absents : règle et équerre posées, pictogrammes pour le plan du CP, patron du pavé, vues d'un assemblage de cubes.

**Arbitrages à reconduire à chaque étape :** algorithmique et programmation (Scratch) hors évaluation, sauf un nœud de lecture si le programme l'impose ; seuil de maîtrise `{3, 4}` ; 6 exercices par compétence.

---

## Bloc B : application mobile (juste après le bloc A)

| Option | Ce que c'est | Notifications | Coût | Effort |
|---|---|---|---|---|
| **A. PWA** (application web installable) | Le site s'installe sur l'écran d'accueil, avec son icône et en plein écran | Android : oui. iPhone : oui, mais seulement si l'app est ajoutée à l'écran d'accueil (iOS 16.4 ou plus récent) | 0 € | 1 sprint : manifeste, service worker, notifications web envoyées par une Edge Function |
| **B. Capacitor** | Le même code React, emballé dans une vraie app Android et iOS, publiée sur les stores | Natives (Firebase et Apple), fiables | Google Play 25 $ une fois ; Apple environ 99 €/an ; un Mac ou un service de compilation en ligne pour iOS (Gauthier est sous Windows) | 1 à 2 sprints : connexion Google dans l'app à adapter, notifications natives, publication. Risque : Apple refuse les apps qui ne sont « qu'un site » |
| **C. TWA** (Android seulement) | La PWA publiée telle quelle sur Google Play (outil PWABuilder) | Celles de la PWA | 25 $ | Faible, une fois la PWA faite |
| D. Réécriture native (React Native) | Une deuxième application | Natives | Élevé | Exclu avec 4 h par semaine |

**Recommandation :** B1 PWA d'abord, puis B2 TWA pour être présent sur Google Play, puis B3 Capacitor pour iOS seulement quand la bêta aura validé l'intérêt et que les revenus couvriront les 99 €/an d'Apple.

**À trancher par Gauthier avant B1 :** toutes ces options demandent du HTTPS, donc un site déployé. Le bloc B suppose d'avancer une partie du bloc D (domaine, Netlify, HTTPS), que Gauthier voulait faire en dernier. Les règles Apple pour les apps destinées aux mineurs seront à revérifier au moment de B3.

- **B1. PWA :** manifeste, icônes 192 et 512 px (logo source `Math_Edu_Application/logos/`, variantes dans `public/brand/`, voir `logos/LISEZMOI.md`), service worker, notifications web par Edge Function (rappels : emails d'abord, notifications ensuite), sans notification nocturne (garde-fou CNIL pour les mineurs).
- **B2. TWA** sur Google Play (PWABuilder).
- **B3. Capacitor iOS**, après la bêta.

---

## Bloc C : application

**C0. À trancher par Gauthier d'abord** (détail et recommandations dans `DECISIONS.md`, questions ouvertes) :
- les 3 failles du sprint 6 : corrigés du parent, exercice refait après correction, super exercice repassé ;
- la page « Séance » en temps réel (Supabase Realtime, table `seance_etat`), oui ou non ;
- les propositions du sprint 5 (devoirs assignés, bilan mensuel, objectif de période, note privée du professeur).

**C1. Corriger les failles** selon les décisions de C0 (migration, tests SQL, `/security-review`).

**C2. Restes de l'application :**
- photo du profil professeur (stockage de fichiers Supabase) ;
- chemins trop longs (jusqu'à 90 compétences pour un élève très en retard) : n'afficher que les prochaines étapes ;
- Cron des rappels (`supabase/cron/rappels.sql`, `pg_cron`, `CRON_SECRET`), avec Gauthier ;
- page « Séance » et propositions du sprint 5, si retenues en C0.

Repris plus tard (décision du 19 octobre 2026) : refus du consentement par le parent, aujourd'hui le compte reste utilisable « en attente » (bloquer, supprimer après un délai, ou relancer le parent).

---

## Bloc D : sprint final, déploiement et référencement, puis bêta

**Gauthier connaît mal le sujet** : produire un **guide pas à pas**, avec chaque clic, chaque écran et chaque valeur à saisir, et le dérouler avec lui.
1. dépôt GitHub privé dédié `math-education`, avec accès pour Marius ;
2. achat du domaine (OVH, environ 12 €/an, nom à choisir avec Gauthier) ;
3. Netlify relié au dépôt, avec les variables `VITE_*` recopiées **avant** le premier build, et `NODE_VERSION=20` (react-router 7) ;
4. DNS du domaine vers Netlify, puis HTTPS ;
5. Resend avec le domaine vérifié (SPF, DKIM), branché comme SMTP de Supabase Auth et utilisé par les Edge Functions d'emails ;
6. URL de redirection de Supabase Auth et de Google OAuth sur le domaine ;
7. passage de l'écran Google en Production (exige la politique de confidentialité) ;
8. PWA installable (déjà faite si le bloc B est passé) ;
9. **référencement** : landing statique séparée sur la racine du domaine (Astro ou HTML), application sur `/app`, politique de confidentialité, mentions légales, `sitemap.xml`, Google Search Console. Ne pas migrer la SPA pour le SEO ;
10. Supabase Pro (pas de mise en pause, protection contre les mots de passe compromis), ou ping hebdomadaire actif (`supabase-keepalive.yml`) ;
11. secret du Cron comparé en temps constant (mineur, relevé par la revue de sécurité du sprint 6) ;
12. vérification finale sur téléphone, tablette et ordinateur.

**Puis la bêta fermée** : 5 à 10 élèves, date à replanifier à ce moment.

---

## En parallèle, côté Gauthier (sans code)

- Valider les 8 hypothèses du business plan (`Management de Projet/Business_plan.md`, §9).
- Une seule séance pour les tests manuels (`TESTS_MANUELS.md`).
- Recette du contenu par Marius dans `/recette`, au fil des publications.

---

## Plus tard

- **Lycée** (seconde, première et terminale spécialité, programmes déjà extraits dans `_travail/programmes/`) : domaines H (géométrie analytique), I (trigonométrie), J (fonctions), M (suites), N (analyse), O (espace et vecteurs), K et L. **À ne pas commencer avant que le collège soit fini et testé par de vrais élèves.**
- **Version « classe »** pour les professeurs de mathématiques (niveau de chaque élève, forces et faiblesses, devoirs personnalisés). Vente aux établissements par le **GAR** et contraintes RGPD fortes. C'est un autre produit : rien avant que l'offre élève fonctionne.
- Rien de l'« itération 2 » (paiement, classe entière) avant de vrais élèves. Pas de paiement tant que la progression n'est pas entièrement côté serveur.

## Risques à garder en tête

- **Effet tunnel :** mieux vaut le collège excellent que le lycée bâclé.
- **Accessibilité :** le texte alternatif d'une figure ne donne pas la réponse, donc un élève aveugle ne peut pas faire les exercices à figure. À traiter avec Marius.
- **RGPD et mineurs :** consentement avant 15 ans, export et suppression faits ; hébergement UE.
- **Poids du bundle** (148 ko gzippés au premier chargement) ; cache du contenu en `localStorage` (environ 5 Mo), à passer sur IndexedDB au-delà de quelques milliers d'exercices : **le seuil approche** (1 654 exercices).
