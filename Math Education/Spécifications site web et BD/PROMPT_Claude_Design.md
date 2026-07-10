# Prompt Claude Design — MVP MATH EDUCATION

> À copier tel quel dans Claude Design, **après** avoir joint le template Dribbble.
> Direction artistique retenue : **Studio Clair**. Français. Voir `Brief_Design_MVP.md` pour le détail des écrans et le mapping base de données.

---

```
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
```
