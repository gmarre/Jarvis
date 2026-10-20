# Engagement des 8 à 15 ans : étude courte (sprint 2, point 8)

Octobre 2026. But : faire revenir l'élève régulièrement, sans mécanique manipulatrice, et en tirer 5 changements d'interface.

## 1. Ce que dit la recherche

1. **Autonomie, compétence, lien.** Quand ces trois besoins sont nourris, la motivation propre prédit de meilleurs résultats scolaires, à tous les niveaux étudiés [1][2]. Offrir un choix augmente motivation, effort et compétence perçue, plus nettement chez l'enfant que chez l'adulte, surtout avec 2 à 4 choix et sans récompense derrière [3].
2. **Les récompenses attendues sapent l'intérêt ; le retour sur la compétence le nourrit.** Sur 128 expériences, les récompenses liées à la participation ou à la réussite réduisent la motivation libre (d = -0,28 à -0,40), et les récompenses tangibles nuisent plus aux enfants qu'aux étudiants. Un retour positif et informatif l'augmente (d = +0,33) [4].
3. **La gamification a un effet motivationnel faible et instable** (g = 0,36, moins solide que l'effet cognitif dans les études rigoureuses) [5]. Sur un semestre, des badges obligatoires et un classement ont fait baisser la motivation intrinsèque et la satisfaction d'étudiants, et par là leurs notes [6].
4. **Une habitude naît d'un geste répété dans le même contexte, et un oubli ne la casse pas.** L'automatisme met 18 à 254 jours à s'installer (médiane 66) ; manquer une occasion ne change pas sensiblement la trajectoire [7]. Le levier : un moment fixe, une action courte [8].
5. **Une série cassée fait décrocher.** Sur 7 études, on reprend moins une activité quand la série affichée est rompue, à comportement réel égal ; l'effet s'atténue si la série peut être réparée [9]. Duolingo revendique l'aversion à la perte, vend des « gels de série » contre des gemmes et mesure ses gains en apprenants actifs par jour [10] : un objectif d'audience, pas d'apprentissage.
6. **Les rappels efficaces passent par les parents et coûtent peu.** Des alertes hebdomadaires automatiques aux parents ont réduit de 27 % les échecs en cours au collège et au lycée [11]. Des SMS réguliers aux parents ont accru leur implication et les acquis des enfants [12].
7. **Espacer et tester marche le mieux, et Racine le fait déjà.** Ce sont les deux techniques jugées les plus utiles sur 10 [13] ; les quiz en classe donnent un gain moyen (g = 0,50, 222 études) [14] ; en maths, répartir l'entraînement sur 3 jours bat le bloc unique chez des élèves de l'âge de la 5e, et à court terme de l'âge du CE2 [15]. Khan Academy affiche un niveau de maîtrise par compétence [16] ; Khan Academy Kids n'a ni publicité ni abonnement [17], mais ses preuves d'efficacité sont internes ou de petite taille [18][19].

## 2. Ce qu'on s'interdit

| Interdit | Fondement |
|---|---|
| Perte punitive : série remise à zéro avec message, compte à rebours, gel de série à acheter | CNIL, recommandation 8 [20] ; AADC, standard 5 (ni boucles de récompense ni fonctions qui prolongent l'usage) [21] ; [9] |
| Message culpabilisant (« tu as raté hier ») | Rappeler l'échec fait décrocher [9] |
| Notification ou email entre 19 h et 7 h 30, ou pendant les vacances | Commission écrans 2024, proposition 16 [22] ; écrans et sommeil liés dans 90 % des études [23] |
| Classement entre élèves, monnaie virtuelle, récompense matérielle | [4][6] |
| Rappels activés d'office | AADC, standard 7 (réglages protecteurs par défaut) [24] ; CNIL, recommandation 8 [20] |
| Désinscription difficile, case précochée | AADC, standard 13 [25] ; CNIL, designs trompeurs [26] et recommandation 6 [27] |
| Données d'usage employées hors pédagogie | CNIL, recommandation 8 [20] |

Les recommandations CNIL de 2021 ne fixent pas d'horaire : le seuil de 19 h vient du rapport de la commission écrans [22].

## 3. Les 5 changements d'interface

**1. Une série qui pardonne.** Un jour manqué ne rompt pas la série, deux d'affilée la terminent, sans message. La carte affiche aussi « 4 jours sur les 7 derniers ».
- Où : `src/lib/serie.ts` et ses tests, `StreakCard` (`AppShell.tsx`).
- Pourquoi : constats 4 et 5.
- Coût : petit.
- Risque : que le chiffre devienne une fin en soi ; ne jamais le citer dans un rappel.

**2. Mon rythme, choisi par l'élève.** Dans `/bienvenue` puis `/profil`, il choisit 2 à 5 jours par semaine et son moment (« après le goûter »). `/travail` affiche « 2 séances sur 3 cette semaine ».
- Où : `WelcomePage.tsx`, `ProfilePage.tsx`, `WorkspacePage.tsx`, `state/usePlan.ts`, migration (`rythme_jours`, `moment`).
- Pourquoi : constats 1 et 4.
- Coût : moyen.
- Risque : objectif trop haut, échecs répétés. 3 jours par défaut, baisse possible sans commentaire.

**3. Un bilan qui montre la compétence gagnée.** Le bilan affiche les 5 ronds avant et après (« niveau 2 → 4 sur 5 »), ce que la compétence débloque, et pourquoi le contrôle à J+3 aide à retenir. Le score passe au second plan.
- Où : `SessionSummary` (`ExercisePage.tsx`) ; `niveauAvant` dans `AnswerResult` (`state/session.ts`).
- Pourquoi : constats 2 et 7.
- Coût : petit.
- Risque : un niveau 3 vécu comme une rétrogradation. Libellé neutre (« rouverte, on la consolide »), pas de rouge.

**4. Une séance qui s'arrête.** Plan du jour fini : `DayDone` met « Terminer pour aujourd'hui » en bouton principal, « Prendre de l'avance » en lien. Quitter une séance en cours ne perd rien (chaque réponse est enregistrée) et l'écran le dit.
- Où : `DayDone` (`WorkspacePage.tsx`), `FocusFrame` (`ExercisePage.tsx`).
- Pourquoi : AADC, standards 5 et 13 (inciter aux pauses, s'arrêter sans perte) [21][25] ; constat 7.
- Coût : petit.
- Risque : brider l'élève motivé ; continuer reste possible, sans reproche.

**5. Un rappel par email au parent, à l'heure qu'il choisit** (partie 4).
- Où : `ProfilePage.tsx`, Edge Function `rappel-revision`, migration (heure, jours, jeton de désinscription, journal des envois).
- Pourquoi : constat 6.
- Coût : gros.
- Risque : lassitude puis spam ; d'où le plafond et l'arrêt automatique.

## 4. Les rappels

**Tout de suite :** l'interrupteur « Rappels de révision » de `/profil` n'envoie rien et vaut `true` par défaut (migration 0001). Le masquer tant qu'aucun envoi n'existe (règles 1 et 2 du CLAUDE.md) et passer son défaut à `false` [24].

**Email d'abord**
- **Consentement :** sous 15 ans, le parent, sur `/accord/:jeton`, par une case distincte non cochée ; à partir de 15 ans, l'élève dans `/profil`.
- **Destinataire :** le parent sous 15 ans, l'élève au-delà.
- **Fréquence :** seulement les jours du rythme choisi, et si rien n'est fait ce jour-là. Au plus 1 par jour et 3 par semaine. Après 2 rappels sans effet d'affilée, arrêt et relais par le rapport hebdomadaire (sprint 4).
- **Plage :** heure choisie par le parent entre 7 h 30 et 19 h (Paris), 17 h par défaut. « Pause » de 1 ou 2 semaines pour les vacances ; pause automatique par zone scolaire ensuite [22].
- **Contenu :** factuel, sans série. « Aujourd'hui, Léa a 2 révisions prévues, environ 10 minutes. » Lien vers `/travail`.
- **Désinscription :** lien en un clic, sans connexion (jeton haché, comme `parent_links`), en-tête `List-Unsubscribe`, effet immédiat.
- **Technique :** Supabase Cron toutes les 30 minutes, `rappel-revision`, Resend. En réel après la vérification du domaine (sprint final) ; avant, tests sur l'adresse de Gauthier.
- **Mesure :** séances dans les 3 heures après un rappel, taux de désinscription.

**Notifications PWA ensuite** (PWA installable, sprint final)
- Mêmes règles de plage, de plafond, de contenu et de consentement.
- Autorisation demandée seulement par un bouton « Activer les rappels sur cet appareil », jamais au premier lancement. Sur iPhone, seule l'app ajoutée à l'écran d'accueil les reçoit, après un geste de l'utilisateur [28].
- Un seul canal par jour : notification ou email.

## 5. Sources

1. Ryan et Deci (2000), *Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being*, American Psychologist. https://pubmed.ncbi.nlm.nih.gov/11392867/
2. Ryan et Deci (2020), *Intrinsic and extrinsic motivation from a self-determination theory perspective*, Contemporary Educational Psychology. https://acuresearchbank.acu.edu.au/item/8w53q/intrinsic-and-extrinsic-motivation-from-a-self-determination-theory-perspective-definitions-theory-practices-and-future-directions
3. Patall, Cooper et Robinson (2008), *The effects of choice on intrinsic motivation and related outcomes*, Psychological Bulletin. https://pubmed.ncbi.nlm.nih.gov/18298272/
4. Deci, Koestner et Ryan (1999), *A meta-analytic review of experiments examining the effects of extrinsic rewards on intrinsic motivation*, Psychological Bulletin. https://depts.washington.edu/techdocs/papers/deciExtrinsicRewardsAndIntrinsicMotivation99.pdf
5. Sailer et Homner (2020), *The gamification of learning: a meta-analysis*, Educational Psychology Review. https://opus.bibliothek.uni-augsburg.de/opus4/frontdoor/index/index/docId/109056
6. Hanus et Fox (2015), *Assessing the effects of gamification in the classroom*, Computers & Education. https://doi.org/10.1016/j.compedu.2014.08.019
7. Lally, van Jaarsveld, Potts et Wardle (2010), *How are habits formed: modelling habit formation in the real world*, European Journal of Social Psychology. https://doi.org/10.1002/ejsp.674
8. Gardner, Lally et Wardle (2012), *Making health habitual: the psychology of habit-formation and general practice*, British Journal of General Practice. https://pmc.ncbi.nlm.nih.gov/articles/PMC3505409/
9. Silverman et Barasch (2023), *On or off track: how (broken) streaks affect consumer decisions*, Journal of Consumer Research. https://udspace.udel.edu/handle/19716/34160
10. Duolingo, *How the Duolingo streak builds habit* (source de l'éditeur). https://blog.duolingo.com/how-duolingo-streak-builds-habit
11. Bergman et Chan (2021), *Leveraging parents through low-cost technology*, Journal of Human Resources. https://jhr.uwpress.org/content/56/1/125
12. York, Loeb et Doss (2019), *One step at a time: the effects of an early literacy text-messaging program for parents of preschoolers*, Journal of Human Resources. https://jhr.uwpress.org/content/54/3/537
13. Dunlosky, Rawson, Marsh, Nathan et Willingham (2013), *Improving students' learning with effective learning techniques*, Psychological Science in the Public Interest. https://doi.org/10.1177/1529100612453266 (communiqué : https://www.sciencedaily.com/releases/2013/01/130110111734.htm)
14. Yang, Luo, Vadillo, Yu et Shanks (2021), *Testing (quizzing) boosts classroom learning: a systematic and meta-analytic review*, Psychological Bulletin. https://scholars.hkbu.edu.hk/en/publications/testing-quizzing-boosts-classroom-learning-a-systematic-and-meta-/
15. Barzagar Nazari et Ebersbach (2019), *Distributing mathematical practice of third and seventh graders: applicability of the spacing effect in the classroom*, Applied Cognitive Psychology. https://kobra.bibliothek.uni-kassel.de/handle/123456789/11972?show=full
16. Khan Academy, centre d'aide, maîtrise par compétence. https://support.khanacademy.org/hc/fr/articles/360007253831-What-is-self-paced-Mastery
17. Khan Academy Kids, présentation (source de l'éditeur). https://www.khanacademy.org/kids
18. UMass Amherst, essai préliminaire sur Khan Academy Kids. https://www.umass.edu/news/article/new-educational-app-shows-promise
19. Khan Academy, étude interne sur le temps d'usage. https://blog.khanacademy.org/new-study-finds-every-minute-spent-on-khan-academy-can-lead-to-learning-gains
20. CNIL (2021), recommandation 8 : prévoir des garanties spécifiques pour protéger l'intérêt de l'enfant. https://cnil.fr/fr/recommandation-8-prevoir-des-garanties-specifiques-pour-proteger-linteret-de-lenfant ; les 8 recommandations : https://www.cnil.fr/la-cnil-publie-8-recommandations-pour-renforcer-la-protection-des-mineurs-en-ligne
21. ICO, Age Appropriate Design Code, standard 5 (usage préjudiciable des données). https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/5-detrimental-use-of-data/
22. Commission écrans (avril 2024), *Enfants et écrans : à la recherche du temps perdu*, proposition 16, p. 105. https://www.vie-publique.fr/files/rapport/pdf/293978.pdf
23. Hale et Guan (2015), *Screen time and sleep among school-aged children and adolescents: a systematic literature review*, Sleep Medicine Reviews. https://pubmed.ncbi.nlm.nih.gov/25193149/
24. ICO, AADC, standard 7 (réglages par défaut). https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/7-default-settings/
25. ICO, AADC, standard 13 (techniques d'incitation). https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/childrens-information/childrens-code-guidance-and-resources/age-appropriate-design-a-code-of-practice-for-online-services/13-nudge-techniques/
26. CNIL, LINC, guide des designs trompeurs. https://apparences-trompeuses.beta.cnil.fr/Assets/files/Guide-designs-trompeurs.pdf
27. CNIL (2021), recommandation 6 : renforcer l'information et les droits des mineurs par le design. https://www.cnil.fr/fr/recommandation-6-renforcer-linformation-et-les-droits-des-mineurs-par-le-design
28. WebKit (2023), *Web Push for Web Apps on iOS and iPadOS*. https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
