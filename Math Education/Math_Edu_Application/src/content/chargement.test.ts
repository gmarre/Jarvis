import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { chargerContenuLocal, chargerContenuSupabase } from './chargement'
import { toPublicExercise, type Exercise } from '@/types/content'

// Le chargement depuis la base doit rendre exactement le contenu publie, dans
// sa version publique. Ce test range la banque locale comme le fait
// publier_contenu() (migration 0005 : l'exercice d'un cote, sa cle et les
// misconceptions de l'autre), la sert par un faux client paginé a 1 000
// lignes, et compare le resultat a l'original. Le faux client refuse la table
// des cles, comme la base apres la migration 0006.

type Ligne = object

function fauxClient(tables: Record<string, Ligne[]>): SupabaseClient {
  return {
    from(table: string) {
      if (table === 'content_exercise_keys') {
        throw new Error('Lecture des cles : refusee depuis la phase 3')
      }
      const lignes = tables[table] ?? []
      const requete = {
        select: () => requete,
        order: () => requete,
        limit: () => requete,
        maybeSingle: async () => ({ data: lignes[0] ?? null, error: null }),
        range: async (debut: number, fin: number) => ({
          data: lignes.slice(debut, fin + 1),
          error: null,
        }),
      }
      return requete
    },
  } as unknown as SupabaseClient
}

/** Partie lisible d'un exercice, comme publier_contenu() la range. */
function commeEnBase(exercises: Exercise[]) {
  const lisibles: Ligne[] = exercises.map((e) => ({
    id: e.id,
    skill_id: e.skill_id,
    level: e.level,
    type: e.type,
    statement: e.statement,
    image: e.image,
    choices: e.choices ? e.choices.map(({ key, text }) => ({ key, text })) : null,
    hint: e.hint,
    answer_unit: e.answer.unit ?? null,
    estimated_duration_s: e.estimated_duration_s,
    review_status: e.review_status,
    programme_ref: e.programme_ref,
  }))
  return { lisibles }
}

/** Plus de 1 000 exercices, pour traverser la pagination. */
function multiplier(exercises: Exercise[], fois: number): Exercise[] {
  const resultat: Exercise[] = []
  for (let i = 0; i < fois; i++) {
    for (const e of exercises) resultat.push({ ...e, id: `${e.id}-${i}` })
  }
  return resultat
}

const parId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id)

describe('chargerContenuSupabase', () => {
  it('rend exactement le contenu publie, sans jamais lire les cles', async () => {
    const local = await chargerContenuLocal()
    const exercises = multiplier(local.exercises, 3).sort(parId)
    const { lisibles } = commeEnBase(exercises)
    const skills = [...local.skills].sort(parId)
    const mindmaps = [...local.mindmaps].sort(parId)

    const db = fauxClient({
      content_publications: [
        {
          id: 1,
          nb_skills: skills.length,
          nb_exercises: exercises.length,
          nb_mindmaps: mindmaps.length,
        },
      ],
      content_skills: skills,
      content_exercises: lisibles,
      content_mindmaps: mindmaps,
    })

    const charge = await chargerContenuSupabase(db)

    expect(exercises.length).toBeGreaterThan(1000)
    expect(charge.exercises).toEqual(exercises.map(toPublicExercise))
    expect(charge.skills).toEqual(skills.map((s) => ({ ...s, programme_ref: s.programme_ref ?? [] })))
    expect(charge.mindmaps).toEqual(mindmaps)
  })

  it('refuse un contenu lu pendant une publication', async () => {
    const local = await chargerContenuLocal()
    const { lisibles } = commeEnBase(local.exercises)
    const db = fauxClient({
      content_publications: [
        { id: 2, nb_skills: local.skills.length, nb_exercises: local.exercises.length, nb_mindmaps: 0 },
      ],
      content_skills: local.skills,
      // Un exercice manque : deux versions du contenu se sont melangees.
      content_exercises: lisibles.slice(1),
      content_mindmaps: [],
    })

    await expect(chargerContenuSupabase(db)).rejects.toThrow('en cours de publication')
  })

  it('signale une base sans publication', async () => {
    const db = fauxClient({ content_publications: [] })
    await expect(chargerContenuSupabase(db)).rejects.toThrow('Aucun contenu publié')
  })
})
