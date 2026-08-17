import { describe, expect, it } from 'vitest'
import {
  activeSpine,
  emptyBrief,
  missingIds,
  normalizeBrief,
  selectedClaims,
  toHeadingBrief,
} from '@/lib/outline/brief'
import { buildStructure } from '@/lib/outline/structure'
import { claim, product, repository, worry } from './helpers'

describe('activeSpine', () => {
  it('follows the awareness stage by default', () => {
    expect(activeSpine({ awareness: 'unaware', spineOverride: '' })).toBe('story')
    expect(activeSpine({ awareness: 'most', spineOverride: '' })).toBe('offer')
  })

  it('uses the override when one is set', () => {
    expect(activeSpine({ awareness: 'unaware', spineOverride: 'bab' })).toBe('bab')
  })
})

describe('normalizeBrief', () => {
  it('fills in a usable brief from junk', () => {
    const brief = normalizeBrief({ awareness: 'nonsense', goal: 'nonsense', spineOverride: 'nonsense' })
    expect(brief.awareness).toBe('problem')
    expect(brief.goal).toBe('buy')
    expect(brief.spineOverride).toBe('')
    expect(brief.products).toEqual([])
  })

  it('keeps valid values', () => {
    const brief = normalizeBrief({ ...emptyBrief(), awareness: 'most', goal: 'quote', spineOverride: 'bab' })
    expect(brief.awareness).toBe('most')
    expect(brief.goal).toBe('quote')
    expect(brief.spineOverride).toBe('bab')
  })
})

describe('missingIds', () => {
  it('names ids the sheet no longer has instead of dropping them', () => {
    const repo = repository({ products: [product('p1')], claims: [claim('c1')], worries: [worry('w1')] })
    const brief = { ...emptyBrief(), products: ['p1', 'gone'], claims: ['c1', 'also-gone'], worries: ['w1'] }
    expect(missingIds(brief, repo)).toEqual({ products: ['gone'], claims: ['also-gone'], worries: [] })
  })
})

describe('selectedClaims', () => {
  it('keeps selection order so the first pick is the lead claim', () => {
    const repo = repository({ claims: [claim('c1'), claim('c2')] })
    const brief = { ...emptyBrief(), claims: ['c2', 'c1'] }
    expect(selectedClaims(brief, repo).map((item) => item.id)).toEqual(['c2', 'c1'])
  })

  it('skips ids the sheet no longer has', () => {
    const repo = repository({ claims: [claim('c1')] })
    const brief = { ...emptyBrief(), claims: ['gone', 'c1'] }
    expect(selectedClaims(brief, repo).map((item) => item.id)).toEqual(['c1'])
  })
})

describe('toHeadingBrief', () => {
  const repo = repository({
    products: [product('brass', { label: 'Brass pull' })],
    claims: [claim('c1', { label: 'Ages instead of chipping' })],
    worries: [worry('w1', { label: 'Feels expensive', detail: 'Forty five day guarantee' })],
  })

  const brief = {
    ...emptyBrief(),
    products: ['brass'],
    claims: ['c1'],
    worries: ['w1'],
    assignments: { w1: 'own' },
    awareness: 'problem' as const,
  }

  const sections = buildStructure({
    spine: activeSpine(brief),
    goal: brief.goal,
    worries: repo.worries,
    assignments: brief.assignments,
  })

  it('carries the lead the awareness stage dictates', () => {
    const payload = toHeadingBrief(brief, repo, sections)
    expect(payload.leadInstruction).toBe('Lead with the pain')
    expect(payload.awarenessStage).toBe('Problem aware')
  })

  it('leaves the lead alone when the spine is overridden', () => {
    const overridden = { ...brief, spineOverride: 'bab' as const }
    const payload = toHeadingBrief(overridden, repo, sections)
    expect(payload.leadInstruction).toBe('Lead with the pain')
    expect(payload.spine).toBe('Before After Bridge')
  })

  it('names the lead claim', () => {
    expect(toHeadingBrief(brief, repo, sections).leadClaim).toBe('Ages instead of chipping')
  })

  it('flags own worry sections and passes the reassurance through', () => {
    const payload = toHeadingBrief(brief, repo, sections)
    const own = payload.slots.find((slot) => slot.ownSection)!
    expect(own.worries).toEqual([{ worry: 'Feels expensive', answer: 'Forty five day guarantee' }])
  })

  it('marks exactly one slot as the H1', () => {
    const payload = toHeadingBrief(brief, repo, sections)
    expect(payload.slots.filter((slot) => slot.level === 'H1')).toHaveLength(1)
    expect(payload.slots[0].level).toBe('H1')
  })
})
