// Edge Function `rapport-hebdo` : resume hebdomadaire au parent (sprint 4,
// point 2 ; migration 0019 ; texte et calculs dans ../_shared/rapport.ts).
//
// Actions (POST, corps JSON) :
//   { action: 'envoyer' }               Cron du dimanche, en-tete x-cron-secret
//   { action: 'lire', jeton }            lien de desinscription, sans compte
//   { action: 'desinscrire', jeton }     un clic, effet immediat
//
// Deployee avec verify_jwt a false (le Cron et le lien n'ont pas de jeton
// d'utilisateur). Secrets : RESEND_API_KEY, RESEND_FROM, APP_URL, CRON_SECRET
// (le meme que pour rappel-revision).

import { createClient } from 'npm:@supabase/supabase-js@2'

import { emailRapport, lundiDe, resumer, type EmailRapport } from '../_shared/rapport.ts'

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

function nouveauJeton(): string {
  const octets = crypto.getRandomValues(new Uint8Array(32))
  return btoa(String.fromCharCode(...octets)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function empreinte(jeton: string): Promise<string> {
  const octets = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(jeton))
  return Array.from(new Uint8Array(octets), (o) => o.toString(16).padStart(2, '0')).join('')
}

async function envoyerEmail(destinataire: string, email: EmailRapport, desinscription: string): Promise<boolean> {
  const cle = Deno.env.get('RESEND_API_KEY')
  if (!cle) return false
  const reponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${cle}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: Deno.env.get('RESEND_FROM') ?? 'Racine <onboarding@resend.dev>',
      to: [destinataire],
      subject: email.sujet,
      text: email.texte,
      html: email.html,
      headers: { 'List-Unsubscribe': `<${desinscription}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
    }),
  })
  if (!reponse.ok) console.error('Resend', reponse.status, await reponse.text())
  return reponse.ok
}

async function envoyer(): Promise<Response> {
  const maintenant = new Date()
  const semaine = lundiDe(maintenant)
  const depuis = new Date(maintenant.getTime() - 7 * 24 * 3600 * 1000).toISOString()

  const { data: liens, error } = await admin
    .from('parent_links')
    .select('id, eleve_id, parent_id')
    .eq('rapport_hebdo', true)
    .not('parent_id', 'is', null)
    .not('confirme_le', 'is', null)
  if (error) return repondre(500, { erreur: error.message })

  const bilan = { envoyes: 0, deja: 0, echecs: 0 }
  for (const lien of liens ?? []) {
    const { data: deja } = await admin
      .from('rapports_envois')
      .select('id')
      .eq('lien_id', lien.id)
      .eq('semaine', semaine)
      .maybeSingle()
    if (deja) {
      bilan.deja += 1
      continue
    }
    const [parent, enfant, tentatives, progres, cartes, supers] = await Promise.all([
      admin.from('profiles').select('email').eq('id', lien.parent_id).maybeSingle(),
      admin.from('profiles').select('prenom').eq('id', lien.eleve_id).maybeSingle(),
      admin.from('exercise_attempts').select('created_at, is_correct').eq('user_id', lien.eleve_id).gte('created_at', depuis),
      admin.from('skill_progress').select('skill_id').eq('user_id', lien.eleve_id).gte('niveau', 4).gte('updated_at', depuis),
      admin.from('flashcard_progress').select('card_id').eq('user_id', lien.eleve_id).gte('updated_at', depuis),
      admin.from('super_attempts').select('id').eq('user_id', lien.eleve_id).eq('reussi', true).gte('created_at', depuis),
    ])
    if (!parent.data?.email) {
      bilan.echecs += 1
      continue
    }
    const resume = resumer({
      tentatives: tentatives.data ?? [],
      acquises: progres.data?.length ?? 0,
      cartesRevues: cartes.data?.length ?? 0,
      superReussis: supers.data?.length ?? 0,
    })
    const jeton = nouveauJeton()
    const lienDesinscription = `${APP_URL}/rapport/${jeton}`
    const ok = await envoyerEmail(
      parent.data.email,
      emailRapport(enfant.data?.prenom || 'Votre enfant', resume, `${APP_URL}/parent`, lienDesinscription),
      lienDesinscription,
    )
    if (!ok) {
      bilan.echecs += 1
      continue
    }
    await admin.from('rapports_envois').insert({
      lien_id: lien.id,
      semaine,
      desinscription_hash: await empreinte(jeton),
    })
    bilan.envoyes += 1
  }
  return repondre(200, bilan)
}

async function lienDuJeton(jeton: string): Promise<string | null> {
  const { data } = await admin
    .from('rapports_envois')
    .select('lien_id')
    .eq('desinscription_hash', await empreinte(jeton))
    .maybeSingle()
  return data?.lien_id ?? null
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (requete.method !== 'POST') return repondre(405, { erreur: 'POST attendu' })

  let corps: Record<string, unknown>
  try {
    corps = await requete.json()
  } catch {
    return repondre(400, { erreur: 'Corps JSON attendu' })
  }

  if (corps.action === 'envoyer') {
    const secret = Deno.env.get('CRON_SECRET')
    if (!secret || requete.headers.get('x-cron-secret') !== secret) return repondre(401, { erreur: 'Réservé au Cron' })
    return envoyer()
  }

  if (corps.action === 'lire' || corps.action === 'desinscrire') {
    if (typeof corps.jeton !== 'string' || !JETON.test(corps.jeton)) return repondre(404, { erreur: 'Lien invalide' })
    const lienId = await lienDuJeton(corps.jeton)
    if (!lienId) return repondre(404, { erreur: 'Lien invalide' })
    if (corps.action === 'desinscrire') {
      const { error } = await admin.from('parent_links').update({ rapport_hebdo: false }).eq('id', lienId)
      if (error) return repondre(500, { erreur: error.message })
    }
    const { data } = await admin
      .from('parent_links')
      .select('rapport_hebdo, profiles!parent_links_eleve_id_fkey(prenom)')
      .eq('id', lienId)
      .maybeSingle()
    const profil = (Array.isArray(data?.profiles) ? data?.profiles[0] : data?.profiles) as { prenom?: string } | undefined
    return repondre(200, { actif: data?.rapport_hebdo ?? false, prenom: profil?.prenom || 'votre enfant' })
  }

  return repondre(400, { erreur: 'Action inconnue' })
})
