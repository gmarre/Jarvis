import { describe, expect, it } from 'vitest'

import { emptyProgress, type ProgressMap } from './dag'
import { lacunesCommunes } from './suggestions'

describe('lacunesCommunes', () => {
  it('deux eleves debutants : leurs lacunes racines sont communes', () => {
    const s = lacunesCommunes([{}, {}], ['C013'])
    expect(s.length).toBeGreaterThan(0)
    expect(s.every((x) => x.eleves === 2)).toBe(true)
  })

  it('une lacune comblee par un seul eleve passe apres les lacunes partagees', () => {
    const [premiere] = lacunesCommunes([{}, {}], ['C013'])
    const acquis: ProgressMap = {
      [premiere.skillId]: { ...emptyProgress(premiere.skillId), status: 'mastered', niveau: 4 },
    }
    const s = lacunesCommunes([acquis, {}], ['C013'], 50)
    const rang = s.findIndex((x) => x.skillId === premiere.skillId)
    expect(rang).toBeGreaterThanOrEqual(0)
    expect(s[rang].eleves).toBe(1)
    expect(s.slice(0, rang).every((x) => x.eleves >= 1)).toBe(true)
  })

  it('aucun eleve qui partage : aucune suggestion', () => {
    expect(lacunesCommunes([], ['C013'])).toEqual([])
  })
})
