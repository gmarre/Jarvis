// Edge Function `corriger` : corrige une reponse d'eleve cote serveur.
//
// Pourquoi. Tant que la correction se faisait dans le navigateur, la reponse de
// chaque exercice devait y etre : un eleve la lisait en 30 secondes. Ici, la
// cle (content_exercise_keys) ne quitte le serveur qu'APRES une reponse, avec
// le corrige. La migration 0006 retire aux comptes connectes le droit de lire
// cette table.
//
// Entree  : POST { exercise_id: "EX-A001-D-01", reponse: "b", mode?, duree_s? },
//           jeton de l'eleve dans Authorization (ajoute par
//           supabase.functions.invoke).
// Sortie  : la Correction de _shared/correction.ts (verdict, reponse attendue,
//           erreur de raisonnement, corrige), plus ce qui a ete enregistre.
//
// Les modes (sprint 6, progression cote serveur, migration 0021) :
//   - sans mode : correction seule, rien n'est ecrit (revue d'une question
//     passee) ;
//   - "exercice" : la tentative est enregistree et la progression de la
//     competence avance ici, avec la regle de _shared/maitrise.ts. La reponse
//     porte `progression` (ligne ecrite, acquisition, controle, epreuve) et
//     `tentative` ;
//   - "positionnement" : le verdict est garde dans placement_reponses ; la
//     fonction SQL enregistrer_positionnement n'acceptera comme acquises que
//     les competences reussies ici et leurs prerequis.
// Le navigateur ne peut plus ecrire ni ses tentatives ni sa progression.
//
// Deux reponses envoyees en meme temps sur la meme competence pourraient se
// chevaucher (lecture puis ecriture) : l'ecran d'exercice attend la
// correction avant d'en permettre une autre.
//
// Deploiement : voir CLAUDE.md §10 (Edge Functions). SUPABASE_URL et
// SUPABASE_SERVICE_ROLE_KEY sont fournies par Supabase a l'execution.

import { createClient } from 'npm:@supabase/supabase-js@2'

import { apresTentative } from '../_shared/maitrise.ts'
import {
  ecrireLigne,
  epreuveDeLEleve,
  ErreurProgression,
  estEleve,
  fenetreDe,
  lireLigne,
} from '../_shared/progression.ts'
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

  let corps: { exercise_id?: unknown; reponse?: unknown; mode?: unknown; duree_s?: unknown }
  try {
    corps = await requete.json()
  } catch {
    return repondre(400, { erreur: 'Corps JSON attendu' })
  }

  const { exercise_id: id, reponse } = corps
  const mode = corps.mode ?? null
  if (mode !== null && mode !== 'exercice' && mode !== 'positionnement') {
    return repondre(400, { erreur: 'mode invalide' })
  }
  const duree =
    typeof corps.duree_s === 'number' && Number.isFinite(corps.duree_s)
      ? Math.min(Math.max(Math.round(corps.duree_s), 0), 86_400)
      : 0
  const question = typeof id === 'string' ? ID_QUESTION_SUPER.exec(id) : null
  if (typeof id !== 'string' || (!ID_EXERCICE.test(id) && !question)) {
    return repondre(400, { erreur: 'exercise_id invalide' })
  }
  if (typeof reponse !== 'string' || reponse.length > LONGUEUR_MAX) {
    return repondre(400, { erreur: 'reponse invalide' })
  }

  if (question) {
    // Une question de super exercice se rend avec toute la copie
    // (`rendre-super`) : ici, correction seule.
    if (mode !== null) return repondre(400, { erreur: 'Un super exercice se rend par rendre-super' })
    const exercice = await questionDeSuper(question[1], question[2])
    if ('erreur' in exercice) return repondre(exercice.statut, { erreur: exercice.erreur })
    return repondre(200, checkAnswer(exercice, reponse))
  }

  const { data, error } = await admin
    .from('content_exercises')
    .select('skill_id, type, choices, content_exercise_keys(answer, solution_steps, misconceptions)')
    .eq('id', id)
    .maybeSingle()

  if (error) return repondre(500, { erreur: `Lecture de l'exercice : ${error.message}` })
  if (!data) return repondre(404, { erreur: 'Exercice inconnu' })

  // PostgREST rend la cle comme un objet (relation un a un) ; on accepte aussi
  // un tableau, au cas ou il ne detecterait pas l'unicite.
  const brute = data as unknown as Omit<LigneACorriger, 'content_exercise_keys'> & {
    skill_id: string
    content_exercise_keys: LigneACorriger['content_exercise_keys'] | LigneACorriger['content_exercise_keys'][]
  }
  const cle = Array.isArray(brute.content_exercise_keys)
    ? brute.content_exercise_keys[0] ?? null
    : brute.content_exercise_keys
  const exercice = versExerciceACorriger({ ...brute, content_exercise_keys: cle })
  if (!exercice) return repondre(500, { erreur: `Cle absente pour ${id}` })

  const correction = checkAnswer(exercice, reponse)
  if (mode === null) return repondre(200, correction)

  const userId = utilisateur.user.id
  const skillId = brute.skill_id
  try {
    if (!(await estEleve(admin, userId))) {
      return repondre(403, { erreur: 'Seul un compte élève enregistre ses réponses' })
    }

    if (mode === 'positionnement') {
      const { error: erreurPos } = await admin.from('placement_reponses').insert({
        user_id: userId,
        exercise_id: id,
        skill_id: skillId,
        juste: correction.isCorrect,
      })
      if (erreurPos) throw new ErreurProgression(`Ecriture du positionnement : ${erreurPos.message}`)
      return repondre(200, correction)
    }

    const maintenant = new Date()
    const [base, fenetre, epreuve] = await Promise.all([
      lireLigne(admin, userId, skillId),
      fenetreDe(admin, skillId),
      epreuveDeLEleve(admin, userId, skillId),
    ])
    const r = apresTentative(base, fenetre, id, correction.isCorrect, maintenant, epreuve)

    const { data: tentative, error: erreurTentative } = await admin
      .from('exercise_attempts')
      .insert({
        user_id: userId,
        exercise_id: id,
        skill_id: skillId,
        answer: reponse,
        is_correct: correction.isCorrect,
        duration_s: duree,
        created_at: maintenant.toISOString(),
      })
      .select('id, exercise_id, skill_id, answer, is_correct, duration_s, created_at')
      .single()
    if (erreurTentative) throw new ErreurProgression(`Ecriture de la tentative : ${erreurTentative.message}`)
    await ecrireLigne(admin, userId, r.ligne)

    return repondre(200, {
      ...correction,
      progression: {
        ligne: r.ligne,
        vientDEtreAcquise: r.vientDEtreAcquise,
        controle: r.controle,
        attendEpreuve: r.attendEpreuve,
      },
      tentative,
    })
  } catch (cause) {
    return repondre(500, { erreur: cause instanceof Error ? cause.message : String(cause) })
  }
})
