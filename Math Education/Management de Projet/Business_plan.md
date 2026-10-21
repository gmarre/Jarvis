# MATH EDUCATION : proposition de business plan

Proposition du 21 octobre 2026, à valider par Gauthier avant de figer les chiffres (CLAUDE.md, « Business », point 1). Les prix relevés sont datés du jour ; les sources sont en fin de document.

## 1. En bref

- **Les frais techniques sont minuscules** : environ 24 € par mois au lancement, 50 € au-delà de 300 abonnés. Trois abonnés les couvrent. Le vrai coût du projet, c'est le temps (4 h par semaine et par personne), que ce plan ne rémunère pas.
- **La publicité payante ne paie pas au départ** : un abonné acquis par Meta ou TikTok coûte de 40 à 600 € selon le taux de conversion, pour une valeur d'environ 130 € sur sa durée de vie. Il faut d'abord mesurer cette conversion avec un petit test (150 €), et miser sur le bouche-à-oreille, les professeurs et le contenu gratuit.
- **Trois offres proposées** : Découverte (gratuite), Élève (9,99 €/mois ou 79 €/an), Suivi (19,99 €/mois, avec un professeur qui suit l'élève) ; les cours se paient à part, 20 € par élève et par séance.
- **Sur 24 mois**, sans publicité : 80 abonnés et 700 € de résultat mensuel (prudent), 280 abonnés et 2 600 € (central), 650 abonnés et 6 400 € (ambitieux), avant cotisations sociales (21,2 à 25,6 % du chiffre d'affaires).

## 2. Les coûts réels, relevés le 21 octobre 2026

| Poste | Offre retenue | Prix | Quand |
|---|---|---|---|
| Base de données, authentification (Supabase) | Pro | 25 $/mois, environ 23 € | dès les premiers paiements (pas de mise en pause, sauvegardes 7 jours) |
| Hébergement de l'application (Netlify) | Free, puis Personal | 0 €, puis 9 $/mois (environ 8 €) | Personal au-delà d'environ 300 abonnés (300 crédits par mois en gratuit) |
| Nom de domaine .fr (OVHcloud) | création, puis renouvellement | 5,99 € TTC la première année, 9,35 € TTC ensuite | au sprint final |
| Emails (Resend) | Free, puis Pro | 0 € (3 000 par mois, **100 par jour**), puis 20 $/mois (environ 18 €) | Pro dès 80 familles environ : le résumé du dimanche part à tous les parents le même jour |
| Suivi des erreurs (Sentry), statistiques d'usage (PostHog) | gratuits | 0 € | |
| Paiement (Stripe) | cartes européennes standard | 1,5 % + 0,25 € par paiement | soit 0,40 € sur 9,99 € (4 %), 1,44 € sur 79 € (1,8 %) |
| Cotisations sociales (micro-entreprise) | prestations de services | 21,2 % du chiffre d'affaires (BIC) ou 25,6 % (BNC) | à trancher avec un comptable |
| Publicité (Meta, TikTok) | test | 150 € une fois | voir le §5 |

Deux conséquences :
- **L'abonnement annuel coûte moins en frais** (1,8 % contre 4 %) et réduit le départ des abonnés pendant l'été : il faut le pousser.
- **Les cours doivent passer par Stripe Connect** : le professeur est payé directement et facture lui-même ; le chiffre d'affaires de la plateforme ne compte alors que sa commission, et les cotisations ne portent que sur elle.

## 3. Les offres proposées

| Offre | Prix | Contenu |
|---|---|---|
| **Découverte** | gratuite | test de positionnement, graphe et parcours visibles, 10 exercices par jour, cartes mentales en lecture |
| **Élève** | 9,99 €/mois sans engagement, ou 79 €/an (6,58 €/mois) | tout le contenu sans limite, super exercices, cartes défi, rappels, espace parent complet ; frère ou sœur à moitié prix |
| **Suivi** | 19,99 €/mois | l'offre Élève, plus un professeur vérifié qui suit l'élève (messagerie à trois avec le parent, créneaux réservés, sprint 5) ; le professeur reçoit 10 € par élève suivi et par mois |
| **Cours** | 20 € par élève, 1 h 30, 3 élèves au plus | indépendants de l'abonnement, facturés à la séance |

**Comparables** (prix publics relevés, souvent promotionnels) :

| Acteur | Prix | Ce qu'il vend |
|---|---|---|
| Kartable Premium | 13,99 €/mois ou 109,99 €/an | cours et exercices, tout le collège et le lycée |
| SchoolMouv | 29,99 à 39,99 €/mois affichés, souvent à moitié prix (9,99 à 14,99 € pour les sociétaires Matmut) | vidéos, cours, exercices |
| Maxicours | de 6,95 à 11,95 €/mois selon la formule | cours, exercices, aide en ligne |
| Superprof | « Pass élève » de 29 à 39 €/mois pour contacter les professeurs, cours payés en plus | mise en relation |
| Cours particulier | 15 à 20 €/h (étudiant), 25 à 35 €/h (professeur certifié) | cours à domicile, crédit d'impôt de 50 % possible |
| Mathia | gratuite avec achats intégrés | mathématiques du CP au CE2 |

À 9,99 €, l'offre Élève se place sous Kartable et au niveau des promotions de SchoolMouv et Maxicours, avec un argument qu'aucun d'eux n'a : le diagnostic des lacunes racines sur le graphe. Le cours à 20 € par élève revient à 13 €/h, deux fois moins cher qu'un cours particulier, parce qu'il est collectif. **Attention** : le crédit d'impôt de 50 % ne vaut que pour les cours donnés au domicile de l'élève ; nos cours en visio n'y ont pas droit, ce qui réduit l'écart réel avec un cours particulier à domicile (25 à 35 €/h, soit 12,50 à 17,50 €/h après crédit d'impôt).

## 4. La répartition d'un cours

| Par élève et par séance de 1 h 30 | Montant |
|---|---|
| Payé par la famille | 20,00 € |
| Professeur (80 %) | 16,00 € |
| Plateforme (20 %) | 4,00 € |
| Frais Stripe | 0,55 € |
| Reste à la plateforme | 3,45 € |

Avec 3 élèves, le professeur touche 48 € pour 1 h 30, soit 32 €/h. Une agence de soutien scolaire paie de 17 à 29 € brut de l'heure pour du collège : l'offre est attractive pour recruter. Avec un seul élève inscrit, le professeur touche 16 € ; il faut donc décider si un cours à un seul élève est maintenu (point à valider n° 4).

## 5. L'acquisition

**Le calcul du coût d'acquisition par la publicité** : coût par clic, divisé par le taux d'inscription après le clic, divisé par le taux de passage au payant.

| Coût par clic | Inscriptions après le clic | Passage au payant | Coût d'un abonné |
|---|---|---|---|
| 0,40 € (bas de fourchette Facebook) | 20 % | 5 % | 40 € |
| 0,80 € | 20 % | 5 % | 80 € |
| 0,80 € | 10 % | 3 % | 267 € |
| 1,80 € (haut de fourchette Facebook) | 10 % | 3 % | 600 € |

**La valeur d'un abonné** : environ 9,20 € nets par mois après frais Stripe, divisés par un départ mensuel de 7 %, soit environ 130 € sur sa durée de vie. La publicité ne devient rentable que dans le meilleur cas du tableau. Le taux de passage au payant d'une application éducative en freemium est de 2,6 % en moyenne (le plus bas de tous les secteurs étudiés par First Page Sage) ; une offre tournée vers les parents, avec un diagnostic gratuit, peut faire mieux, mais il faut le mesurer.

**D'où l'ordre proposé :**
1. **Bouche-à-oreille et réseau** : les familles de l'entourage, les premiers élèves de la bêta, un parrainage (un mois offert au parrain et au filleul).
2. **Les professeurs** : chaque professeur vérifié amène ses propres élèves, puisqu'il y gagne (cours et offre Suivi).
3. **Le contenu gratuit** : le test de positionnement en accès libre, des vidéos courtes sur TikTok et Instagram (une erreur classique et sa correction), le référencement des pages publiques (sprint final).
4. **Un test publicitaire de 150 €** (Meta et TikTok, ciblé sur les parents de collégiens), seulement quand la conversion des comptes gratuits est mesurée. Le CPM de TikTok en France est annoncé de 3 à 8 €, contre 8 à 20 € pour Meta.

**Répartition du budget de 500 €** : domaine 6 € ; Supabase Pro pendant les deux premiers mois, avant que les abonnements le couvrent, 46 € ; test publicitaire 150 € ; impression de flyers pour les professeurs et les associations de parents d'élèves, 60 € ; réserve 238 € (Resend Pro, imprévus).

## 6. Les hypothèses des trois scénarios

Lancement supposé en janvier, sans publicité payante. L'été (juillet, août), les inscriptions sont divisées par 2,5 et les départs doublent.

| Hypothèse | Prudent | Central | Ambitieux |
|---|---|---|---|
| Nouveaux abonnés payants au mois m | 2 + 0,5 m | 5 + 1,5 m | 10 + 3 m |
| Départs par mois | 10 % | 7 % | 5 % |
| Abonnés qui prennent des cours dans le mois | 8 %, 1,5 cours | 12 %, 2 cours | 18 %, 2 cours |
| Part de l'annuel / de l'offre Suivi | 30 % / 10 % | 30 % / 10 % | 30 % / 10 % |

## 7. Les résultats sur 24 mois

Résultat de la plateforme après frais Stripe, part des professeurs et frais fixes, **avant cotisations sociales et sans rémunérer le temps des fondateurs**.

| Mois | Prudent : abonnés | Résultat du mois | Central : abonnés | Résultat du mois | Ambitieux : abonnés | Résultat du mois |
|---|---|---|---|---|---|---|
| 3 | 8 | 51 € | 23 | 192 € | 46 | 434 € |
| 6 | 18 | 143 € | 53 | 486 € | 111 | 1 065 € |
| 12 | 36 | 301 € | 114 | 1 045 € | 248 | 2 432 € |
| 18 | 65 | 573 € | 218 | 2 039 € | 484 | 4 778 € |
| 24 | 79 | 697 € | 279 | 2 630 € | 650 | 6 433 € |
| **Cumul sur 24 mois** | | **7 700 €** | | **28 200 €** | | **67 400 €** |

**Point mort** : les frais techniques sont couverts dès 3 abonnés, donc dès le premier ou le deuxième mois dans les trois scénarios. Le point mort qui compte vraiment est celui du temps passé ; par exemple, verser 1 000 € par mois à chacun des deux fondateurs demande 2 000 € de résultat mensuel après cotisations (21,2 % du chiffre d'affaires), soit environ 280 abonnés : atteint vers le mois 24 dans le scénario central, vers le mois 13 dans l'ambitieux, jamais en 24 mois dans le prudent.

## 8. Ce que le modèle ne dit pas

- **Le statut juridique** : micro-entreprise (simple, franchise de TVA jusqu'au seuil des prestations de services) ou société ; à voir avec un comptable avant le premier encaissement.
- **Les professeurs** : ils facturent eux-mêmes (auto-entrepreneurs), la plateforme ne les salarie pas.
- **La saisonnalité** est grossière : les inscriptions se concentrent sur la rentrée et avant le brevet.
- **La version « classe » pour les établissements** (GAR, RGPD) est un autre produit, hors de ce plan.

## 9. Les hypothèses à valider par Gauthier

1. Les trois offres et leurs prix (Découverte gratuite, Élève 9,99 €/mois ou 79 €/an, Suivi 19,99 €/mois).
2. La limite de l'offre gratuite : 10 exercices par jour, sans super exercices ni rappels.
3. La part du professeur : 80 % d'un cours, 10 € par élève suivi et par mois.
4. Un cours maintenu avec un seul élève inscrit, ou annulé et remboursé.
5. Pas de publicité payante avant de mesurer la conversion ; test de 150 € ensuite.
6. Le parrainage : un mois offert au parrain et au filleul.
7. La répartition du budget de 500 € (§5).
8. Le statut juridique, à voir avec un comptable.

## Sources (consultées le 21 octobre 2026)

- Supabase Pro à 25 $/mois : [MakerKit](https://makerkit.dev/blog/md/saas/supabase-pricing), [Jetadmin](https://www.jetadmin.io/blog/supabase-pricing-2026-guide-to-plans-limits-and-real-world-costs/), [nocode.mba](https://www.nocode.mba/topics/backend-app-development).
- Netlify (Free, Personal 9 $, Pro 20 $) : [netli.fyi](https://netli.fyi/blog/netlify-pricing-and-limits), [Hackceleration](https://www.hackceleration.com/labs/netlify-pricing).
- Resend (3 000 emails par mois, 100 par jour en gratuit ; Pro 20 $) : [Resend, tarifs](https://resend.com/pricing.md), [Resend, nouvelle offre gratuite](https://resend.com/blog/new-free-tier.md).
- Stripe (1,5 % + 0,25 € pour les cartes européennes) : [Indy](https://www.indy.fr/guide/comptabilite-en-ligne/commerce/stripe-comptabilite/frais-stripe/), [Wise](https://wise.com/en-fr/blog/stripe-mollie-online-payments-france), [Hayot Expertise](https://hayot-expertise.fr/blog/frais-stripe-paypal-mollie-klarna-comparatif-optimisation-ecommerce-2026).
- Domaine .fr chez OVHcloud : [La Fabrique du Net](https://www.lafabriquedunet.fr/logiciels/tendances/quel-est-le-prix-dun-nom-de-domaine).
- Cotisations de la micro-entreprise en 2026 : [economie.gouv.fr](https://www.economie.gouv.fr/entreprises/micro-entreprise-auto-entreprise-charges-sociales), [Le Coin des Entrepreneurs](https://www.lecoindesentrepreneurs.fr/taux-cotisations-sociales-2026-micro-entrepreneur/).
- Kartable : [App Store](https://apps.apple.com/FR/app/id825500330). SchoolMouv : [Matmut](https://www.matmut.fr/assurance/scolaire/conseils/soutien-scolaire), [CGV SchoolMouv](https://www.schoolmouv.fr/cgv). Maxicours : [iGraal](https://fr.igraal.com/codes-promo/Maxicours/code-operation), [eBuyClub](https://www.ebuyclub.com/reduction-mymaxicours-7141). Superprof : [CGU](https://www.superprof.fr/cgu.html), [forum Que Choisir](https://forum.quechoisir.org/post1128934.html). Mathia : [App Store](https://apps.apple.com/md/app/mathia/id1491340255).
- Prix des cours particuliers : [Pass Education](https://www.pass-education.fr/actualites/tarif-des-cours-particuliers-2026-comment-maitriser-son-budget-de-soutien-scolaire/) ; rémunération des intervenants : [France Travail](https://candidat.francetravail.fr/offres/recherche/detail/4893180) ; crédit d'impôt réservé aux cours à domicile : [Les Sherpas](https://sherpas.com/blog/parents/a/credit-impot/).
- Publicité Facebook et Instagram en France : [La Fabrique du Net](https://www.lafabriquedunet.fr/blog/facebook-linkedin-instagram-twitter-cout-annonce/) ; TikTok : [AdinTime](https://adintime.com/en/blog?id=311), [Influee](https://influee.co/fr/blog/tiktok-ads-benchmarks).
- Passage au payant en freemium : [Crazy Egg](https://www.crazyegg.com/blog/free-to-paid-conversion-rate/?orgid=145), [Userpilot](https://userpilot.com/blog/freemium-to-premium) ; renouvellements des applications éducatives : [RevenueCat](https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category.md).
- Le calcul des scénarios est reproductible : `python bp_scenarios.py` dans ce dossier (hypothèses en tête de fichier).
