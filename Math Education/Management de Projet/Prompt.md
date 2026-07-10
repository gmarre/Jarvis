Ready for review
Select text to add comments on the plan
Plan — Design du site MATH EDUCATION via Claude Design (MVP)
Contexte
L'app Math_Edu_Application existe déjà comme scaffold propre (Vite + React 18 + TypeScript + Tailwind + react-router + client Supabase câblé), mais elle n'affiche qu'un « Hello World ». Le brief design Spécifications site web et BD/WebsiteDesign_For_Claude.pptx est vide (0 octet). Objectif de cette étape : produire une première maquette MVP cliquable dans Claude Design, à partir d'un template Dribbble que Gauthier fournira, puis ré-importer le code dans Claude Code pour le brancher plus tard sur Supabase.

Ce plan reste au niveau « chef de projet » (cf. mode MATH EDUCATION). Il livre 3 choses concrètes : la roadmap des étapes, le prompt Claude Design prêt à coller, et les ajouts (base de données, navigation, app mobile) que la demande initiale n'avait pas explicités.

Direction artistique retenue : Studio Clair (edtech premium et épuré). Elle sert aussi de filtre pour choisir le template Dribbble : prendre un template de la même famille (SaaS clair, beaucoup de blanc, un seul accent violet/indigo, typographie soignée).

Rappel roadmap (CLAUDE.md) : les maquettes sont un livrable de S1. Le calendrier prof/réservation est marqué « itération 2 » côté code, mais on le maquette dès maintenant (le design coûte peu et il faut voir la vision complète). En Claude Code, on codera d'abord auth + profil + DAG + espace de travail ; le calendrier viendra ensuite.

Périmètre des écrans du MVP design
Les 4 pages demandées, plus 3 écrans « oubliés » indispensables à un parcours cohérent :

Connexion / rôle — bouton « Continuer avec Google », choix élève / professeur (le rôle se choisit dans l'app après Google, Google ne le transporte pas).
Onboarding + test de positionnement (ajouté) — quelques questions qui descendent le DAG, pour situer l'élève. C'est le cœur du différenciateur, il faut au moins l'écran.
Espace personnel / profil — infos du compte remplies au fil de l'eau + (pour l'élève) vue DAG « où j'en suis / quoi travailler ».
Espace de travail élève — deux colonnes : exercices à faire pour progresser, et cartes mentales à réviser (révision espacée façon Duolingo, encart « à réviser aujourd'hui » + streak).
Lecteur d'exercice (ajouté) — un exercice, saisie de réponse, feedback correct/faux, corrigé (rendu maths KaTeX).
Carte mentale (ajouté) — visualisation d'une mindmap (rendu type Markmap), bouton « j'ai révisé ».
Calendrier de cours — le prof pose ses créneaux, l'élève réserve, maximum 3 par créneau. Vue calendrier partagée.
Plus un shell de navigation commun aux écrans connectés (barre latérale sur desktop, barre du bas sur mobile).

Aspects à ajouter (au-delà de la demande initiale)
Interaction base de données : chaque écran est spécifié avec les données qu'il lit/écrit, mappées sur les tables Supabase du CLAUDE.md (profiles, skill_progress, exercise_attempts, content_*, availability_slots, bookings). Ça rend le ré-import direct : les composants savent déjà quelle donnée afficher. En Claude Design on travaille avec des données factices (mock) clairement séparées.
États des écrans : pour chaque écran, prévoir vide / en chargement / rempli / erreur. C'est ce qui fait la différence entre une jolie maquette et une app réelle.
Navigation inter-pages : flux explicites. Connexion → (nouveau ? onboarding/positionnement) → profil/dashboard → espace de travail → exercice/carte ; et flux de réservation depuis le calendrier.
Responsive mobile-first : la majorité du trafic sera mobile (CLAUDE.md Jalon 3). On conçoit mobile d'abord, puis desktop.
Grand écart d'âge (6 à 17 ans) : l'UI doit marcher pour un CP comme pour un terminale. Cibles tactiles généreuses, langage simple, densité qui s'adapte. On ne fait pas deux designs, mais on garde une base sobre (Studio Clair) qui ne condescend pas les grands et reste lisible pour les petits.
RGPD mineurs : présence visible du consentement parental et du champ email parent à l'inscription (< 15 ans en France).
App mobile (note de contexte) : le web doit être accompagné d'une app mobile où l'élève révise ses cours, fait ses exos quotidiens, consulte son profil et réserve des cours. Recommandation pragmatique pour un dev solo à 4h/semaine : viser une PWA installable d'abord (même code), et n'envisager React Native / Expo qu'après le MVP. On conçoit donc dès maintenant des composants « pouce-compatibles » qui se transposent en app. Cette note sera ajoutée au CLAUDE.md.
Prompt Claude Design (prêt à coller)
À copier tel quel dans Claude Design, après avoir joint le template Dribbble. Français, direction Studio Clair intégrée.

RÔLE
Tu es designer produit senior spécialisé edtech. Tu conçois la maquette MVP d'une application web d'apprentissage des mathématiques. Objectif : un design cliquable, cohérent et sobre, dont le code (React + Tailwind + TypeScript) pourra être ré-importé proprement dans un projet Vite existant.

PRODUIT (contexte)
MATH EDUCATION aide les élèves du CP à la Terminale à combler leurs lacunes en maths. Un graphe de compétences (DAG) localise précisément où l'élève bloque, même 2 classes en arrière, puis lui fait travailler uniquement ce qu'il doit : exercices adaptés (3 niveaux) et cartes mentales, avec révision espacée façon Duolingo. Deux rôles : élève et professeur. Le prof pose des créneaux de cours (max 3 élèves), l'élève réserve.

TEMPLATE DRIBBBLE (prends du recul)
Je te fournis un template Dribbble en référence. Ne recopie PAS sa structure, ses écrans ni son contenu. Extrais uniquement son langage visuel : palette, échelle typographique, style d'espacement, forme des composants, ambiance. Puis applique ce langage à MES écrans et MES exigences décrites plus bas. Si le template contredit la direction artistique ci-dessous, la direction artistique gagne.

DIRECTION ARTISTIQUE : STUDIO CLAIR (premium, épuré)
- Palette : fond blanc cassé #FAFAF8 ; encre slate #0F172A ; accent unique indigo/violet #6366F1 (dégradé léger vers #7C3AED autorisé) ; état « maîtrisé » vert #10B981 ; « en cours » ambre #F59E0B ; « verrouillé » gris #94A3B8. Un thème sombre optionnel pour l'espace de travail (focus).
- Typo : titres en serif douce (Fraunces), interface en Inter. Échelle typographique claire et généreuse.
- Formes : coins arrondis 12-16px, ombres douces, beaucoup d'espace blanc, cartes flottantes. Rien de criard.
- Motion : transitions sobres, micro-feedback discret. Une touche de célébration (léger confetti / coche animée) UNIQUEMENT sur la réussite d'un exercice et la complétion d'une révision.
- Ambiance : calme, sérieux, rassurant (des parents paient 9,99€/mois), sans être scolaire ni infantilisant.

CONTRAINTE TECHNIQUE (pour ré-import propre)
Génère du React 18 + Tailwind CSS + TypeScript. Composants réutilisables et bien découpés. Toutes les données affichées viennent d'un fichier de DONNÉES FACTICES clairement séparé (ex. mockData.ts), jamais codées en dur dans les composants. Définis d'abord un mini système de design (tokens de couleur, échelle typo, composants Button/Card/Badge/Input/NavShell) réutilisé partout. Nomme les composants en anglais, les textes visibles en français.

TRANSVERSAL (sur tous les écrans)
- Mobile-first, puis desktop. Cibles tactiles généreuses (l'app va du CP à la Terminale, et aussi vers une future app mobile).
- Shell de navigation commun aux écrans connectés : barre latérale sur desktop, barre du bas sur mobile (Accueil/Profil, Travailler, Cours/Calendrier).
- Formules mathématiques rendues façon KaTeX (LaTeX).
- Chaque écran montre ses états : vide, en chargement (skeleton), rempli, erreur.
- Accessibilité : contraste suffisant, langage simple, pas de jargon.
- Textes en français.

ÉCRANS À CONCEVOIR (un par un)

1) CONNEXION / RÔLE
But : s'identifier et choisir son rôle. Éléments : logo, phrase de promesse (« On trouve exactement où ça bloque, et on débloque »), bouton « Continuer avec Google », puis choix « Je suis élève » / « Je suis professeur ». Pour un nouvel élève de moins de 15 ans, champ email du parent + case de consentement parental (RGPD). Données : crée/lit une ligne profiles (role, prénom, niveau_scolaire, email_parent). État nouveau vs connu.

2) ONBOARDING + TEST DE POSITIONNEMENT (élève)
But : situer l'élève sur le DAG. Éléments : progression du test, une question de maths à la fois (3-4 réponses), écran de résultat « voici ton point de départ » qui pointe un domaine/compétence. Données : écrit skill_progress (statut par compétence). Simple, encourageant, jamais culpabilisant.

3) ESPACE PERSONNEL / PROFIL
But : infos du compte + vue de progression. Éléments : carte profil (prénom, niveau scolaire, rôle, avatar), champs remplis au fil de l'eau. Pour l'élève : une VUE DAG par domaine (pas les 414 nœuds d'un coup) rendue façon react-flow, nœuds colorés selon la maîtrise (vert maîtrisé, ambre en cours, gris verrouillé), halo sur la compétence courante, et un encart « ce que tu dois travailler ». Données : profiles + skill_progress. États vide (compte neuf) et rempli.

4) ESPACE DE TRAVAIL (élève)
But : progresser au quotidien. Deux zones : à gauche « Exercices à faire » (liste de cartes d'exercices ciblés sur les lacunes, badge de niveau/difficulté), à droite « Cartes à réviser » (cartes mentales dues aujourd'hui). En tête : encart « À réviser aujourd'hui » + streak (jours consécutifs) + objectif du jour, façon Duolingo. Données : skill_progress (next_review_at), content_exercises, content_mindmaps. État vide (« rien à réviser, reviens demain »).

5) LECTEUR D'EXERCICE
But : faire un exercice. Éléments : énoncé (rendu KaTeX), zone de réponse (saisie ou QCM), bouton Valider, feedback correct/faux immédiat, corrigé détaillé dépliable, bouton « suivant ». Micro-célébration à la bonne réponse. Données : lit content_exercises, écrit exercise_attempts (is_correct, duration) et met à jour skill_progress. États : en cours / juste / faux.

6) CARTE MENTALE
But : réviser un cours en carte mentale (pas un pavé de texte). Éléments : mindmap hiérarchique rendue façon Markmap, zoom/déplacement, bouton « J'ai révisé » qui reprogramme la prochaine révision (J+1, J+3, J+7, J+21). Données : content_mindmaps, met à jour next_review_at.

7) CALENDRIER DE COURS
But : réserver / poser des cours. Vue élève : calendrier des créneaux disponibles, chaque créneau montre les places restantes (max 3), bouton « Réserver ». Vue professeur : poser un créneau (date, heure, capacité 3), voir qui est inscrit. Données : availability_slots (capacity=3), bookings. États : créneau plein, déjà réservé, aucun créneau.

LIVRABLE
- Un mini design system (page de styles : couleurs, typo, composants).
- Les 7 écrans ci-dessus, en versions mobile ET desktop pour au moins Connexion, Profil, Espace de travail, Calendrier.
- Navigation cliquable entre les écrans.
- Code React + Tailwind + TypeScript exportable, données factices séparées.

GARDE-FOUS (MVP simple)
Reste sur un MVP simple. Pas de fonctionnalités hors de cette liste, pas de sur-ingénierie. Placeholders acceptés (avatars, contenu maths d'exemple). Priorité à la clarté, la cohérence et un parcours qui se tient de bout en bout. Propose, ne demande pas de valider chaque détail : livre une première version complète, on itérera ensuite.
Workflow Claude Design → ré-import Claude Code
Gauthier choisit un template Dribbble « famille Studio Clair », le joint à Claude Design, colle le prompt ci-dessus.
Itérer écran par écran dans Claude Design jusqu'à une v1 cohérente (design system + 7 écrans).
Exporter le code (React + Tailwind).
Dans Claude Code, une session dédiée : adapter l'export à Math_Edu_Application (composants dans src/components, écrans dans src/pages, routes react-router, tokens Tailwind alignés sur tailwind.config.js, mockData.ts isolé). On garde Supabase débranché à ce stade (données factices).
Session /plan séparée ensuite pour brancher les vraies données : auth Google (config OAuth Google dans Supabase), tables + RLS, remplacement du mock par des hooks de données.
Roadmap phasée (qui fait quoi)
Phase	Quoi	Qui	Sortie
0. Cadrage (fait)	Direction Studio Clair validée, écrans figés, note app mobile	Gauthier + Claude	ce plan
1. Brief	Sauver le prompt + brief écrans, choisir le template Dribbble	Gauthier	prompt prêt, template choisi
2. Génération	Maquette dans Claude Design, itération écran par écran	Gauthier (Claude Design)	design system + 7 écrans
3. Revue design	Checklist mobile / états / accessibilité / DAG lisible	Gauthier	v1 validée
4. Ré-import	Export → intégration dans Math_Edu_Application	Gauthier (Claude Code)	app cliquable, mock data
5. Données	Auth Google + tables + RLS, remplacement du mock	Gauthier (Claude Code, session /plan)	app branchée
Marius reste en parallèle sur le contenu (DAG enrichi, exos, cartes), non bloquant pour le design.

Fichiers à créer / modifier (exécution après approbation)
Rien de tout ceci n'est écrit tant que le plan n'est pas approuvé. À l'approbation, je créerai :

Math Education/Spécifications site web et BD/PROMPT_Claude_Design.md — le prompt maître ci-dessus, prêt à coller.
Math Education/Spécifications site web et BD/Brief_Design_MVP.md — les 3 directions (référence), l'inventaire des 7 écrans avec mapping vers les tables Supabase, la checklist de revue design.
Math Education/CLAUDE.md — ajout d'une note « App mobile » (l'élève révise, fait ses exos quotidiens, consulte son profil, réserve des cours ; PWA-first recommandée) et mise à jour de l'état design (direction Studio Clair retenue, maquette en cours).
Aucun code applicatif n'est touché à cette étape : le design vit dans Claude Design, le code arrive en phase 4.

Vérification
Le livrable de cette étape est documentaire, pas du code exécutable. Contrôles :

PROMPT_Claude_Design.md se copie-colle sans retouche dans Claude Design.
Les 7 écrans du brief couvrent bien les 4 pages demandées + les 3 ajouts, chacun avec sa donnée et ses états.
La note app mobile et la direction Studio Clair sont bien inscrites dans CLAUDE.md.
Test réel plus tard (phase 4) : npm run dev dans Math_Edu_Application, navigation entre écrans ré-importés sur mobile et desktop.