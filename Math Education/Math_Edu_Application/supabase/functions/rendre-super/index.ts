// Edge Function `rendre-super` : corrige toute la copie d'un super exercice et
// enregistre le passage (sprint 6, progression cote serveur, migration 0021).
//
// Pourquoi. Le navigateur comptait lui-meme ses points et ecrivait son passage
// et sa progression : un eleve pouvait se donner le super exercice, donc le
// niveau 4. Ici, chaque question est corrigee avec sa cle, les points sont
// comptes avec le bareme de _shared/maitrise.ts (70 % des points), le passage
// est ecrit dans super_attempts, puis la regle de maitrise s'applique a la
// competence porteuse.
//
// Entree  : POST { super_id: "SX-C012-01", reponses: { q1: "12", q2: "b" },
//           duree_s?: 840 }, jeton de l'eleve dans Authorization. Une question
//           sans reponse est comptee fausse, et sa correction rapporte le
//           corrige a afficher.
// Sortie  : { corrections: { q1: Correction, ... }, passage: ligne de
//           super_attempts, progression: { ligne, vientDEtreAcquise } | null }
//           (null quand le niveau de la porteuse ne change pas).
//
// Deploiement : voir CLAUDE.md §10 (Edge Functions).

import { createClient } from 'npm:@supabase/supabase-js@2'

import { checkAnswer, versExerciceACorriger, type Correction, type LigneACorriger } from '../_shared/correction.ts'
import { apresPassageSuper, bilanSuper } from '../_shared/maitrise.ts'
import { ecrireLigne, ErreurProgression, estEleve, lireLigne } from '../_shared/progression.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ID_SUPER = /^SX-[A-P][0-9]{3}-[0-9]{2}$/
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
  skill_id: string
  points: number
  type: LigneACorriger['type']
  choices?: { key: string; text: string }[]
}

interface CleDeQuestion {
  key: string
  answer: NonNullable<LigneACorriger['content_exercise_keys']>['answer']
  solution_steps: string[]
  misconceptions: Record<string, string | null>
}

Deno.serve(async (requete) => {
  if (requete.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (requete.method !== 'POST') return repondre(405, { erreur: 'POST attendu' })

  const jeton = requete.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') ?? ''
  const { data: utilisateur, error: erreurAuth } = await admin.auth.getUser(jeton)
  if (erreurAuth || !utilisateur.user) return repondre(401, { erreur: 'Connexion requise' })
  const userId = utilisateur.user.id

  let corps: { super_id?: unknown; reponses?: unknown; duree_s?: unknown }
  try {
    corps = await requete.json()
  } catch {
    return repondre(400, { erreur: 'Corps JSON attendu' })
  }

  const superId = corps.super_id
  if (typeof superId !== 'string' || !ID_SUPER.test(superId)) {
    return repondre(400, { erreur: 'super_id invalide' })
  }
  const brutes = corps.reponses
  if (typeof brutes !== 'object' || brutes === null || Array.isArray(brutes)) {
    return repondre(400, { erreur: 'reponses invalides' })
  }
  const reponses = brutes as Record<string, unknown>
  for (const valeur of Object.values(reponses)) {
    if (typeof valeur !== 'string' || valeur.length > LONGUEUR_MAX) {
      return repondre(400, { erreur: 'reponses invalides' })
    }
  }
  const duree =
    typeof corps.duree_s === 'number' && Number.isFinite(corps.duree_s)
      ? Math.min(Math.max(Math.round(corps.duree_s), 0), 86_400)
      : 0

  try {
    if (!(await estEleve(admin, userId))) {
      return repondre(403, { erreur: 'Seul un compte élève rend un super exercice' })
    }

    const [publique, cles] = await Promise.all([
      admin.from('content_super').select('skill_id, questions').eq('id', superId).maybeSingle(),
      admin.from('content_super_keys').select('questions').eq('super_id', superId).maybeSingle(),
    ])
    if (publique.error || cles.error) {
      throw new ErreurProgression(`Lecture du super exercice : ${(publique.error ?? cles.error)?.message}`)
    }
    if (!publique.data || !cles.data) return repondre(404, { erreur: 'Super exercice inconnu' })

    const questions = publique.data.questions as QuestionPublique[]
    const parCle = new Map((cles.data.questions as CleDeQuestion[]).map((k) => [k.key, k]))

    const corrections: Record<string, Correction> = {}
    for (const q of questions) {
      const k = parCle.get(q.key)
      const exercice = k
        ? versExerciceACorriger({
            type: q.type,
            choices: q.choices ?? null,
            content_exercise_keys: { answer: k.answer, solution_steps: k.solution_steps, misconceptions: k.misconceptions },
          })
        : null
      if (!exercice) throw new ErreurProgression(`Cle absente pour ${superId}#${q.key}`)
      const reponse = typeof reponses[q.key] === 'string' ? (reponses[q.key] as string) : ''
      corrections[q.key] = checkAnswer(exercice, reponse)
    }

    const bilan = bilanSuper(questions, (key) => corrections[key]?.isCorrect === true)
    const porteuse = publique.data.skill_id as string

    const { data: passage, error: erreurPassage } = await admin
      .from('super_attempts')
      .insert({
        user_id: userId,
        super_id: superId,
        skill_id: porteuse,
        score: bilan.score,
        total: bilan.total,
        reussi: bilan.reussi,
        reponses: Object.fromEntries(
          questions.map((q) => [
            q.key,
            { reponse: typeof reponses[q.key] === 'string' ? reponses[q.key] : '', juste: corrections[q.key].isCorrect },
          ]),
        ),
        duree_s: duree,
      })
      .select('id, super_id, skill_id, score, total, reussi, reponses, duree_s, created_at')
      .single()
    if (erreurPassage) throw new ErreurProgression(`Ecriture du passage : ${erreurPassage.message}`)

    // La regle de maitrise s'applique a la porteuse ; un passage qui ne change
    // pas son niveau n'ecrit rien.
    const base = await lireLigne(admin, userId, porteuse)
    const r = apresPassageSuper(
      base,
      { reussie: bilan.reussi, sansFaute: bilan.reussi && bilan.score === bilan.total },
      new Date(),
    )
    let progression: { ligne: typeof r.ligne; vientDEtreAcquise: boolean } | null = null
    if (r.ligne.niveau !== base.niveau) {
      await ecrireLigne(admin, userId, r.ligne)
      progression = { ligne: r.ligne, vientDEtreAcquise: r.vientDEtreAcquise }
    }

    return repondre(200, { corrections, passage, progression })
  } catch (cause) {
    return repondre(500, { erreur: cause instanceof Error ? cause.message : String(cause) })
  }
})
