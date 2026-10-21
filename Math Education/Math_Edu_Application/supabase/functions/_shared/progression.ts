// Lecture et ecriture de la progression d'un eleve, cote serveur (sprint 6).
//
// Les fonctions `corriger` et `rendre-super` l'emploient avec le client
// service_role : depuis la migration 0021, le navigateur ne peut plus ecrire
// ni ses tentatives, ni ses passages, ni sa progression (sauf la relecture
// espacee des cartes mentales). Le calcul lui-meme est dans maitrise.ts,
// partage avec l'application.
//
// Les echeances (controles, relecture) sont posees a 6 h UTC, 8 h a Paris
// l'hiver : le serveur n'a pas le fuseau de l'eleve.

import { epreuveDe, ligneVide, type Epreuve, type LigneProgres } from './maitrise.ts'

// Le client Supabase n'est pas importe ici, pour ne pas lier ce module a une
// version : il est type largement, chaque appel verifie son erreur.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = any

export class ErreurProgression extends Error {}

/** Colonnes de skill_progress lues et ecrites, dans l'ordre de LigneProgres. */
const COLONNES =
  'skill_id, status, recent, score, attempts, next_review_at, review_box, updated_at, niveau, exercices_reussis, controles_reussis, prochain_controle, valide_par_test'

/** Le compte est-il un eleve ? Seul un eleve a une progression. */
export async function estEleve(admin: Client, userId: string): Promise<boolean> {
  const { data, error } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle()
  if (error) throw new ErreurProgression(`Lecture du profil : ${error.message}`)
  return data?.role === 'eleve'
}

/** Ligne de progression d'une competence, vide si l'eleve ne l'a jamais travaillee. */
export async function lireLigne(admin: Client, userId: string, skillId: string): Promise<LigneProgres> {
  const { data, error } = await admin
    .from('skill_progress')
    .select(COLONNES)
    .eq('user_id', userId)
    .eq('skill_id', skillId)
    .maybeSingle()
  if (error) throw new ErreurProgression(`Lecture de la progression : ${error.message}`)
  return { ...ligneVide(skillId), ...(data ?? {}) } as LigneProgres
}

export async function ecrireLigne(admin: Client, userId: string, ligne: LigneProgres): Promise<void> {
  const { error } = await admin
    .from('skill_progress')
    .upsert({ ...ligne, user_id: userId }, { onConflict: 'user_id,skill_id' })
  if (error) throw new ErreurProgression(`Ecriture de la progression : ${error.message}`)
}

/** Fenetre des dernieres reponses de la competence (mastery_threshold.out_of). */
export async function fenetreDe(admin: Client, skillId: string): Promise<number> {
  const { data, error } = await admin
    .from('content_skills')
    .select('mastery_threshold')
    .eq('id', skillId)
    .maybeSingle()
  if (error) throw new ErreurProgression(`Lecture de la competence : ${error.message}`)
  const outOf = Number(data?.mastery_threshold?.out_of)
  return Number.isInteger(outOf) && outOf > 0 ? outOf : 5
}

/** Ce que l'eleve a fait des super exercices dont la competence est la porteuse. */
export async function epreuveDeLEleve(admin: Client, userId: string, skillId: string): Promise<Epreuve> {
  const supers = await admin.from('content_super').select('id').eq('skill_id', skillId)
  if (supers.error) throw new ErreurProgression(`Lecture des super exercices : ${supers.error.message}`)
  const ids = ((supers.data ?? []) as { id: string }[]).map((s) => s.id)
  if (ids.length === 0) return epreuveDe([], [])
  const passages = await admin
    .from('super_attempts')
    .select('super_id, reussi, score, total')
    .eq('user_id', userId)
    .in('super_id', ids)
  if (passages.error) throw new ErreurProgression(`Lecture des passages : ${passages.error.message}`)
  return epreuveDe(ids, passages.data ?? [])
}
