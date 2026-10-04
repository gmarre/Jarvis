// Edge Function `corriger` : corrige une reponse d'eleve cote serveur.
//
// Pourquoi. Tant que la correction se faisait dans le navigateur, la reponse de
// chaque exercice devait y etre : un eleve la lisait en 30 secondes. Ici, la
// cle (content_exercise_keys) ne quitte le serveur qu'APRES une reponse, avec
// le corrige. La migration 0006 retire aux comptes connectes le droit de lire
// cette table.
//
// Entree  : POST { exercise_id: "EX-A001-D-01", reponse: "b" }, jeton de
//           l'eleve dans Authorization (ajoute par supabase.functions.invoke).
// Sortie  : la Correction de _shared/correction.ts (verdict, reponse attendue,
//           erreur de raisonnement, corrige).
//
// Ce que la fonction ne fait pas (encore) : enregistrer la tentative et la
// progression. Le client les ecrit toujours lui-meme, donc un eleve determine
// peut encore falsifier sa progression. A deplacer ici avant tout abonnement
// payant (CLAUDE.md §13).
//
// Deploiement : voir CLAUDE.md §10 (Edge Functions). SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY sont fournies par Supabase a l'execution.

import { createClient } from 'npm:@supabase/supabase-js@2'

import { checkAnswer, versExerciceACorriger, type LigneACorriger } from '../_shared/correction.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ID_EXERCICE = /^EX-[A-O][0-9]{3}-[DEM]-[0-9]{2}$/
/** Aucune reponse legitime n'approche cette longueur. */
const LONGUEUR_MAX = 200

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

  // La plateforme verifie deja que le jeton est signe par le projet, mais la
  // cle anonyme en est un aussi : on exige un vrai compte connecte.
  const jeton = requete.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: utilisateur, error: erreurAuth } = await admin.auth.getUser(jeton)
  if (erreurAuth || !utilisateur.user) return repondre(401, { erreur: 'Connexion requise' })

  let corps: { exercise_id?: unknown; reponse?: unknown }
  try {
    corps = await requete.json()
  } catch {
    return repondre(400, { erreur: 'Corps JSON attendu' })
  }

  const { exercise_id: id, reponse } = corps
  if (typeof id !== 'string' || !ID_EXERCICE.test(id)) {
    return repondre(400, { erreur: 'exercise_id invalide' })
  }
  if (typeof reponse !== 'string' || reponse.length > LONGUEUR_MAX) {
    return repondre(400, { erreur: 'reponse invalide' })
  }

  const { data, error } = await admin
    .from('content_exercises')
    .select('type, choices, content_exercise_keys(answer, solution_steps, misconceptions)')
    .eq('id', id)
    .maybeSingle()

  if (error) return repondre(500, { erreur: `Lecture de l'exercice : ${error.message}` })
  if (!data) return repondre(404, { erreur: 'Exercice inconnu' })

  // PostgREST rend la cle comme un objet (relation un a un) ; on accepte aussi
  // un tableau, au cas ou il ne detecterait pas l'unicite.
  const brute = data as unknown as Omit<LigneACorriger, 'content_exercise_keys'> & {
    content_exercise_keys: LigneACorriger['content_exercise_keys'] | LigneACorriger['content_exercise_keys'][]
  }
  const cle = Array.isArray(brute.content_exercise_keys)
    ? brute.content_exercise_keys[0] ?? null
    : brute.content_exercise_keys
  const exercice = versExerciceACorriger({ ...brute, content_exercise_keys: cle })
  if (!exercice) return repondre(500, { erreur: `Cle absente pour ${id}` })

  return repondre(200, checkAnswer(exercice, reponse))
})
