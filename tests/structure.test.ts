import { describe, expect, it } from 'vitest'
import { buildStructure, baseSections } from '@/lib/outline/structure'
import { ownSectionId } from '@/lib/outline/placement'
import { closeJob } from '@/lib/outline/goals'
import { worry } from './helpers'

const ids = (sections: { id: string }[]) => sections.map((section) => section.id)

describe('baseSections', () => {
  it('lays out every spine slot, then proof, then the offer, then the close', () => {
    const sections = baseSections({ spine: 'pas', goal: 'buy', worries: [], assignments: {} })
    expect(ids(sections)).toEqual([
      'spine-problem',
      'spine-agitate',
      'spine-solution',
      'spine-how',
      'proof',
      'offer',
      'close',
    ])
  })

  it('skips the offer section when the spine is offer led', () => {
    const sections = baseSections({ spine: 'offer', goal: 'buy', worries: [], assignments: {} })
    expect(ids(sections)).toEqual(['spine-offer', 'spine-whynow', 'proof', 'close'])
  })

  it('puts own section worries without late tags before proof', () => {
    const trust = worry('w1', { tags: 'trust' })
    const sections = baseSections({
      spine: 'pas',
      goal: 'buy',
      worries: [trust],
      assignments: { w1: 'own' },
    })
    expect(ids(sections).indexOf(ownSectionId('w1'))).toBe(4)
    expect(ids(sections).indexOf('proof')).toBe(5)
  })

  it('puts own section worries with late tags after the offer', () => {
    const price = worry('w1', { tags: 'price' })
    const sections = baseSections({
      spine: 'pas',
      goal: 'buy',
      worries: [price],
      assignments: { w1: 'own' },
    })
    const order = ids(sections)
    expect(order.indexOf('offer')).toBeLessThan(order.indexOf(ownSectionId('w1')))
    expect(order.indexOf(ownSectionId('w1'))).toBeLessThan(order.indexOf('close'))
  })

  it('matches late tags on substring, case insensitive', () => {
    const sections = baseSections({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1', { tags: 'Money Back' })],
      assignments: { w1: 'own' },
    })
    const order = ids(sections)
    expect(order.indexOf('offer')).toBeLessThan(order.indexOf(ownSectionId('w1')))
  })

  it('only creates questions when a worry is assigned to it', () => {
    const without = baseSections({ spine: 'pas', goal: 'buy', worries: [worry('w1')], assignments: {} })
    expect(ids(without)).not.toContain('faq')

    const withFaq = baseSections({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1')],
      assignments: { w1: 'faq' },
    })
    expect(ids(withFaq)).toContain('faq')
  })

  it('attaches worries to the section they are assigned to', () => {
    const sections = baseSections({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1'), worry('w2')],
      assignments: { w1: 'spine-solution', w2: 'proof' },
    })
    const solution = sections.find((section) => section.id === 'spine-solution')!
    const proof = sections.find((section) => section.id === 'proof')!
    expect(solution.worries.map((item) => item.id)).toEqual(['w1'])
    expect(proof.worries.map((item) => item.id)).toEqual(['w2'])
  })

  it('never shows an unplaced worry in the outline', () => {
    const sections = baseSections({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1')],
      assignments: {},
    })
    expect(sections.flatMap((section) => section.worries)).toHaveLength(0)
  })

  it('treats a worry pointing at a slot the spine no longer has as unplaced', () => {
    const sections = baseSections({
      spine: 'offer',
      goal: 'buy',
      worries: [worry('w1')],
      assignments: { w1: 'spine-agitate' },
    })
    expect(sections.flatMap((section) => section.worries)).toHaveLength(0)
  })

  it('varies the close job with the page goal', () => {
    for (const goal of ['buy', 'email', 'book', 'quote']) {
      const sections = baseSections({ spine: 'pas', goal, worries: [], assignments: {} })
      const close = sections.find((section) => section.id === 'close')!
      expect(close.job).toBe(closeJob(goal))
    }
    expect(closeJob('email')).not.toBe(closeJob('buy'))
  })
})

describe('buildStructure', () => {
  it('makes position zero the H1 and everything after an H2', () => {
    const sections = buildStructure({ spine: 'pas', goal: 'buy', worries: [], assignments: {} })
    expect(sections[0].level).toBe(1)
    expect(sections.slice(1).every((section) => section.level === 2)).toBe(true)
  })

  it('honours a stored order but keeps the hero first and holding the H1', () => {
    // The H1 belongs to the hero, not to whatever sits at position zero. A
    // stored order that put the close on top would otherwise hand it the H1.
    const sections = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [],
      assignments: {},
      order: ['close', 'spine-problem'],
    })
    expect(sections[0].id).toBe('spine-problem')
    expect(sections[0].level).toBe(1)
    expect(sections[1].id).toBe('close')
    expect(sections[1].level).toBe(2)
    // and the rest of the stored order is respected after the hero
    expect(ids(sections).indexOf('close')).toBeLessThan(ids(sections).indexOf('proof'))
  })

  it('gives exactly one section the H1 and every other section an H2', () => {
    const sections = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1', { tags: 'price' })],
      assignments: { w1: 'own' },
    })
    expect(sections.filter((section) => section.level === 1)).toHaveLength(1)
    expect(sections.slice(1).every((section) => section.level === 2)).toBe(true)
    // no section is ever an H3. Those come from items inside a section.
    expect(sections.some((section) => section.level === 3)).toBe(false)
  })

  it('marks the hero with the hero section type', () => {
    const sections = buildStructure({ spine: 'pas', goal: 'buy', worries: [], assignments: {} })
    expect(sections[0].typeId).toBe('hero')
    expect(sections.slice(1).every((section) => section.typeId !== 'hero')).toBe(true)
  })

  it('keeps every section even when the stored order is partial', () => {
    const base = buildStructure({ spine: 'pas', goal: 'buy', worries: [], assignments: {} })
    const reordered = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [],
      assignments: {},
      order: ['proof'],
    })
    expect(reordered).toHaveLength(base.length)
    expect(ids(reordered).sort()).toEqual(ids(base).sort())
  })

  it('survives a save and reload with the order intact below the hero', () => {
    const input = { spine: 'pas' as const, goal: 'buy', worries: [], assignments: {} }
    const dragged = ['close', 'proof', 'spine-how', 'spine-solution', 'spine-agitate', 'spine-problem', 'offer']
    const reloaded = buildStructure({ ...input, order: dragged })
    // The hero is lifted out and put back on top. Everything else keeps the
    // order the writer chose, which also heals an outline saved before the rule.
    expect(ids(reloaded)).toEqual([
      'spine-problem',
      'close',
      'proof',
      'spine-how',
      'spine-solution',
      'spine-agitate',
      'offer',
    ])
    expect(reloaded[0].level).toBe(1)
  })

  it('drops a section when its worry stops having its own section', () => {
    const withOwn = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1')],
      assignments: { w1: 'own' },
    })
    const without = buildStructure({ spine: 'pas', goal: 'buy', worries: [worry('w1')], assignments: {} })
    expect(ids(withOwn)).toContain(ownSectionId('w1'))
    expect(ids(without)).not.toContain(ownSectionId('w1'))
  })

  it('changes the section stack when the spine changes', () => {
    const pas = buildStructure({ spine: 'pas', goal: 'buy', worries: [], assignments: {} })
    const story = buildStructure({ spine: 'story', goal: 'buy', worries: [], assignments: {} })
    expect(ids(pas)).not.toEqual(ids(story))
    expect(ids(story)[0]).toBe('spine-hook')
  })
})
