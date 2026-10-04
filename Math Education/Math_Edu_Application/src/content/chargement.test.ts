import { describe, expect, it } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'

import { chargerContenuLocal, chargerContenuSupabase } from './chargement'
import type { Exercise } from '@/types/content'

// Le chargement depuis la base doit rendre exactement le contenu publie. Ce
// test range la banque locale comme le fait publier_contenu() (migration 0005 :
// l'exercice d'un cote, sa cle et les misconceptions de l'autre), la sert par
// un faux client paginé a 1 000 lignes, et compare le resultat a l'original.

type Ligne = object

function fauxClient(tables: Record<string, Ligne[]>): SupabaseClient {
  return {
    from(table: string) {
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

/** Meme decoupage que publier_contenu(). */
function commeEnBase(exercises: Exercise[]) {
  const lisibles: Ligne[] = []
  const cles: Ligne[] = []
  for (const e of exercises) {
    lisibles.push({
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
    })
    cles.push({
      exercise_id: e.id,
      answer: e.answer,
      solution_steps: e.solution_steps,
      misconceptions: Object.fromEntries((e.choices ?? []).map((c) => [c.key, c.misconception])),
    })
  }
  return { lisibles, cles }
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
  it('rend exactement le contenu publie, misconceptions des QCM comprises', async () => {
    const local = await chargerContenuLocal()
    const exercises = multiplier(local.exercises, 3).sort(parId)
    const { lisibles, cles } = commeEnBase(exercises)
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
      content_exercise_keys: cles,
      content_mindmaps: mindmaps,
    })

    const charge = await chargerContenuSupabase(db)

    expect(exercises.length).toBeGreaterThan(1000)
    expect(charge.exercises).toEqual(exercises)
    expect(charge.skills).toEqual(skills.map((s) => ({ ...s, programme_ref: s.programme_ref ?? [] })))
    expect(charge.mindmaps).toEqual(mindmaps)
  })

  it('refuse un contenu lu pendant une publication', async () => {
    const local = await chargerContenuLocal()
    const { lisibles, cles } = commeEnBase(local.exercises)
    const db = fauxClient({
      content_publications: [
        { id: 2, nb_skills: local.skills.length, nb_exercises: local.exercises.length, nb_mindmaps: 0 },
      ],
      content_skills: local.skills,
      content_exercises: lisibles,
      // Une cle manque : deux versions du contenu se sont melangees.
      content_exercise_keys: cles.slice(1),
      content_mindmaps: [],
    })

    await expect(chargerContenuSupabase(db)).rejects.toThrow('en cours de publication')
  })

  it('signale une base sans publication', async () => {
    const db = fauxClient({ content_publications: [] })
    await expect(chargerContenuSupabase(db)).rejects.toThrow('Aucun contenu publié')
  })
})
