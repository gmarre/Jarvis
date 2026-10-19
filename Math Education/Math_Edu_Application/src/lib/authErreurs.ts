// Traduction des erreurs de Supabase Auth en messages pour l'eleve.
//
// Pourquoi un fichier a part : Supabase renvoie des messages anglais et
// techniques (« Email not confirmed », « email rate limit exceeded »), et les
// meler dans un message unique trompait l'eleve. Le cas le plus genant : un
// compte qui n'a pas encore clique sur le lien de confirmation recevait
// « Adresse ou mot de passe incorrect », et l'eleve recreait un compte.
//
// On se fie au `code` d'AuthError, stable, plutot qu'au texte.

/** Regles minimales d'un mot de passe, affichees telles quelles a l'inscription. */
export const LONGUEUR_MIN_MOT_DE_PASSE = 8

/** Rend un message d'erreur pour le mot de passe, ou null s'il convient. */
export function verifierMotDePasse(motDePasse: string, confirmation: string): {
  motDePasse?: string
  confirmation?: string
} {
  const erreurs: { motDePasse?: string; confirmation?: string } = {}
  if (motDePasse.length < LONGUEUR_MIN_MOT_DE_PASSE) {
    erreurs.motDePasse = `Au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères.`
  }
  if (!confirmation) erreurs.confirmation = 'Saisis le mot de passe une seconde fois.'
  else if (confirmation !== motDePasse) erreurs.confirmation = 'Les deux saisies sont différentes.'
  return erreurs
}

/** Erreur d'authentification telle que Supabase la decrit. */
export interface ErreurAuth {
  code?: string
  message?: string
}

export type ContexteAuth = 'connexion' | 'inscription' | 'modification'

/**
 * Message lisible pour une erreur Supabase Auth.
 *
 * En connexion, un email inconnu et un mot de passe faux donnent volontairement
 * le meme message : les distinguer publierait la liste des comptes.
 */
export function messageAuth(erreur: ErreurAuth, contexte: ContexteAuth): string {
  switch (erreur.code) {
    case 'email_not_confirmed':
      return "Ton adresse n'est pas encore confirmée. Clique sur le lien reçu par email, puis reconnecte-toi."
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit':
      return "Trop de demandes en peu de temps. Attends quelques minutes avant de réessayer."
    case 'weak_password':
      return `Ce mot de passe est trop faible : au moins ${LONGUEUR_MIN_MOT_DE_PASSE} caractères, et évite les mots de passe courants.`
    case 'same_password':
      return "Le nouveau mot de passe doit être différent de l'ancien."
    case 'email_address_invalid':
      return 'Cette adresse email n’est pas acceptée.'
    case 'email_exists':
    case 'user_already_exists':
      return contexte === 'modification'
        ? 'Cette adresse est déjà utilisée par un autre compte.'
        : 'Un compte existe déjà avec cette adresse. Connecte-toi.'
    case 'signup_disabled':
      return 'Les inscriptions sont fermées pour le moment.'
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
      return 'Ton ancien mot de passe est incorrect.'
    case 'invalid_credentials':
      return contexte === 'modification'
        ? 'Ton ancien mot de passe est incorrect.'
        : 'Adresse ou mot de passe incorrect.'
  }
  if (contexte === 'connexion') return 'Adresse ou mot de passe incorrect.'
  return `L'opération a échoué${erreur.message ? ` : ${erreur.message}` : '.'}`
}
