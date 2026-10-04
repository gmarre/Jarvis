// Chargement du contenu pedagogique, depuis la base ou depuis les JSON locaux.
//
// Git reste la source du contenu ; scripts/publier.py le publie dans les tables
// content_* (migration 0005). L'application le lit ici, une fois par appareil
// et par publication :
//
//  1. elle lit la derniere ligne de content_publications (une requete legere) ;
//  2. si le cache de l'appareil porte le meme numero de publication, il sert ;
//  3. sinon elle lit les trois tables lisibles, par pages de 1 000 lignes (la
//     limite de PostgREST chez Supabase), en parallele, puis met le cache a jour.
//
// Elle ne lit jamais content_exercise_keys (reponses, corriges) : depuis la
// phase 3, c'est l'Edge Function `corriger` qui s'en sert, et la migration 0006
// en retire la lecture aux eleves.
//
// En mode demonstration, les JSON locaux sont importes a la demande : ils
// forment un chunk a part, telecharge seulement si la demonstration tourne.

import type { SupabaseClient } from '@supabase/supabase-js'

import type {
  Exercise,
  ExercisesBank,
  Mindmap,
  MindmapsBank,
  PublicExercise,
  Skill,
  SkillsDag,
} from '@/types/content'
import { toPublicExercise } from '@/types/content'
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

/** Contenu local complet : les exercices y gardent reponse et corrige. */
export interface ContenuLocal extends Omit<ContenuPedagogique, 'exercises'> {
  exercises: Exercise[]
}

/** Ce qu'on installe a partir du contenu local : sans les reponses, comme en production. */
export function versContenuPublic(local: ContenuLocal): ContenuPedagogique {
  return { ...local, exercises: local.exercises.map(toPublicExercise) }
}

export async function chargerContenuLocal(): Promise<ContenuLocal> {
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
const CLE_CACHE = 'racine.contenu.v2'
/**
 * Caches des versions precedentes, a effacer. La v1 (phase 2) contenait les
 * reponses : la laisser sur l'appareil annulerait la phase 3.
 */
const ANCIENS_CACHES = ['racine.contenu.v1']

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
  level: PublicExercise['level']
  type: PublicExercise['type']
  statement: string
  image: string | null
  choices: { key: string; text: string }[] | null
  hint: string | null
  answer_unit: string | null
  estimated_duration_s: number | null
  review_status: PublicExercise['review_status']
  programme_ref: string | null
}

function effacerAnciensCaches() {
  for (const cle of ANCIENS_CACHES) {
    try {
      window.localStorage.removeItem(cle)
    } catch {
      // sans importance
    }
  }
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

function versExercice(ligne: LigneExercice): PublicExercise {
  return {
    id: ligne.id,
    skill_id: ligne.skill_id,
    level: ligne.level,
    type: ligne.type,
    statement: ligne.statement,
    image: ligne.image,
    ...(ligne.choices ? { choices: ligne.choices } : {}),
    hint: ligne.hint,
    answer_unit: ligne.answer_unit,
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

  effacerAnciensCaches()
  const enCache = lireCache(publication.id)
  if (enCache) return enCache

  const [skills, lignesExercices, mindmaps] = await Promise.all([
    lireTable<Skill>(db, 'content_skills', 'id', publication.nb_skills),
    lireTable<LigneExercice>(db, 'content_exercises', 'id', publication.nb_exercises),
    lireTable<Mindmap>(db, 'content_mindmaps', 'id', publication.nb_mindmaps),
  ])

  // Une publication arrivee entre deux lectures melangerait deux versions du
  // contenu. On ne l'installe pas, et surtout on ne la met pas en cache.
  if (
    skills.length !== publication.nb_skills ||
    lignesExercices.length !== publication.nb_exercises ||
    mindmaps.length !== publication.nb_mindmaps
  ) {
    throw new Error('Contenu en cours de publication : recharge la page dans un instant.')
  }

  const contenu: ContenuPedagogique = {
    skills: skills.map((skill) => ({ ...skill, programme_ref: skill.programme_ref ?? [] })),
    exercises: lignesExercices.map(versExercice),
    mindmaps,
  }

  ecrireCache(publication.id, contenu)
  return contenu
}
