// Edge Function `accord-parental` : emails au parent et confirmation par lien.
//
// Deux usages, un seul circuit (migration 0011) :
//   - consentement avant 15 ans, a l'inscription ;
//   - accord du parent quand un mineur change son email ou sa date de
//     naissance.
//
// Actions (POST, corps JSON) :
//   { action: 'demander_consentement' }                       eleve connecte
//   { action: 'demander_modification', champ, valeur }         eleve connecte
//   { action: 'lire', jeton }                                  parent, sans compte
//   { action: 'confirmer', jeton } / { action: 'refuser', jeton }
//
// Le parent n'a pas de compte : la fonction est deployee avec verify_jwt a
// false, et c'est elle qui exige un vrai compte pour les deux premieres
// actions. Le jeton (32 octets aleatoires) n'est jamais stocke : seule son
// empreinte SHA-256 l'est, donc lire la table ne permet pas de confirmer.
//
// Secrets (Supabase > Edge Functions > Secrets) :
//   RESEND_API_KEY  cle Resend. Absente : la fonction le dit, rien ne part.
//   RESEND_FROM     expediteur, par defaut « Racine <onboarding@resend.dev> »
//                   (sans domaine verifie, Resend n'ecrit qu'a l'adresse du
//                   titulaire du compte : suffisant pour les tests).
//   APP_URL         adresse de l'application, base des liens. Par defaut
//                   http://localhost:5173. Jamais tiree de l'en-tete Origin,
//                   qu'un script peut choisir : le lien partirait ailleurs.

import { createClient } from 'npm:@supabase/supabase-js@2'

import {
  VALIDITE_JOURS,
  ageAu,
  emailConsentement,
  emailModification,
  refusFrequence,
  verifierValeur,
  type ChampModifiable,
  type Email,
} from '../_shared/accord.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const JETON = /^[A-Za-z0-9_-]{43}$/

function repondre(statut: number, corps: unknown): Response {
  return new Response(JSON.stringify(corps), {
    status: statut,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

const admin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { persistSession: false, autoRefreshToken: false } },
)

const APP_URL = (Deno.env.get('APP_URL') ?? 'http://localhost:5173').replace(/\/+$/, '')

// --- Jetons -----------------------------------------------------------------

function nouveauJeton(): string {
  const octets = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...octets))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function empreinte(jeton: string): Promise<string> {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jeton))
  return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, '0')).join('')
}

function expiration(): string {
  return new Date(Date.now() + VALIDITE_JOURS * 24 * 3600 * 1000).toISOString()
}

// --- Envoi ------------------------------------------------------------------

async function envoyer(destinataire: string, email: Email): Promise<string | null> {
  const cle = Deno.env.get('RESEND_API_KEY')
  if (!cle) return "L'envoi d'emails n'est pas encore configuré sur le serveur."

  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM') ?? 'Racine <onboarding@resend.dev>',
      to: [destinataire],
      subject: email.sujet,
      text: email.texte,
      html: email.html,
    }),
  })
  if (!reponse.ok) {
    // Le detail part dans les journaux de la fonction, pas a l'eleve.
    console.error('Resend', reponse.status, await reponse.text())
    return "L'email n'a pas pu partir. Réessaie dans quelques minutes."
  }
  return null
}

// --- Profil de l'eleve connecte ----------------------------------------------

interface Eleve {
  id: string
  role: string
  prenom: string
  email: string
  date_naissance: string | null
  email_parent: string | null
  consentement_parental_at: string | null
}

async function eleveConnecte(requete: Request): Promise<Eleve | Response> {
  const jeton = requete.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data, error } = await admin.auth.getUser(jeton)
  if (error || !data.user) return repondre(401, { erreur: 'Connexion requise' })

  const { data: profil, error: erreurProfil } = await admin
    .from('profiles')
    .select('id, role, prenom, email, date_naissance, email_parent, consentement_parental_at')
    .eq('id', data.user.id)
    .maybeSingle()
  if (erreurProfil || !profil) return repondre(500, { erreur: 'Profil introuvable' })
  if (profil.role !== 'eleve') return repondre(403, { erreur: 'Réservé aux comptes élève' })
  return profil as Eleve
}

/** Dates des envois des dernieres 24 h pour cet eleve, toutes demandes confondues. */
async function envoisRecents(eleveId: string): Promise<Date[]> {
  const depuis = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const [liens, modifs] = await Promise.all([
    admin.from('parent_links').select('cree_le').eq('eleve_id', eleveId).gte('cree_le', depuis),
    admin.from('modifications_profil').select('cree_le').eq('eleve_id', eleveId).gte('cree_le', depuis),
  ])
  return [...(liens.data ?? []), ...(modifs.data ?? [])].map((l) => new Date(l.cree_le))
}

// --- Actions de l'eleve --------------------------------------------------------

async function demanderConsentement(eleve: Eleve): Promise<Response> {
  if (eleve.consentement_parental_at) return repondre(409, { erreur: 'Ton parent a déjà donné son accord.' })
  if (!eleve.email_parent) return repondre(400, { erreur: "Indique d'abord l'email d'un parent." })
  const age = eleve.date_naissance ? ageAu(eleve.date_naissance) : null
  if (age === null || age >= 15) {
    return repondre(400, { erreur: "L'accord d'un parent n'est demandé qu'avant 15 ans." })
  }

  const refus = refusFrequence(await envoisRecents(eleve.id))
  if (refus) return repondre(429, { erreur: refus })

  // Un seul lien valable a la fois : les precedents expirent.
  await admin
    .from('parent_links')
    .update({ expire_le: new Date().toISOString() })
    .eq('eleve_id', eleve.id)
    .is('confirme_le', null)
    .gt('expire_le', new Date().toISOString())

  const jeton = nouveauJeton()
  const { data: lien, error } = await admin
    .from('parent_links')
    .insert({
      eleve_id: eleve.id,
      email_parent: eleve.email_parent,
      token_hash: await empreinte(jeton),
      expire_le: expiration(),
    })
    .select('id')
    .single()
  if (error) return repondre(500, { erreur: `Création du lien : ${error.message}` })

  const echec = await envoyer(
    eleve.email_parent,
    emailConsentement(eleve.prenom || 'Votre enfant', `${APP_URL}/accord/${jeton}`),
  )
  if (echec) {
    // Un lien jamais envoye ne doit pas compter dans la limite de frequence.
    await admin.from('parent_links').delete().eq('id', lien.id)
    return repondre(502, { erreur: echec })
  }
  return repondre(200, { envoye_a: eleve.email_parent })
}

async function demanderModification(eleve: Eleve, champ: unknown, valeur: unknown): Promise<Response> {
  if (champ !== 'email' && champ !== 'date_naissance') return repondre(400, { erreur: 'Champ invalide' })
  if (typeof valeur !== 'string') return repondre(400, { erreur: 'Valeur invalide' })
  const propre = champ === 'email' ? valeur.trim().toLowerCase() : valeur.trim()
  const invalide = verifierValeur(champ, propre)
  if (invalide) return repondre(400, { erreur: invalide })

  const age = eleve.date_naissance ? ageAu(eleve.date_naissance) : null
  if (age === null || age >= 18) {
    return repondre(400, { erreur: "Pas besoin de l'accord d'un parent : modifie-le directement." })
  }
  if (!eleve.email_parent) return repondre(400, { erreur: "Indique d'abord l'email d'un parent." })
  if (champ === 'email' && propre === eleve.email.toLowerCase()) {
    return repondre(400, { erreur: "C'est déjà ton adresse." })
  }

  const refus = refusFrequence(await envoisRecents(eleve.id))
  if (refus) return repondre(429, { erreur: refus })

  // Une seule demande en cours par champ : la nouvelle remplace l'ancienne.
  await admin
    .from('modifications_profil')
    .update({ annule_le: new Date().toISOString() })
    .eq('eleve_id', eleve.id)
    .eq('champ', champ)
    .is('confirme_le', null)
    .is('annule_le', null)

  const jeton = nouveauJeton()
  const { data: demande, error } = await admin
    .from('modifications_profil')
    .insert({
      eleve_id: eleve.id,
      champ,
      nouvelle_valeur: propre,
      email_parent: eleve.email_parent,
      token_hash: await empreinte(jeton),
      expire_le: expiration(),
    })
    .select('id')
    .single()
  if (error) return repondre(500, { erreur: `Création de la demande : ${error.message}` })

  const echec = await envoyer(
    eleve.email_parent,
    emailModification(eleve.prenom || 'Votre enfant', champ as ChampModifiable, propre, `${APP_URL}/accord/${jeton}`),
  )
  if (echec) {
    await admin.from('modifications_profil').delete().eq('id', demande.id)
    return repondre(502, { erreur: echec })
  }
  return repondre(200, { envoye_a: eleve.email_parent })
}

// --- Actions du parent ----------------------------------------------------------

type Etat = 'en_attente' | 'confirme' | 'expire' | 'annule'

interface Demande {
  type: 'consentement' | 'modification'
  id: string
  eleve_id: string
  champ: ChampModifiable | null
  nouvelle_valeur: string | null
  etat: Etat
}

function etatDe(ligne: { confirme_le: string | null; expire_le: string; annule_le?: string | null }): Etat {
  if (ligne.confirme_le) return 'confirme'
  if (ligne.annule_le) return 'annule'
  if (new Date(ligne.expire_le).getTime() <= Date.now()) return 'expire'
  return 'en_attente'
}

async function trouver(jeton: string): Promise<Demande | null> {
  const hash = await empreinte(jeton)
  const { data: lien } = await admin
    .from('parent_links')
    .select('id, eleve_id, expire_le, confirme_le')
    .eq('token_hash', hash)
    .maybeSingle()
  if (lien) {
    return { type: 'consentement', id: lien.id, eleve_id: lien.eleve_id, champ: null, nouvelle_valeur: null, etat: etatDe(lien) }
  }
  const { data: modif } = await admin
    .from('modifications_profil')
    .select('id, eleve_id, champ, nouvelle_valeur, expire_le, confirme_le, annule_le')
    .eq('token_hash', hash)
    .maybeSingle()
  if (modif) {
    return {
      type: 'modification',
      id: modif.id,
      eleve_id: modif.eleve_id,
      champ: modif.champ,
      nouvelle_valeur: modif.nouvelle_valeur,
      etat: etatDe(modif),
    }
  }
  return null
}

async function lire(demande: Demande): Promise<Response> {
  const { data: profil } = await admin.from('profiles').select('prenom').eq('id', demande.eleve_id).maybeSingle()
  return repondre(200, {
    type: demande.type,
    prenom: profil?.prenom || 'Votre enfant',
    champ: demande.champ,
    nouvelle_valeur: demande.nouvelle_valeur,
    etat: demande.etat,
  })
}

async function confirmer(demande: Demande): Promise<Response> {
  // Deja tranchee ou expiree : on rend l'etat, la page l'affiche.
  if (demande.etat !== 'en_attente') return repondre(200, { etat: demande.etat })
  const maintenant = new Date().toISOString()

  if (demande.type === 'consentement') {
    const { error } = await admin.from('parent_links').update({ confirme_le: maintenant }).eq('id', demande.id)
    if (error) return repondre(500, { erreur: error.message })
    const { error: erreurProfil } = await admin
      .from('profiles')
      .update({ consentement_parental_at: maintenant })
      .eq('id', demande.eleve_id)
    if (erreurProfil) return repondre(500, { erreur: erreurProfil.message })
    return repondre(200, { etat: 'confirme' })
  }

  // Modification : appliquee ici, avec les droits du serveur.
  if (demande.champ === 'email') {
    // L'API d'administration ecrit l'adresse directement (le parent l'a lue et
    // validee dans son email) ; le trigger de 0011 recopie dans profiles.
    const { error } = await admin.auth.admin.updateUserById(demande.eleve_id, {
      email: demande.nouvelle_valeur ?? '',
      email_confirm: true,
    })
    if (error) {
      const dejaPrise = /already|registered|exists/i.test(error.message)
      return repondre(dejaPrise ? 409 : 500, {
        erreur: dejaPrise ? 'Cette adresse est déjà utilisée par un autre compte.' : error.message,
      })
    }
  } else {
    const { error } = await admin
      .from('profiles')
      .update({ date_naissance: demande.nouvelle_valeur })
      .eq('id', demande.eleve_id)
    if (error) return repondre(500, { erreur: error.message })
  }

  await admin.from('modifications_profil').update({ confirme_le: maintenant }).eq('id', demande.id)
  return repondre(200, { etat: 'confirme' })
}

async function refuser(demande: Demande): Promise<Response> {
  // Deja tranchee ou expiree : on rend l'etat, la page l'affiche.
  if (demande.etat !== 'en_attente') return repondre(200, { etat: demande.etat })
  const maintenant = new Date().toISOString()
  if (demande.type === 'consentement') {
    // Le lien est clos ; le compte reste en attente d'accord.
    await admin.from('parent_links').update({ expire_le: maintenant }).eq('id', demande.id)
  } else {
    await admin.from('modifications_profil').update({ annule_le: maintenant }).eq('id', demande.id)
  }
  return repondre(200, { etat: 'annule' })
}

// --- Point d'entree --------------------------------------------------------------

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (requete.method !== 'POST') return repondre(405, { erreur: 'POST attendu' })

  let corps: Record<string, unknown>
  try {
    corps = await requete.json()
  } catch {
    return repondre(400, { erreur: 'Corps JSON attendu' })
  }

  const action = corps.action
  if (action === 'demander_consentement' || action === 'demander_modification') {
    const eleve = await eleveConnecte(requete)
    if (eleve instanceof Response) return eleve
    return action === 'demander_consentement'
      ? demanderConsentement(eleve)
      : demanderModification(eleve, corps.champ, corps.valeur)
  }

  if (action === 'lire' || action === 'confirmer' || action === 'refuser') {
    if (typeof corps.jeton !== 'string' || !JETON.test(corps.jeton)) {
      return repondre(404, { erreur: 'Lien invalide' })
    }
    const demande = await trouver(corps.jeton)
    if (!demande) return repondre(404, { erreur: 'Lien invalide' })
    if (action === 'lire') return lire(demande)
    if (action === 'confirmer') return confirmer(demande)
    return refuser(demande)
  }

  return repondre(400, { erreur: 'Action inconnue' })
})
