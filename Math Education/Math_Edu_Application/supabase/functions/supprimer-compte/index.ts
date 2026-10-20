// Edge Function `supprimer-compte` : suppression definitive d'un compte (RGPD,
// sprint 4, point 4).
//
// Actions (POST, corps JSON, compte connecte) :
//   { action: 'moi', confirmation: 'SUPPRIMER' }          son propre compte
//   { action: 'enfant', eleve_id, confirmation: 'SUPPRIMER' }
//                                                         le compte d'un enfant
//                                                         rattache (migration 0019)
//
// La suppression passe par l'API d'administration de l'Auth : supprimer
// l'utilisateur supprime son profil, et toutes les tables qui en dependent
// suivent (on delete cascade, migrations 0001 a 0019). Rien n'est garde.
// L'export, lui, se fait dans le navigateur, la RLS laissant deja lire ces
// donnees a l'interesse et a son parent.

import { createClient } from 'npm:@supabase/supabase-js@2'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

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

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (requete.method !== 'POST') return repondre(405, { erreur: 'POST attendu' })

  const jeton = requete.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: auth, error: erreurAuth } = await admin.auth.getUser(jeton)
  if (erreurAuth || !auth.user) return repondre(401, { erreur: 'Connexion requise' })

  let corps: Record<string, unknown>
  try {
    corps = await requete.json()
  } catch {
    return repondre(400, { erreur: 'Corps JSON attendu' })
  }
  // Une suppression ne part pas d'un clic accidentel : le mot est tape.
  if (corps.confirmation !== 'SUPPRIMER') {
    return repondre(400, { erreur: 'Tape SUPPRIMER pour confirmer.' })
  }

  let cible: string
  if (corps.action === 'moi') {
    cible = auth.user.id
  } else if (corps.action === 'enfant') {
    if (typeof corps.eleve_id !== 'string' || !UUID.test(corps.eleve_id)) {
      return repondre(400, { erreur: 'Enfant inconnu' })
    }
    const { data: lien } = await admin
      .from('parent_links')
      .select('id')
      .eq('parent_id', auth.user.id)
      .eq('eleve_id', corps.eleve_id)
      .not('confirme_le', 'is', null)
      .maybeSingle()
    if (!lien) return repondre(403, { erreur: "Ce compte n'est pas rattaché au vôtre." })
    cible = corps.eleve_id
  } else {
    return repondre(400, { erreur: 'Action inconnue' })
  }

  const { error } = await admin.auth.admin.deleteUser(cible)
  if (error) return repondre(500, { erreur: `Suppression : ${error.message}` })
  return repondre(200, { supprime: true })
})
