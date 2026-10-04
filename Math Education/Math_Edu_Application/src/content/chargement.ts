// Chargement du contenu pedagogique, depuis la base ou depuis les JSON locaux.
//
// Git reste la source du contenu ; scripts/publier.py le publie dans les tables
// content_* (migration 0005). L'application le lit ici, une fois par appareil
// et par publication :
//
//  1. elle lit la derniere ligne de content_publications (une requete legere) ;
//  2. si le cache de l'appareil porte le meme numero de publication, il sert ;
//  3. sinon elle lit les quatre tables, par pages de 1 000 lignes (la limite
//     de PostgREST chez Supabase), en parallele, puis met le cache a jour.
//
// En mode demonstration, les JSON locaux sont importes a la demande : ils
// forment un chunk a part, telecharge seulement si la demonstration tourne.

import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Exercise,
  ExerciseAnswer,
  ExerciseChoice,
  ExercisesBank,
  Mindmap,
  MindmapsBank,
  Skill,
  SkillsDag,
} from '@/types/content'
import { contenuInstalle, installerContenu, type ContenuPedagogique } from './index'

// =============================================================================
// Installation unique
// =============================================================================

let installation: Promise<void> | null = null

/**
 * Garantit que le contenu est installe, en ne le chargeant qu'une fois meme si
 * plusieurs appels arrivent en meme temps (hydratation et changement
 * d'authentification, par exemple). Un echec n'est pas memorise : l'appel
 * suivant retente.
 */
export function assurerContenu(charger: () => Promise<ContenuPedagogique>): Promise<void> {
  if (contenuInstalle()) return Promise.resolve()
  if (!installation) {
    installation = charger()
      .then(installerContenu)
      .catch((cause: unknown) => {
        installation = null
        throw cause
      })
  }
  return installation
}

// =============================================================================
// Source locale (mode demonstration)
// =============================================================================

/**
 * Vrai si cette construction peut tourner en demonstration. Evalue a la
 * construction (Vite remplace ces variables par leur valeur) : faux, la
 * construction elimine les imports ci-dessous, et les JSON, reponses
 * comprises, ne sont meme pas deployes. Sans ce garde, n'importe quel visiteur
 * pourrait les telecharger sans compte.
 */
const DEMONSTRATION_POSSIBLE =
  import.meta.env.MODE === 'test' ||
  import.meta.env.VITE_USE_MOCK === 'true' ||
  !import.meta.env.VITE_SUPABASE_URL ||
  !import.meta.env.VITE_SUPABASE_ANON_KEY

export async function chargerContenuLocal(): Promise<ContenuPedagogique> {
  if (!DEMONSTRATION_POSSIBLE) {
    throw new Error('Contenu local absent de cette construction : il se lit dans la base.')
  }
  const [dag, banque, cartes] = await Promise.all([
    import('./skills_dag.json'),
    import('./exercises.json'),
    import('./mindmaps.json'),
  ])
  return {
    skills: (dag.default as unknown as SkillsDag).skills,
    exercises: (banque.default as unknown as ExercisesBank).exercises,
    mindmaps: (cartes.default as unknown as MindmapsBank).mindmaps,
  }
}

// =============================================================================
// Source Supabase
// =============================================================================

const PAGE = 1000

/** Change si la forme du cache change : l'ancien est alors ignore. */
const CLE_CACHE = 'racine.contenu.v1'

interface Publication {
  id: number
  nb_skills: number
  nb_exercises: number
  nb_mindmaps: number
}

interface Cache {
  publication: number
  contenu: ContenuPedagogique
}

interface LigneExercice {
  id: string
  skill_id: string
  level: Exercise['level']
  type: Exercise['type']
  statement: string
  image: string | null
  choices: { key: string; text: string }[] | null
  hint: string | null
  estimated_duration_s: number | null
  review_status: Exercise['review_status']
  programme_ref: string | null
}

interface LigneCle {
  exercise_id: string
  answer: ExerciseAnswer
  solution_steps: string[]
  misconceptions: Record<string, string | null>
}

function lireCache(publication: number): ContenuPedagogique | null {
  try {
    const brut = window.localStorage.getItem(CLE_CACHE)
    if (!brut) return null
    const cache = JSON.parse(brut) as Cache
    return cache.publication === publication ? cache.contenu : null
  } catch {
    return null
  }
}

function ecrireCache(publication: number, contenu: ContenuPedagogique) {
  try {
    const cache: Cache = { publication, contenu }
    window.localStorage.setItem(CLE_CACHE, JSON.stringify(cache))
  } catch {
    // Navigation privee ou quota depasse (environ 5 Mo) : le contenu sera
    // relu au prochain chargement, rien de plus. Au-dela de quelques milliers
    // d'exercices, ce cache devra passer sur IndexedDB.
    try {
      window.localStorage.removeItem(CLE_CACHE)
    } catch {
      // sans importance
    }
  }
}

/** Lit une table entiere, toutes ses pages en parallele. */
async function lireTable<T>(
  db: SupabaseClient,
  table: string,
  ordre: string,
  total: number,
): Promise<T[]> {
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const reponses = await Promise.all(
    Array.from({ length: pages }, (_, i) =>
      db
        .from(table)
        .select('*')
        .order(ordre)
        .range(i * PAGE, (i + 1) * PAGE - 1),
    ),
  )
  const lignes: T[] = []
  for (const { data, error } of reponses) {
    if (error) throw new Error(`Lecture du contenu (${table}) : ${error.message}`)
    for (const ligne of data ?? []) lignes.push(ligne as T)
  }
  return lignes
}

/**
 * Recompose un exercice tel que le moteur l'attend. La base le range en deux
 * moities (ce qui s'affiche avant la reponse, et la cle), pour qu'en phase 3
 * l'eleve ne puisse plus lire la seconde.
 */
function versExercice(ligne: LigneExercice, cle: LigneCle | undefined): Exercise {
  if (!cle) throw new Error(`Contenu incomplet : pas de cle pour ${ligne.id}`)
  const choices: ExerciseChoice[] | undefined = ligne.choices?.map((choix) => ({
    key: choix.key,
    text: choix.text,
    misconception: cle.misconceptions[choix.key] ?? null,
  }))
  return {
    id: ligne.id,
    skill_id: ligne.skill_id,
    level: ligne.level,
    type: ligne.type,
    statement: ligne.statement,
    image: ligne.image,
    ...(choices ? { choices } : {}),
    answer: cle.answer,
    solution_steps: cle.solution_steps,
    hint: ligne.hint,
    estimated_duration_s: ligne.estimated_duration_s ?? 0,
    review_status: ligne.review_status,
    programme_ref: ligne.programme_ref,
  }
}

export async function chargerContenuSupabase(db: SupabaseClient): Promise<ContenuPedagogique> {
  const { data: publication, error } = await db
    .from('content_publications')
    .select('id, nb_skills, nb_exercises, nb_mindmaps')
    .order('id', { ascending: false })
    .limit(1)
    .maybeSingle<Publication>()

  if (error) throw new Error(`Lecture du contenu : ${error.message}`)
  if (!publication) {
    throw new Error('Aucun contenu publié. Lancer scripts/publier.py --apply.')
  }

  const enCache = lireCache(publication.id)
  if (enCache) return enCache

  const [skills, lignesExercices, cles, mindmaps] = await Promise.all([
    lireTable<Skill>(db, 'content_skills', 'id', publication.nb_skills),
    lireTable<LigneExercice>(db, 'content_exercises', 'id', publication.nb_exercises),
    lireTable<LigneCle>(db, 'content_exercise_keys', 'exercise_id', publication.nb_exercises),
    lireTable<Mindmap>(db, 'content_mindmaps', 'id', publication.nb_mindmaps),
  ])

  // Une publication arrivee entre deux lectures melangerait deux versions du
  // contenu. On ne l'installe pas, et surtout on ne la met pas en cache.
  if (
    skills.length !== publication.nb_skills ||
    lignesExercices.length !== publication.nb_exercises ||
    cles.length !== publication.nb_exercises ||
    mindmaps.length !== publication.nb_mindmaps
  ) {
    throw new Error('Contenu en cours de publication : recharge la page dans un instant.')
  }

  const cleParExercice = new Map(cles.map((cle) => [cle.exercise_id, cle]))
  const contenu: ContenuPedagogique = {
    skills: skills.map((skill) => ({ ...skill, programme_ref: skill.programme_ref ?? [] })),
    exercises: lignesExercices.map((ligne) => versExercice(ligne, cleParExercice.get(ligne.id))),
    mindmaps,
  }

  ecrireCache(publication.id, contenu)
  return contenu
}
