import { describe, expect, it } from 'vitest'
import { driftCount, missingHeadings, signatures } from '@/lib/outline/drift'
import { buildStructure } from '@/lib/outline/structure'
import type { Headings } from '@/lib/outline/types'
import { worry } from './helpers'

const build = (assignments: Record<string, string> = {}, order?: string[]) =>
  buildStructure({ spine: 'pas', goal: 'buy', worries: [worry('w1')], assignments, order })

const wrote = (sections: { id: string }[]): Headings =>
  Object.fromEntries(sections.map((section) => [section.id, { heading: 'a heading', note: 'a note' }]))

describe('driftCount', () => {
  it('reports nothing before a pass exists', () => {
    const sections = build()
    expect(driftCount(sections, null, {})).toBe(0)
  })

  it('reports nothing when nothing changed', () => {
    const sections = build()
    expect(driftCount(sections, signatures(sections), wrote(sections))).toBe(0)
  })

  it('reports the section that gained a worry', () => {
    const before = build()
    const pass = signatures(before)
    const headings = wrote(before)
    const after = build({ w1: 'proof' })
    expect(driftCount(after, pass, headings)).toBe(1)
  })

  it('reports a new section that has no heading yet', () => {
    const before = build()
    const pass = signatures(before)
    const headings = wrote(before)
    const after = build({ w1: 'faq' })
    expect(driftCount(after, pass, headings)).toBeGreaterThan(0)
  })

  it('reports the sections a reorder moved', () => {
    const before = build()
    const pass = signatures(before)
    const headings = wrote(before)
    const after = build({}, ['close', ...before.map((section) => section.id)])
    expect(driftCount(after, pass, headings)).toBeGreaterThan(0)
  })
})

describe('missingHeadings', () => {
  it('counts sections with no heading written', () => {
    const sections = build()
    expect(missingHeadings(sections, {})).toBe(sections.length)
    expect(missingHeadings(sections, wrote(sections))).toBe(0)
  })
})
