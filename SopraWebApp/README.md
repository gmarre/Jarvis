# SopraWebApp — PI Planning Assistant

Application complète de préparation de backlog SAFe avant un PI Planning :
import du document d'exigences, extraction et décomposition assistées par IA,
revue humaine à chaque étape, clustering, dépendances, priorisation, roadmap
sous contrainte de capacité, export Jira.

L'interface reproduit fidèlement le projet Claude Design
[**PI Planning Screens**](https://claude.ai/design/p/858ca1a5-47a7-4871-8669-11f09c3cbdb4) —
mêmes couleurs, mêmes typographies, mêmes composants — mais branchée sur une
vraie base de données et un vrai backend.

## Démarrer

```bash
npm install
npm start
```

Puis <http://127.0.0.1:4173>.

La base est créée et peuplée au premier démarrage. Comptes de démonstration,
mot de passe `piplanning` pour tous :

| Compte | Rôle | Ce qu'il peut faire |
|---|---|---|
| `lea.moore@commerce-group.com` | Product Owner | Tout sauf l'administration |
| `adam.mercer@commerce-group.com` | Business Analyst | Idem |
| `tom.barnes@commerce-group.com` | Scrum Master | **Lecture seule** — toute écriture renvoie 403 |
| `karim.benali@commerce-group.com` | Administrator | Utilisateurs, configuration IA, journal d'audit |

## L'IA

Par défaut l'application tourne **sans clé API** : un moteur heuristique local
assure extraction, décomposition, clustering, scoring et détection de
dépendances. Le pipeline est complet et démontrable hors ligne, mais la qualité
est celle de règles, pas d'un modèle — les confiances sont plafonnées sous le
seuil de revue pour que rien ne passe sans relecture humaine.

Pour activer Claude :

```bash
# Variable d'environnement
set ANTHROPIC_API_KEY=sk-ant-...   # Windows
export ANTHROPIC_API_KEY=sk-ant-…  # macOS / Linux
npm start
```

ou depuis l'application : **Administration → AI configuration** (la clé est
stockée en base et n'est jamais renvoyée au navigateur).

Modèle utilisé : `claude-opus-5`, en sortie JSON structurée
(`output_config.format`) avec mise en cache du prompt système. Si un appel
échoue, expire ou est refusé, l'application bascule automatiquement sur le
moteur local — l'étape aboutit toujours, et le bandeau indique quel moteur a
produit le résultat.

## Le pipeline

11 étapes, chacune avec revue humaine (approuver / rejeter / rouvrir) :

```
Import → Extraction → Epics → Features → Stories → Tasks
      → Clusters → Dependencies → Prioritization → Roadmap → Export
```

La traçabilité est conservée à chaque niveau : chaque epic sait de quelles
exigences il vient, chaque feature de quelles exigences de son epic, chaque
story de quelle feature. C'est ce qui empêche deux features d'un même epic de
produire les mêmes stories.

| Étape | Ce qui se passe réellement |
|---|---|
| Import | Upload PDF / DOCX / TXT / MD (25 Mo max), parsing texte, découpage en sections |
| Extraction | Document → exigences normatives, avec section et page d'origine |
| Epics | Exigences approuvées → domaines de capacité |
| Features | Epic → unités livrables en un sprint, estimées en points |
| Stories | Feature → user stories avec critères Given / When / Then |
| Tasks | Story → tâches d'ingénierie estimées en heures |
| Clusters | Regroupement sémantique et détection de doublons |
| Dependencies | Détection des dépendances, y compris entre projets |
| Prioritization | MoSCoW (glisser-déposer), WSJF, matrice Valeur × Risque |
| Roadmap | Program board : features par sprint, sous contrainte de capacité |
| Export | Portail d'approbation → JSON, CSV, ou charge utile Jira |

## Fonctionnalités transverses

- **Trains** — un train groupe les projets qui livrent ensemble, partage des
  exigences, une roadmap et les dépendances inter-projets.
- **Capacité** — import d'un classeur Excel (lignes = projets, colonnes =
  sprints) ou édition directe de la grille. Un modèle est téléchargeable.
- **Auto-planification** — place les features par priorité MoSCoW puis
  profondeur de dépendance, dans le premier sprint qui a de la place et pas
  avant ses bloqueurs. Ne déplace jamais une feature placée à la main, et
  explique chaque feature qu'elle n'a pas pu caser.
- **Alertes de plan** — une dépendance planifiée à l'envers dans le temps est
  signalée sur le board (`backward in time`).
- **Rôles** — Scrum Master en lecture seule ; Administrator seul habilité sur
  les utilisateurs, la configuration IA et l'audit. Le dernier administrateur
  actif ne peut pas se retirer les droits.
- **Journal d'audit** — append-only, consultable en lecture seule.

## Structure

```
SopraWebApp/
├── server/
│   ├── index.js            Express : API sous /api, SPA en statique
│   ├── db.js               Schéma SQLite + migrations idempotentes
│   ├── auth.js             scrypt, sessions en cookie, gardes de rôle
│   ├── audit.js            Journal append-only
│   ├── seed.js             Données de démonstration (= les maquettes)
│   ├── routes/             auth, trains, projects, documents, backlog,
│   │                       analysis, roadmap, exports, admin
│   └── services/
│       ├── ai.js           Claude + bascule automatique
│       ├── local-engine.js Moteur heuristique hors ligne
│       ├── nlp.js          Tokenisation, TF-IDF, clustering, sections
│       ├── parser.js       PDF / DOCX / TXT / MD
│       ├── excel.js        Import et modèle de capacité
│       ├── scheduler.js    Auto-planification et charge
│       └── exporter.js     JSON / CSV / Jira + portail d'approbation
├── public/                 La SPA (modules ES, sans build step)
│   ├── index.html
│   └── assets/
│       ├── css/app.css     Design system extrait des maquettes
│       └── js/
│           ├── core.js     Client API, routeur, toasts, templating
│           ├── shell.js    Sidebar / Topbar / Stepper
│           └── screens/    Les 18 écrans
├── test/
│   ├── e2e.mjs             Parcourt les 19 écrans dans Chrome
│   └── pipeline.mjs        Pipeline complet via l'API, 25 assertions
├── build/                  Générateur de la reproduction statique du design
├── app/                    Les 19 frames du design, en pages autonomes
├── index.html              Galerie du design (référence visuelle)
└── data/                   Base SQLite + fichiers importés (hors Git)
```

## Tests

```bash
npm start                 # dans un terminal
node test/e2e.mjs         # 19 écrans : erreurs console, exceptions, 4xx/5xx
node test/pipeline.mjs    # pipeline complet, de l'upload à l'export Jira
```

`e2e.mjs` écrit une capture par écran dans `test/screenshots/`. Les deux tests
sortent en code non nul si quelque chose échoue.

État actuel : **19/19 écrans sans erreur**, **25/25 étapes du pipeline**.

## Référence visuelle

`index.html` (à la racine) est la reproduction statique du canvas Claude Design,
générée par `build/build.mjs` depuis les sources exportées dans `build/source/`.
Elle sert de référence pour comparer l'application au design d'origine. Le
serveur la publie sous `/design`.

```bash
npm run build:design      # régénère la reproduction depuis build/source/
```

## Notes

- **Polices** : Inter et Fraunces sont chargées depuis Google Fonts, comme dans
  le design. Hors ligne, les titres perdent Fraunces sans casser la mise en page.
- **Sécurité** : mots de passe en scrypt, sessions opaques en cookie httpOnly
  SameSite=Lax, écritures cross-origin bloquées. Pour un déploiement derrière
  TLS, mettre `SPA_SECURE_COOKIES=1`.
- **Variables** : `PORT` (4173), `HOST` (127.0.0.1), `SPA_DATA_DIR`,
  `ANTHROPIC_API_KEY`, `SPA_DEMO_PASSWORD`.
- Ce build sert la SPA depuis un seul processus Node et stocke tout dans un
  fichier SQLite : c'est adapté à une équipe et à une démonstration, pas à un
  déploiement multi-instances.
