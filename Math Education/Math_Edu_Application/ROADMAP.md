# Où en est l'application, et ce qui reste à faire

> **À lire en premier** pour reprendre le projet. Ce fichier dit l'état réel du
> code, les décisions déjà tranchées et pourquoi, et ce qui reste sprint par
> sprint. Tenu à jour à chaque fin de sprint.
>
> Les trois documents de l'application, à ne pas confondre :
> - `README.md` : résumé technique court.
> - `GUIDE.md` : comment travailler sur le code (commandes, structure, recettes).
> - `ROADMAP.md` (ce fichier) : où on en est, ce qui vient, et pourquoi.
>
> Contexte produit d'ensemble (DAG, modèle économique, rôles) : `../CLAUDE.md`.
>
> **Attention en lisant `../CLAUDE.md` et `../Management de Projet/MATH_EDUCATION_Roadmap.docx` :**
> ces deux documents datent de juillet 2026 et décrivent un MVP visé pour
> septembre 2026, découpé en jalons 1 à 6 sur 9 semaines. Ce calendrier est
> dépassé. Le contexte produit qu'ils portent reste valable, leur planning non.
> En cas de divergence sur l'avancement, **c'est ce fichier qui fait foi.**

Dernière mise à jour : **29 septembre 2026**.

---

## 1. État en une page

L'application a 13 écrans qui fonctionnent, adossés au vrai contenu pédagogique
de Marius. Le moteur (progression sur le DAG, positionnement adaptatif, révision
espacée, correction) est couvert par 176 tests. **L'authentification Google et
email, la base Postgres et les politiques RLS sont codées, appliquées et
validées contre le vrai projet Supabase.**

Ce qui manque encore, par ordre de valeur :

| Manque | Conséquence concrète | Sprint |
|---|---|---|
| Emails | Le consentement parental est impossible à obtenir, donc aucun élève de moins de 15 ans n'est en règle | 2b |
| Contenu et correction côté serveur | Contenu en base et hors du bundle depuis le 4 octobre 2026 ; les réponses restent lisibles en base par tout compte connecté | 3 |
| Déploiement | L'application n'est accessible que en local | 4 |
| Espace parent | Le rôle existe mais son espace est une page d'attente | 5 |
| Paiement | Rien n'est monétisé, la page `/abonnement` est informative | Itération 2 |

### Les quatre commandes de vérification

Du plus isolé au plus réel. Toutes vertes au 29 septembre 2026.

| Commande | Ce qu'elle valide | Dernier résultat |
|---|---|---|
| `npm test` | Moteur et repository, en isolation | 176 tests, 8 fichiers |
| `npm run test:sql` | Les 4 migrations et les politiques RLS, dans un Postgres jetable (Docker) | 21 assertions |
| `npm run check:supabase` | Le projet réel est réveillé, les 9 tables sont là, l'accès anonyme est bloqué | 9 / 9 |
| `npm run check:db` | Triggers, RLS, escalade de privilège, capacité, contre le **vrai** projet | **26 / 26** |

Avant tout commit : `npm test && npm run lint && npm run build`.
Après toute modification de `supabase/migrations/` : `npm run test:sql`.

### Ce qui n'est PAS vérifié

Honnêteté nécessaire pour la suite : **le parcours utilisateur n'a jamais été
déroulé dans un navigateur.** `check:db` valide la base par requêtes HTTP, pas
l'interface. Les six vérifications manuelles ci-dessous restent à faire, et
devraient l'être avant d'entamer le sprint 2b.

1. **Inscription Google.** Attendu : arrivée sur `/bienvenue`, pas sur `/travail`.
   Renseigner élève, CM1, une date de naissance de moins de 15 ans. Le bloc email
   parent doit apparaître et bloquer la validation s'il est vide.
2. **Persistance réelle, le test qui compte.** Faire le positionnement, puis des
   exercices jusqu'à maîtriser une compétence. Se déconnecter, **vider le
   `localStorage`**, se reconnecter. La progression doit être intacte.
3. **Cloisonnement.** Créer un second compte élève, vérifier qu'il ne voit rien
   du premier.
4. **Écritures granulaires.** Onglet Réseau pendant une réponse d'exercice.
   Attendu : un `upsert` sur `skill_progress`, un `insert` sur
   `exercise_attempts`, et rien d'autre. Si 38 lignes passent, la sauvegarde en
   bloc est revenue.
5. **Connexion par mot de passe.** Un mauvais mot de passe doit afficher une
   erreur, pas ouvrir un compte.
6. **Capacité.** Réserver le même créneau avec trois comptes, tenter un
   quatrième. Le refus doit venir de la base.

---

## 2. Calendrier

La roadmap d'origine visait le MVP en ligne avant la rentrée de septembre 2026.
Cette date est passée sans que le déploiement soit commencé. Le calendrier
retenu, calibré sur **4h par semaine et un budget de 500 €** :

| Échéance | Jalon |
|---|---|
| Fin novembre 2026 | Bêta fermée, 5 à 10 élèves de l'entourage |
| Janvier 2027 | Premiers élèves, phase gratuite. Retour des vacances de Noël, second créneau naturel de l'année scolaire |

---

## 3. Sprint 1, livré

Audit complet de l'application, puis correction des blocages. Les constats sont
conservés ici parce qu'ils expliquent la forme du code actuel.

### Le blocage principal

**Le test de positionnement mourait en cul-de-sac**, donc aucun élève ne pouvait
créer son parcours. `startPlacement` et `answerPlacement` choisissaient la
compétence suivante sans vérifier qu'elle possède un exercice, et 15 des 38
compétences du contenu pilote n'en ont aucun.

Mesuré sur les 12 niveaux et 3 stratégies de réponse : CP, CE1, CM1, CM2 et 6e
bloqués dès la première question, CE2, 5e, 4e et 3e bloqués en cours de test dès
la première bonne réponse. Seule la stratégie « toujours faux » terminait.
CM1, CM2 et 6e sont le cœur de cible.

Corrigé par un prédicat `isTestable` appliqué aux quatre points de sélection, et
une traversée qui saute les compétences sans exercice au lieu de s'y arrêter.
Vérifié : 39 des 67 tests de `placement.test.ts` échouent sur l'ancien code.

### Les autres corrections

- **Aucune garde de rôle** sur les routes : un élève pouvait ouvrir
  `/prof/cours`. Le rôle `parent` était proposé à l'inscription et atterrissait
  dans l'espace élève, avec un test de mathématiques à passer.
- **Six boutons morts**, sans `onClick` : « Découvrir l'abonnement », deux fois
  « Renvoyer » l'email parent, « Exporter ou supprimer mes données » (obligation
  RGPD), « Modifier » le prix, « Graphe » d'un élève. Branchés, ou retirés quand
  rien ne pouvait encore les servir.
- **Textes mensongers** : l'écran affirmait « un email a été envoyé à… » alors
  qu'aucun service d'email n'existait.
- **Race condition** dans l'enregistrement d'une réponse : `applyAttempt`
  sortait son résultat de l'updater de `setSession` par mutation d'une variable
  externe. React ne garantit pas que l'updater tourne avant le retour.
- **Priorité du jour sans exercice** : l'espace de travail annonçait
  « 0 exercices » puis ouvrait un écran vide.
- `crypto.randomUUID()`, **redirection ouverte** sur l'écran de connexion
  (`lib/redirect.ts`), tolérance numérique à 0 sur les flottants.
- Mise en place de **Vitest**.

### Constats non traités au sprint 1

- Les **réponses des exercices sont dans le bundle** livré au navigateur.
  Vérifiable : `grep -o '"value":[0-9]*' dist/assets/index-*.js`. Sprint 3.
- **Mur de taille du contenu** : les 3 JSON sont importés statiquement, donc dans
  le chunk principal. À la cible de 414 compétences et 5 exercices par niveau,
  cela ferait de l'ordre de 8 Mo de JSON dans le bundle. Sprint 3.
- **Polices Google chargées depuis le CDN** alors que l'écran de connexion
  affiche « Données hébergées dans l'Union européenne ». Sprint 4.
- **Aucune page publique ni politique de confidentialité.** Sprint 4, et
  prérequis pour passer l'écran de consentement Google en Production.
- **Aucune vérification des professeurs** : n'importe qui s'inscrit comme prof et
  ouvre des créneaux payants. Itération 2.

---

## 4. Sprint 2a, livré

L'application avait 12 écrans mais **aucun backend** (le 13e, /bienvenue, est né de ce sprint). La progression vivait dans
le `localStorage`, donc perdue en changeant d'appareil ou en vidant le cache.

### Le changement d'architecture central

L'ancienne interface exposait `save(session)` : le provider réécrivait la session
entière à chaque changement d'état. Acceptable contre `localStorage`, intenable
contre Postgres, où une seule réponse d'exercice aurait réécrit les 38 lignes de
progression et tout l'historique.

`data/repository.ts` expose désormais **une mutation par intention** (neuf au
total). `signInDemo()` et `signInTeacher()` ont disparu de l'interface, c'étaient
des notions de maquette. `mockRepository` implémente le même contrat et reste
sélectionnable, ce qui permet une démonstration hors ligne et sert de
spécification exécutable (`mockRepository.test.ts`).

Chaque échec d'écriture remonte dans un bandeau (`SyncErrorBanner`) qui dit à
l'élève que son travail n'est pas enregistré. On ne corrige jamais en silence :
un élève qui a travaillé pour rien doit l'apprendre.

### Authentification

Bouton Google **au-dessus** du formulaire, vraie connexion par mot de passe, et
un écran `/bienvenue` qui réclame niveau scolaire et date de naissance après un
retour OAuth. Sans cet écran, impossible d'appliquer la règle des 15 ans à un
compte Google, qui ne fournit que l'identité. La logique d'âge est partagée dans
`lib/age.ts` par les deux écrans, pour qu'elle ne puisse pas diverger.

L'email et le mot de passe restent un chemin de plein droit : les comptes Google
supervisés par Family Link, donc ceux des moins de 13 ans, peuvent être empêchés
de se connecter à un service tiers.

Les entrées de démonstration sont reléguées en bas de l'écran et **invisibles**
dès que les clés Supabase sont présentes.

### Les quatre migrations et les bugs qu'elles corrigent

Chaque fichier de `supabase/migrations/` documente son bug, sa cause, et pourquoi
il avait échappé aux tests. Résumé :

| Migration | Contenu |
|---|---|
| **0001** | Schéma complet : 9 tables, 21 politiques RLS, triggers de création de profil et de capacité, vue `slots_disponibles`. Deux corrections de modèle par rapport au mock : `places_prises` est calculé et non stocké, et la capacité est garantie par un trigger avec verrou de ligne. |
| **0002** | La ligne `teachers` est créée automatiquement. Sans elle, tous les créneaux d'un professeur étaient silencieusement écartés de l'écran de réservation, et une réservation déjà prise disparaissait de « Prochain cours ». |
| **0003** | `refuse_surbooking()` n'était pas `security definer`, donc son `select ... for update` était filtré par le RLS de l'élève. **Aucune réservation n'était possible.** |
| **0004** | La vue comptait les réservations sous le RLS du lecteur : un élève voyait 0 ou 1 place prise au lieu de 3, donc un créneau complet s'affichait comme disponible. |

Ajouté aussi dans 0001 : un trigger qui interdit au client de modifier `role`,
`consentement_parental_at`, `email`, `cree_le` et `abonnement`. Sans lui, un
élève pouvait se déclarer `prof` et ouvrir des créneaux payants, et surtout **un
mineur pouvait se confirmer à lui-même le consentement de son parent**, faisant
tomber la protection légale des moins de 15 ans. Les appels serveur
(`service_role`) passent outre, car ce sont eux qui confirmeront le consentement
après vérification du jeton envoyé au parent.

---

## 5. Ce qui reste

### Sprint 2b, emails et consentement parental

Le dernier manque fonctionnel visible pour un utilisateur.

1. **Montée en Node 24 LTS, à faire en premier.** Voir section 7, c'est devenu
   un blocage dur et non plus un avertissement.
2. **Acheter le domaine** (OVH, environ 12 €/an). Prérequis technique : Resend
   n'enverra pas d'email de consentement depuis une adresse Gmail, il faut un
   domaine vérifié. En mode test, Resend n'accepte d'envoyer qu'à sa propre
   adresse, ce qui suffit pour développer mais pas pour un vrai parent.
3. Edge Function `send-parent-consent` plus Resend. Lien signé à usage unique,
   expiration 7 jours. La table `parent_links` et sa colonne `token_hash`
   existent déjà (migration 0001), le jeton ne doit jamais être stocké en clair.
4. Page publique `/consentement/:token` qui pose `consentement_parental_at` via
   une fonction serveur, jamais depuis le navigateur.
5. Brancher les boutons « Renvoyer », avec limitation de débit.
6. Remplacer `gauthier.marre40@gmail.com` par l'adresse du domaine sur
   `SubscriptionPage` et `ParentPage`.

### Sprint 3, contenu en base et correction côté serveur

1. **Fait le 4 octobre 2026.** Migration 0005 (tables `content_*`, fonction
   `publier_contenu`) et `../scripts/publier.py`, qui valide le contenu puis le
   publie avec la clé `service_role`.
2. **Fait le 4 octobre 2026.** `src/content/index.ts` est rempli au démarrage
   depuis la base (`src/content/chargement.ts`), à signature publique identique.
   Chunk principal de 133 à 24 ko gzippés ; les JSON ne sont plus déployés dans
   une construction qui a les clés Supabase.
3. Edge Function `submit-answer` : correction et progression côté serveur.
   `lib/exercise.ts` et `lib/dag.ts` sont du TypeScript pur et se déplacent tels
   quels. Les réponses deviennent illisibles pour l'élève (retrait de la politique
   transitoire sur `content_exercise_keys`), et la progression devient
   inviolable, ce qui est indispensable le jour où l'abonnement est payant.
4. **Adopter TanStack Query** ici, pas avant. Le cache et l'invalidation
   deviennent réellement nécessaires quand le contenu vient de la base et que les
   espaces parent et professeur lisent les données d'autres utilisateurs.

### Sprint 4, mise en ligne

1. Dépôt GitHub privé dédié `math-education`, sorti de `Jarvis` (accès Marius).
   Déplacer aussi `.github/workflows/supabase-keepalive.yml`.
2. `netlify.toml`, déploiement automatique sur `main`, previews sur PR, et
   **recopier les variables `VITE_*` dans Netlify** avant le premier build en
   ligne. Aligner `NODE_VERSION` sur la version locale.
3. `public/` avec favicon et icônes, `vite-plugin-pwa`, auto-hébergement des
   polices.
4. Landing publique sur `/`, politique de confidentialité, CGU. Débloque le
   passage de l'écran de consentement Google en Production.
5. Sentry et PostHog. Test sur un téléphone réel, Lighthouse supérieur à 85.
6. Décider de la montée en react-router 7 (voir section 8).

### Sprint 5, espace parent

Périmètre retenu : minimum légal plus suivi en lecture seule.

- `/parent` : progression de l'enfant par domaine, sa lacune du jour, sa
  dernière connexion. Lecture seule, aucune note, aucun classement.
- `/parent/consentement` : donner ou retirer l'accord, liste explicite des
  données collectées et de leur finalité.
- `/parent/donnees` : export et suppression définitive du compte de l'enfant.
- `/parent/reglages` : résumé hebdomadaire, alertes de décrochage. Edge Function
  en cron.

Reporté à l'itération 2 : réservation et paiement par le parent, factures,
multi-enfants dans l'interface, messagerie avec le professeur.

### Sprint 6, filet de sécurité avant les élèves

- Playwright sur trois parcours : inscription avec consentement, positionnement
  complet, série d'exercices jusqu'à maîtrise.
- `/security-review` complet. Non négociable avant le premier élève réel.
- Mélange et tirage des exercices (aujourd'hui un élève qui refait une
  compétence revoit la même série dans le même ordre), et `streakDays` calculé
  au lieu d'être en dur dans `WorkspacePage`.

### Itération 2, après la bêta

Stripe Checkout et webhooks, espace professeur v1 complet (fiche élève avec son
DAG, préparation de séance, compte-rendu, revenus via Stripe Connect,
vérification des professeurs), rappels façon Duolingo, gamification.

### En parallèle, pour Marius

**15 des 38 compétences du contenu pilote n'ont aucun exercice** : B001, B005,
B006, C026, C027, C029, C030, C031, C032, A012, A013, A014, A026, A027, A028.
Le code les contourne sans casser depuis le sprint 1, mais elles dégradent la
précision du diagnostic tant qu'elles sont vides.

---

## 6. Décisions tranchées, à ne pas rejouer

| Décision | Raison |
|---|---|
| **On ne change pas de langage ni de framework** | React, TypeScript, Tailwind et Supabase sont le bon choix à 4h/semaine avec 500 €. Le manque n'était pas la stack, c'était l'absence totale de backend. |
| **Supabase en tier gratuit, plus un ping hebdomadaire** | Le tier gratuit met un projet en pause après une semaine d'inactivité puis finit par le supprimer. Un premier projet a été perdu comme ça. Le Pro à 25 $/mois est reporté au moment où de vrais élèves seront dessus. |
| **Sprint 2 scindé en 2a et 2b** | Auth, schéma, RLS, repository et emails dans un seul chantier ne tient pas en 4h/semaine. |
| **Pas de TanStack Query avant le sprint 3** | Apprendre Supabase Auth, les RLS et TanStack Query en même temps est le meilleur moyen de ne rien finir. |
| **Page `/abonnement` informative, Stripe en itération 2** | Le modèle est arrêté (9,99 €/mois, cours à 20 € les 1h30) mais la plateforme est gratuite pendant la bêta. On informe, on n'encaisse pas, et on le dit. |
| **Espace parent au minimum légal d'abord** | Consentement, export et suppression sont des obligations RGPD non tenues. Le reste est du confort. |
| **Écran Google en mode Testing** | 100 utilisateurs de test sans validation Google, largement assez pour la bêta. Le passage en Production exige une politique de confidentialité en ligne, prévue au sprint 4. |
| **PWA avant React Native** | Même base de code. iOS 16.4 et au-delà supporte les notifications push pour une PWA installée, donc les rappels sont faisables sans passer par les stores. |
| **Le SEO n'imposera pas de migrer l'app** | Le jour où la landing doit ranker, ajouter une landing statique séparée sur la racine du domaine et garder la SPA sur `/app`. |

---

## 7. Node : blocage dur à lever au sprint 2b

`supabase-js` initialise son client realtime dès `createClient()` et exige un
WebSocket natif, absent avant Node 22. **L'application n'est pas touchée** (le
navigateur en a un, et le build passe), mais tout script Node l'est. Le script
`supabase/tests/integration.mjs` a été écrit en `fetch` pur pour contourner, ce
qui le rend d'ailleurs indépendant de la version de Node. Le script de seed du
sprint 3 rencontrera le même mur.

État au 29 septembre 2026 : Node **18.18.0**, installé directement dans
`C:\Program Files\nodejs`, sans gestionnaire de version. `.nvmrc` épingle
`18.18.0`, `engines` dit `>=18.18.0`.

**Cible : Node 24 LTS**, et non 22. Node 22 arrive en fin de vie en avril 2027,
Node 24 tient jusqu'en 2028. `supabase-js` demande 22 minimum, donc 24 satisfait
la contrainte avec un horizon plus long, ce qui évite de refaire l'opération.

Marche à suivre :

1. Fermer VS Code et tous les terminaux, sinon l'installateur bute sur des
   fichiers verrouillés.
2. `winget install --id OpenJS.NodeJS.LTS --source winget`. L'installateur MSI
   remplace la version en place. Le `--source winget` évite l'invite
   d'acceptation du Microsoft Store.
3. Réouvrir un terminal, vérifier `node -v` et `npm -v`.
4. `Remove-Item -Recurse -Force node_modules` puis `npm install`. Le
   `package-lock.json` est déjà en `lockfileVersion: 3`, npm 11 ne le réécrira
   pas.
5. Passer `.nvmrc` à la version installée, et `engines` à `>=22`, le plancher
   réel imposé par `supabase-js` plutôt que la version exacte.
6. Relancer les quatre vérifications.
7. Au sprint 4, aligner `NODE_VERSION` sur Netlify.

Si un jour Node 18 doit être conservé pour un autre projet, il faudra
`nvm-windows` (`winget install CoreyButler.NVMforWindows`). À savoir :
contrairement à `nvm` sous Linux et macOS, **`nvm-windows` ne lit pas `.nvmrc`**,
il faut taper `nvm use 24` à la main.

---

## 8. Dette technique et points ouverts

**react-router, 2 vulnérabilités modérées.** Open redirect via un antislash dans
`<Link>` et `useNavigate`, et injection de constructeur dans l'hydratation SSR.
La branche 6.x **n'a aucun correctif** : seule la 7.18.4 corrige, et c'est une
montée de version majeure. Le cas qui concernait l'application, la redirection
après connexion, est couvert par `lib/redirect.ts` et ses tests. La migration en
v7 est une décision à prendre au sprint 4.

**Poids du bundle.** `supabase-js` a fait passer le premier chargement de 92 à
148 ko gzippés, dont un client realtime inutilisé. Les chunks vendor sont séparés
(`vite.config.ts`) pour qu'ils restent en cache entre deux déploiements, ce qui
aide les visites suivantes mais pas la première. Le réduire demanderait
d'importer `@supabase/auth-js` et `@supabase/postgrest-js` séparément, au prix
d'une API moins standard. À trancher au sprint 4 avec la cible Lighthouse.

**`suiviEleves` est en dur** dans `mocks/mockData.ts` et alimente encore l'espace
professeur. À remplacer par la vraie liste de classe avec l'espace professeur v1.

---

## 9. Pièges appris, à ne pas refaire

**Tester le SQL en propriétaire de table ne teste rien.** Les migrations 0003 et
0004 corrigent deux bugs de la même famille : une règle qui doit être vraie pour
tout le monde s'exécutait dans le contexte de sécurité du lecteur. Les deux ont
échappé au harnais local parce qu'il insérait et lisait **en propriétaire de
table**, ce qui contourne entièrement le RLS. Les fichiers de
`supabase/tests/` tournent désormais sous `set role authenticated` avec le JWT de
chaque utilisateur. Toute nouvelle assertion doit faire de même.

**Un fichier SQL interrompu passait pour vert.** `ON_ERROR_STOP` arrêtait un
fichier en cours de route et `run.sh` déclarait le test réussi, alors que
plusieurs assertions n'avaient jamais tourné. Chaque fichier finit maintenant par
une sentinelle `TEST FIN`, dont l'absence fait échouer le harnais.

**Les politiques RLS qui lisent une autre table protégée par RLS partent en
récursion infinie**, avec une erreur illisible. Toutes les jointures
d'autorisation sont isolées dans des fonctions `security definer`
(`est_prof_de`, `est_parent_de`, `role_actuel`, `peut_lire_eleve`,
`nb_places_prises`). C'est la première cause de perte de temps sur Supabase.

**La racine `/rest/v1/` renvoie 401 avec une clé publishable**, car l'OpenAPI
n'est servi qu'à la `service_role`. Ce 401 ne signale aucune panne. Le workflow
de maintien en éveil interrogeait cette route et aurait envoyé une fausse alerte
chaque lundi.

**`crypto.randomUUID()` n'existe qu'en contexte sécurisé.** Servir l'application
sur une IP de réseau local en http, ce qui est exactement la façon de tester sur
un téléphone, le rend indéfini. D'où `lib/id.ts` et son repli.

**Ne jamais laisser un bouton inerte ni un texte mensonger.** Un bouton absent
vaut mieux qu'un bouton mort, et l'écran ne doit jamais annoncer ce que le code
ne fait pas. C'est la règle qui a guidé la moitié des corrections du sprint 1.

---

## 10. Clés et accès

Tout est dans `.env.local`, ignoré par Git. Voir `.env.example` pour le modèle.

| Variable | Rôle | Exposée au navigateur |
|---|---|---|
| `VITE_SUPABASE_URL` | URL du projet | Oui, publique |
| `VITE_SUPABASE_ANON_KEY` | Clé publishable (ex « anon »), protégée par les RLS | Oui, publique |
| `VITE_USE_MOCK` | `true` force les données factices malgré des clés valides | Oui |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé secrète, scripts locaux uniquement (`check:db`, seed du sprint 3) | **Non, jamais** |

**Le préfixe `VITE_` n'est pas cosmétique** : tout ce qui le porte est embarqué
dans le JavaScript envoyé au navigateur. La clé `service_role` contourne toutes
les politiques RLS, elle ne doit donc jamais porter ce préfixe ni être copiée
dans les variables de build de Netlify.

Sans clés, l'application bascule automatiquement en mode démonstration plutôt
que de planter. C'est voulu : un oubli de variables au déploiement se voit
immédiatement.
