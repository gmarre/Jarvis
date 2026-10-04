// Prepare chaque fichier de test : le contenu pedagogique local est installe
// avant tout, comme le ferait le repository au demarrage de l'application.
// Les tests du moteur lisent `skills` ou `getExercisesForSkill` sans passer par
// une session.

import { installerContenu } from '@/content'
import { chargerContenuLocal, versContenuPublic } from '@/content/chargement'

// Version publique, comme en production : un test qui aurait besoin d'une
// reponse doit la demander a la banque locale complete (chargerContenuLocal).
installerContenu(versContenuPublic(await chargerContenuLocal()))
