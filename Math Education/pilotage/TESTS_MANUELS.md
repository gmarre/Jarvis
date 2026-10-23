# Tests manuels à faire avec Gauthier

> Gardés pour une seule séance commune (demande du 20 octobre 2026). Toute livraison qui demande un test manuel ajoute une ligne ici. Rayer un test une fois passé, avec la date.

**Prérequis :** Cron posé pour le test 10 ; pour le test 13, un professeur vérifié (Jean-Marc l'est, pas `+prof1`). Migrations 0023 et 0024 et étape 8 : en ligne depuis le 23 octobre 2026.

1. Consentement parental de bout en bout : création d'un compte de moins de 15 ans, email Resend reçu sur l'adresse de Gauthier, accord puis refus, modification de date de naissance soumise à accord.
2. Correction en ligne (`corriger`) sur un vrai compte : « 7,7° » pour une température en °C, « n = 13 », « 1,496 fois 10^8 », « 225 cm^2 », « 6/(-10) » acceptés ; « -3/-7 » refusé pour 3/7 ; espaces de milliers dans le corrigé.
3. Maîtrise sur 5 (migration 0013) : 5 ronds visibles, contrôle proposé dans « À réviser », contrôle raté qui rouvre la compétence.
4. Passage manuel complet sur téléphone (iPhone compris) : bouton « ± », saisie d'une fraction en texte, cartes mentales de l'étape 6.
5. Recette de Marius : exemples inhabituels des cartes de puissances (√16 900 = 130, 10¹⁴), convention « 0 est positif et négatif ».
6. Un défi (`/defi/<compétence>`), retourner, « je savais » ou non, la carte revient le lendemain dans « À réviser » ; un super exercice (`/super/<id>`) rendu, score et corrigés, passage enregistré ; en relire quelques-uns avec figure sur téléphone (G011, G021, C034).
7. Correction algébrique en ligne : « 5 + 3x » accepté pour 3x + 5 quand la forme est réduite, « (x+3)(x-3) » pour une factorisation, « x >= -4 », « ±7 ».
8. Écrans d'engagement : série qui pardonne, bilan « niveau 2 → 4 », fin de journée.
9. Règle du super exercice : une compétence aux exercices réussis reste à 3, le super exercice réussi la passe à 4 (bilan de /super), le bouton du panneau de /parcours change de libellé ; un super exercice sans faute après les contrôles donne 5.
10. Rythme et rappels (après le Cron) : choisir 3 jours dans /profil, voir « N séances sur 3 » dans /travail ; compte de moins de 15 ans : « Demander à mon parent », email reçu, /rappels/:jeton accepte puis « Ne plus recevoir » ; compte de 15 ans et plus : activation directe, rappel reçu un jour choisi sans séance.
11. Étape 7 sur un vrai compte : saisir « 5 + 3x », « (x+3)(x-3) », « P = 6x », « S = {-4 ; 2} » dans les exercices F, au téléphone compris.
12. Progression côté serveur : un exercice réussi fait monter le niveau, rechargement de la page compris ; un super exercice rendu affiche son score et passe la porteuse à 4 ; le test de positionnement d'un nouveau compte se clôt sans bandeau d'erreur ; une carte mentale revue avance son échéance ; `npm run check:db` vert.
13. Créneaux (après 0024 et la vérification des professeurs) : un professeur ouvre un créneau, l'écran ne dit « publié » qu'après la réponse du serveur, le créneau apparaît dans `/cours` d'un élève.
14. Étape 8 sur un vrai compte, téléphone compris : figures de vecteurs et de transformations lisibles à 360 px, saisie de « 36π » ou « 36pi », d'une valeur approchée au dixième, de « km/h ».
