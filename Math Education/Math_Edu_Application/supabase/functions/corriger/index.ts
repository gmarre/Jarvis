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

import {
  checkAnswer,
  versExerciceACorriger,
  type ExerciceACorriger,
  type LigneACorriger,
} from '../_shared/correction.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ID_EXERCICE = /^EX-[A-P][0-9]{3}-[DEM]-[0-9]{2}$/
/** Question d'un super exercice (migration 0016) : « SX-C012-01#q2 ». */
const ID_QUESTION_SUPER = /^(SX-[A-P][0-9]{3}-[0-9]{2})#(q[1-6])$/
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

interface QuestionPublique {
  key: string
  type: LigneACorriger['type']
  choices?: { key: string; text: string }[]
}

interface CleDeQuestion {
  key: string
  answer: NonNullable<LigneACorriger['content_exercise_keys']>['answer']
  solution_steps: string[]
  misconceptions: Record<string, string | null>
}

/**
 * Recompose une question de super exercice comme un exercice : partie lisible
 * (type, propositions) et cle (reponse, corrige, misconceptions), lues dans
 * deux tables comme pour les exercices.
 */
async function questionDeSuper(
  superId: string,
  cle: string,
): Promise<ExerciceACorriger | { statut: number; erreur: string }> {
  const [publique, cles] = await Promise.all([
    admin.from('content_super').select('questions').eq('id', superId).maybeSingle(),
    admin.from('content_super_keys').select('questions').eq('super_id', superId).maybeSingle(),
  ])
  if (publique.error || cles.error) {
    return { statut: 500, erreur: `Lecture du super exercice : ${(publique.error ?? cles.error)?.message}` }
  }
  const q = ((publique.data?.questions ?? []) as QuestionPublique[]).find((x) => x.key === cle)
  const k = ((cles.data?.questions ?? []) as CleDeQuestion[]).find((x) => x.key === cle)
  if (!q || !k) return { statut: 404, erreur: 'Question inconnue' }
  const exercice = versExerciceACorriger({
    type: q.type,
    choices: q.choices ?? null,
    content_exercise_keys: { answer: k.answer, solution_steps: k.solution_steps, misconceptions: k.misconceptions },
  })
  return exercice ?? { statut: 500, erreur: `Cle absente pour ${superId}#${cle}` }
}

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
  const question = typeof id === 'string' ? ID_QUESTION_SUPER.exec(id) : null
  if (typeof id !== 'string' || (!ID_EXERCICE.test(id) && !question)) {
    return repondre(400, { erreur: 'exercise_id invalide' })
  }
  if (typeof reponse !== 'string' || reponse.length > LONGUEUR_MAX) {
    return repondre(400, { erreur: 'reponse invalide' })
  }

  if (question) {
    const exercice = await questionDeSuper(question[1], question[2])
    if ('erreur' in exercice) return repondre(exercice.statut, { erreur: exercice.erreur })
    return repondre(200, checkAnswer(exercice, reponse))
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
