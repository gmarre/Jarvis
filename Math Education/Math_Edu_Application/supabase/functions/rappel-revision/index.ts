// Edge Function `rappel-revision` : rappels de travail par email (sprint 2,
// point 8 ; migration 0017 ; regles dans ../_shared/rappels.ts).
//
// Actions (POST, corps JSON) :
//   { action: 'activer', heure }          eleve connecte : 15 ans et plus,
//                                          actif tout de suite vers son email ;
//                                          avant 15 ans, demande d'accord au
//                                          parent (lien /rappels/:jeton)
//   { action: 'regler', heure, pause_jusqu_au }   eleve connecte
//   { action: 'desactiver' }               eleve connecte
//   { action: 'lire', jeton }               sans compte (parent ou lien d'email)
//   { action: 'confirmer', jeton }          parent : accepte les rappels
//   { action: 'desinscrire', jeton }        lien de chaque email, ou refus du parent
//   { action: 'envoyer' }                   Cron, en-tete x-cron-secret
//
// Deployee avec verify_jwt a false : le parent n'a pas de compte et le Cron
// n'a pas de jeton d'utilisateur. La fonction exige elle-meme un vrai compte
// pour les actions de l'eleve, et le secret CRON_SECRET pour l'envoi.
//
// Secrets : RESEND_API_KEY, RESEND_FROM, APP_URL (comme accord-parental),
// CRON_SECRET (le meme que dans le coffre de la base, supabase/cron/rappels.sql).

import { createClient } from 'npm:@supabase/supabase-js@2'

import { ageAu } from '../_shared/accord.ts'
import { decider, emailAccordRappel, emailRappel, momentParis, type EmailRappel } from '../_shared/rappels.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const JETON = /^[A-Za-z0-9_-]{43}$/
const HEURE = /^([01]\d|2[0-3]):[0-5]\d$/
const DATE = /^\d{4}-\d{2}-\d{2}$/
/** Duree de validite du lien d'accord envoye au parent. */
const VALIDITE_JOURS = 7

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

function nouveauJeton(): string {
  const octets = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function empreinte(jeton: string): Promise<string> {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jeton))
  return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, '0')).join('')
}

async function envoyerEmail(destinataire: string, email: EmailRappel, desinscription?: string): Promise<string | null> {
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
      // Desinscription en un clic depuis la messagerie (RFC 8058).
      ...(desinscription
        ? { headers: { 'List-Unsubscribe': `<${desinscription}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } }
        : {}),
    }),
  })
  if (!reponse.ok) {
    console.error('Resend', reponse.status, await reponse.text())
    return "L'email n'a pas pu partir. Réessaie dans quelques minutes."
  }
  return null
}

// --- Eleve connecte -------------------------------------------------------------

interface Eleve {
  id: string
  role: string
  prenom: string
  email: string
  date_naissance: string | null
  email_parent: string | null
  consentement_parental_at: string | null
  jours_travail: number[]
}

async function eleveConnecte(requete: Request): Promise<Eleve | Response> {
  const jeton = requete.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data, error } = await admin.auth.getUser(jeton)
  if (error || !data.user) return repondre(401, { erreur: 'Connexion requise' })
  const { data: profil, error: erreurProfil } = await admin
    .from('profiles')
    .select('id, role, prenom, email, date_naissance, email_parent, consentement_parental_at, jours_travail')
    .eq('id', data.user.id)
    .maybeSingle()
  if (erreurProfil || !profil) return repondre(500, { erreur: 'Profil introuvable' })
  if (profil.role !== 'eleve') return repondre(403, { erreur: 'Réservé aux comptes élève' })
  return profil as Eleve
}

async function activer(eleve: Eleve, heure: unknown): Promise<Response> {
  if (typeof heure !== 'string' || !HEURE.test(heure) || heure < '07:30' || heure > '19:00') {
    return repondre(400, { erreur: 'Choisis une heure entre 7 h 30 et 19 h.' })
  }
  if ((eleve.jours_travail ?? []).length === 0) {
    return repondre(400, { erreur: 'Choisis d’abord tes jours de travail : le rappel ne part que ces jours-là.' })
  }
  const age = eleve.date_naissance ? ageAu(eleve.date_naissance) : null
  if (age === null) return repondre(400, { erreur: 'Indique ta date de naissance dans ton profil.' })

  if (age >= 15) {
    const { error } = await admin.from('rappels').upsert({
      eleve_id: eleve.id,
      destinataire: eleve.email,
      pour_parent: false,
      heure,
      etat: 'actif',
      motif_arret: null,
      jeton_hash: null,
      expire_le: null,
      maj_le: new Date().toISOString(),
    })
    if (error) return repondre(500, { erreur: error.message })
    return repondre(200, { etat: 'actif', destinataire: eleve.email })
  }

  // Avant 15 ans : le parent decide, par un lien. Le compte doit deja avoir
  // son accord parental (sprint 1).
  if (!eleve.email_parent || !eleve.consentement_parental_at) {
    return repondre(400, { erreur: "Ton parent doit d'abord avoir donné son accord pour ton compte." })
  }
  const { data: existant } = await admin
    .from('rappels')
    .select('etat, maj_le')
    .eq('eleve_id', eleve.id)
    .maybeSingle()
  if (existant?.etat === 'en_attente' && Date.now() - new Date(existant.maj_le).getTime() < 24 * 3600 * 1000) {
    return repondre(429, { erreur: 'Une demande est déjà partie chez ton parent aujourd’hui.' })
  }

  const jeton = nouveauJeton()
  const { error } = await admin.from('rappels').upsert({
    eleve_id: eleve.id,
    destinataire: eleve.email_parent,
    pour_parent: true,
    heure,
    etat: 'en_attente',
    motif_arret: null,
    jeton_hash: await empreinte(jeton),
    expire_le: new Date(Date.now() + VALIDITE_JOURS * 24 * 3600 * 1000).toISOString(),
    maj_le: new Date().toISOString(),
  })
  if (error) return repondre(500, { erreur: error.message })
  const echec = await envoyerEmail(
    eleve.email_parent,
    emailAccordRappel(eleve.prenom || 'Votre enfant', heure, `${APP_URL}/rappels/${jeton}`),
  )
  if (echec) {
    await admin.from('rappels').delete().eq('eleve_id', eleve.id).eq('etat', 'en_attente')
    return repondre(502, { erreur: echec })
  }
  return repondre(200, { etat: 'en_attente', destinataire: eleve.email_parent })
}

async function regler(eleve: Eleve, heure: unknown, pause: unknown): Promise<Response> {
  const maj: Record<string, unknown> = { maj_le: new Date().toISOString() }
  if (heure !== undefined) {
    if (typeof heure !== 'string' || !HEURE.test(heure) || heure < '07:30' || heure > '19:00') {
      return repondre(400, { erreur: 'Choisis une heure entre 7 h 30 et 19 h.' })
    }
    maj.heure = heure
  }
  if (pause !== undefined) {
    if (pause !== null && (typeof pause !== 'string' || !DATE.test(pause))) {
      return repondre(400, { erreur: 'Date de pause invalide' })
    }
    maj.pause_jusqu_au = pause
  }
  const { error } = await admin.from('rappels').update(maj).eq('eleve_id', eleve.id)
  if (error) return repondre(500, { erreur: error.message })
  return repondre(200, { ok: true })
}

async function desactiver(eleve: Eleve): Promise<Response> {
  const { error } = await admin
    .from('rappels')
    .update({ etat: 'arrete', motif_arret: 'eleve', jeton_hash: null, maj_le: new Date().toISOString() })
    .eq('eleve_id', eleve.id)
  if (error) return repondre(500, { erreur: error.message })
  return repondre(200, { etat: 'arrete' })
}

// --- Liens sans compte ----------------------------------------------------------

/** Le rappel vise par un jeton : lien d'accord, ou lien de desinscription d'un email. */
async function trouver(jeton: string): Promise<{ eleve_id: string; accord: boolean } | null> {
  const hash = await empreinte(jeton)
  const { data: rappel } = await admin.from('rappels').select('eleve_id').eq('jeton_hash', hash).maybeSingle()
  if (rappel) return { eleve_id: rappel.eleve_id, accord: true }
  const { data: envoi } = await admin
    .from('rappels_envois')
    .select('eleve_id')
    .eq('desinscription_hash', hash)
    .maybeSingle()
  return envoi ? { eleve_id: envoi.eleve_id, accord: false } : null
}

async function lire(cible: { eleve_id: string; accord: boolean }): Promise<Response> {
  const [{ data: rappel }, { data: profil }] = await Promise.all([
    admin.from('rappels').select('etat, heure, expire_le').eq('eleve_id', cible.eleve_id).maybeSingle(),
    admin.from('profiles').select('prenom').eq('id', cible.eleve_id).maybeSingle(),
  ])
  if (!rappel) return repondre(404, { erreur: 'Lien invalide' })
  const expire = rappel.etat === 'en_attente' && rappel.expire_le && new Date(rappel.expire_le).getTime() < Date.now()
  return repondre(200, {
    prenom: profil?.prenom || 'Votre enfant',
    etat: expire ? 'expire' : rappel.etat,
    heure: String(rappel.heure).slice(0, 5),
    accord: cible.accord,
  })
}

async function confirmer(cible: { eleve_id: string; accord: boolean }): Promise<Response> {
  if (!cible.accord) return repondre(400, { erreur: 'Ce lien sert à se désinscrire.' })
  const { data: rappel } = await admin.from('rappels').select('etat, expire_le').eq('eleve_id', cible.eleve_id).maybeSingle()
  if (!rappel || rappel.etat !== 'en_attente') return repondre(200, { etat: rappel?.etat ?? 'arrete' })
  if (rappel.expire_le && new Date(rappel.expire_le).getTime() < Date.now()) return repondre(200, { etat: 'expire' })
  // Le jeton d'accord est garde : il sert aussi de lien d'arret au parent.
  const { error } = await admin
    .from('rappels')
    .update({ etat: 'actif', expire_le: null, maj_le: new Date().toISOString() })
    .eq('eleve_id', cible.eleve_id)
  if (error) return repondre(500, { erreur: error.message })
  return repondre(200, { etat: 'actif' })
}

async function desinscrire(cible: { eleve_id: string; accord: boolean }): Promise<Response> {
  const { data: rappel } = await admin.from('rappels').select('etat').eq('eleve_id', cible.eleve_id).maybeSingle()
  const motif = rappel?.etat === 'en_attente' ? 'refus' : 'desinscription'
  const { error } = await admin
    .from('rappels')
    .update({ etat: 'arrete', motif_arret: motif, maj_le: new Date().toISOString() })
    .eq('eleve_id', cible.eleve_id)
  if (error) return repondre(500, { erreur: error.message })
  return repondre(200, { etat: 'arrete' })
}

// --- Envoi (Cron) -------------------------------------------------------------------

async function envoyerRappels(): Promise<Response> {
  const maintenant = new Date()
  const { data: actifs, error } = await admin
    .from('rappels')
    .select('eleve_id, destinataire, pour_parent, heure, pause_jusqu_au, profiles!inner(prenom, rythme_jours, jours_travail)')
    .eq('etat', 'actif')
  if (error) return repondre(500, { erreur: error.message })

  const bilan = { envoyes: 0, arretes: 0, ignores: 0, echecs: 0 }
  const depuis = new Date(maintenant.getTime() - 14 * 24 * 3600 * 1000).toISOString()
  for (const r of actifs ?? []) {
    const profil = (Array.isArray(r.profiles) ? r.profiles[0] : r.profiles) as {
      prenom: string
      rythme_jours: number
      jours_travail: number[]
    }
    const [{ data: envois }, { data: seances }] = await Promise.all([
      admin.from('rappels_envois').select('envoye_le, jour').eq('eleve_id', r.eleve_id).gte('envoye_le', depuis)
        .order('envoye_le', { ascending: false }),
      admin.from('exercise_attempts').select('created_at').eq('user_id', r.eleve_id).gte('created_at', depuis),
    ])
    const decision = decider({
      maintenant,
      heure: String(r.heure),
      joursTravail: profil.jours_travail ?? [],
      pauseJusquAu: r.pause_jusqu_au,
      envois: envois ?? [],
      seances: (seances ?? []).map((s) => s.created_at),
    })
    if (!decision.envoyer) {
      if (decision.arreter) {
        await admin.from('rappels').update({ etat: 'arrete', motif_arret: 'sans_effet', maj_le: maintenant.toISOString() })
          .eq('eleve_id', r.eleve_id)
        bilan.arretes += 1
      } else {
        bilan.ignores += 1
      }
      continue
    }

    const jeton = nouveauJeton()
    const echec = await envoyerEmail(
      r.destinataire,
      emailRappel(profil.prenom || 'Votre enfant', r.pour_parent, profil.rythme_jours, `${APP_URL}/travail`, `${APP_URL}/rappels/${jeton}`),
      `${APP_URL}/rappels/${jeton}`,
    )
    if (echec) {
      bilan.echecs += 1
      continue
    }
    await admin.from('rappels_envois').insert({
      eleve_id: r.eleve_id,
      envoye_le: maintenant.toISOString(),
      jour: momentParis(maintenant).jour,
      desinscription_hash: await empreinte(jeton),
    })
    bilan.envoyes += 1
  }
  return repondre(200, bilan)
}

// --- Point d'entree -------------------------------------------------------------------

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

  if (action === 'envoyer') {
    const secret = Deno.env.get('CRON_SECRET')
    if (!secret || requete.headers.get('x-cron-secret') !== secret) return repondre(401, { erreur: 'Réservé au Cron' })
    return envoyerRappels()
  }

  if (action === 'activer' || action === 'regler' || action === 'desactiver') {
    const eleve = await eleveConnecte(requete)
    if (eleve instanceof Response) return eleve
    if (action === 'activer') return activer(eleve, corps.heure)
    if (action === 'regler') return regler(eleve, corps.heure, corps.pause_jusqu_au)
    return desactiver(eleve)
  }

  if (action === 'lire' || action === 'confirmer' || action === 'desinscrire') {
    if (typeof corps.jeton !== 'string' || !JETON.test(corps.jeton)) return repondre(404, { erreur: 'Lien invalide' })
    const cible = await trouver(corps.jeton)
    if (!cible) return repondre(404, { erreur: 'Lien invalide' })
    if (action === 'lire') return lire(cible)
    if (action === 'confirmer') return confirmer(cible)
    return desinscrire(cible)
  }

  return repondre(400, { erreur: 'Action inconnue' })
})
