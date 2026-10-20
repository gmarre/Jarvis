import { describe, expect, it } from 'vitest'

import { reponseLisible } from './revue'
import type { PublicExercise } from '@/types/content'

const base = {
  id: 'EX-A001-D-01',
  skill_id: 'A001',
  level: 'decouverte',
  statement: 'Combien ?',
  image: null,
  hint: null,
  estimated_duration_s: 30,
  review_status: 'relu_agent',
  programme_ref: null,
  answer_unit: null,
} as const

describe('reponseLisible', () => {
  it('montre le texte de la proposition choisie, pas sa lettre', () => {
    const qcm: PublicExercise = {
      ...base,
      type: 'qcm',
      choices: [
        { key: 'a', text: '12' },
        { key: 'b', text: '21' },
      ],
    }
    expect(reponseLisible(qcm, 'b')).toBe('21')
  })

  it('traduit un vrai ou faux et ajoute l unite d une saisie', () => {
    expect(reponseLisible({ ...base, type: 'vrai_faux' }, 'false')).toBe('Faux')
    expect(reponseLisible({ ...base, type: 'numerique', answer_unit: 'cm' }, '7')).toBe('7 cm')
  })
})
