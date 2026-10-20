import { describe, expect, it } from 'vitest'

import { getSkill, levelRank, skills } from '@/content'
import { emptyProgress, type ProgressMap } from './dag'
import { prioriteDesChemins, proposerChemins } from './chemins'

function vierge(): ProgressMap {
  const p: ProgressMap = {}
  for (const s of skills) p[s.id] = emptyProgress(s.id)
  return p
}

function maitrise(p: ProgressMap, ids: string[]): ProgressMap {
  const copie = { ...p }
  for (const id of ids) copie[id] = { ...emptyProgress(id), status: 'mastered' }
  return copie
}

describe('proposerChemins', () => {
  it('propose un chemin par domaine pour un eleve qui commence', () => {
    const chemins = proposerChemins(vierge(), 'CE1')
    expect(chemins.length).toBeGreaterThan(1)
    for (const c of chemins) {
      // Rien au-dessus de la classe dans les objectifs.
      for (const id of c.objectifs) {
        expect(levelRank(getSkill(id)!.school_level)).toBeLessThanOrEqual(levelRank('CE1'))
      }
    }
  })

  it('range les etapes dans l ordre du graphe : un prerequis avant ce qui en depend', () => {
    for (const c of proposerChemins(vierge(), '6e')) {
      const position = new Map(c.etapes.map((e, i) => [e.skill.id, i]))
      for (const etape of c.etapes) {
        for (const pre of etape.skill.prerequisites) {
          if (position.has(pre)) expect(position.get(pre)!).toBeLessThan(position.get(etape.skill.id)!)
        }
      }
    }
  })

  it('traverse les domaines : un chemin peut contenir des prerequis d un autre domaine', () => {
    const chemins = proposerChemins(vierge(), '6e')
    const traverse = chemins.some((c) => c.etapes.some((e) => e.skill.domain !== c.id))
    expect(traverse).toBe(true)
  })

  it('ne propose plus un domaine acquis jusqu a la classe', () => {
    const domaineA = skills.filter((s) => s.domain === 'A' && levelRank(s.school_level) <= levelRank('CP'))
    const p = maitrise(vierge(), skills.filter((s) => levelRank(s.school_level) <= levelRank('CP') ).map((s) => s.id))
    expect(domaineA.length).toBeGreaterThan(0)
    expect(proposerChemins(p, 'CP').find((c) => c.id === 'A')).toBeUndefined()
  })

  it('met en tete les chemins qui reparent des lacunes des classes precedentes', () => {
    const chemins = proposerChemins(vierge(), '5e')
    for (let i = 1; i < chemins.length; i++) {
      expect(chemins[i - 1].lacunesAnterieures).toBeGreaterThanOrEqual(chemins[i].lacunesAnterieures)
    }
  })
})

describe('prioriteDesChemins', () => {
  it('prend la lacune la plus ancienne parmi les chemins choisis, et rien sans choix', () => {
    const chemins = proposerChemins(vierge(), 'CE2')
    const choisis = chemins.slice(0, 2).map((c) => c.id)
    const priorite = prioriteDesChemins(chemins, choisis)
    expect(priorite).not.toBeNull()
    const rangs = chemins
      .filter((c) => choisis.includes(c.id) && c.priorite)
      .map((c) => levelRank(getSkill(c.priorite!)!.school_level))
    expect(levelRank(getSkill(priorite!)!.school_level)).toBe(Math.min(...rangs))
    expect(prioriteDesChemins(chemins, [])).toBeNull()
  })
})
