import { describe, expect, it } from 'vitest'
import { everySectionWritten, reconcileCopy, type WrittenCopy } from '@/lib/outline/copy'
import { checkHeadingRule } from '@/lib/outline/heading-rule'
import { buildStructure } from '@/lib/outline/structure'
import { worry } from './helpers'

const sections = buildStructure({
  spine: 'pas',
  goal: 'buy',
  worries: [worry('w1'), worry('w2'), worry('w3')],
  assignments: { w1: 'faq', w2: 'faq', w3: 'faq' },
})

const entry = (id: string, over: Partial<WrittenCopy> = {}): WrittenCopy => ({
  id,
  heading: `Heading for ${id}`,
  note: 'What it does.',
  eyebrow: '',
  body: 'A real paragraph of copy.',
  support: '',
  cta: '',
  items: [],
  ...over,
})

const all = (over: Record<string, Partial<WrittenCopy>> = {}): WrittenCopy[] =>
  sections.map((section) => entry(section.id, over[section.id] ?? {}))

describe('reconcileCopy', () => {
  it('keeps a clean reply as it stands', () => {
    const { headings, corrections } = reconcileCopy(sections, all())
    expect(corrections).toEqual([])
    expect(everySectionWritten(sections, headings)).toBe(true)
    expect(headings[sections[0].id].body).toBe('A real paragraph of copy.')
  })

  it('produces a page that satisfies the heading rule', () => {
    const { headings } = reconcileCopy(sections, all())
    expect(checkHeadingRule(sections, headings)).toEqual([])
  })

  it('drops items from a section type that renders none', () => {
    const { headings, corrections } = reconcileCopy(
      sections,
      all({ close: { items: [{ heading: 'Nope', body: 'x' }] } }),
    )
    expect(headings.close.items).toEqual([])
    expect(corrections.some((line) => line.includes('renders none'))).toBe(true)
  })

  it('trims items past what the type can take, rather than breaking the theme', () => {
    const many = Array.from({ length: 12 }, (_, at) => ({ heading: `Q${at}`, body: 'a' }))
    const { headings, corrections } = reconcileCopy(sections, all({ faq: { items: many } }))
    expect(headings.faq.items).toHaveLength(8)
    expect(corrections.some((line) => line.includes('were dropped'))).toBe(true)
    expect(checkHeadingRule(sections, headings)).toEqual([])
  })

  it('says so when a section came back under the minimum', () => {
    const { corrections } = reconcileCopy(sections, all({ faq: { items: [{ heading: 'Only one', body: 'a' }] } }))
    expect(corrections.some((line) => line.includes('at least 3'))).toBe(true)
  })

  it('holds every label to the punctuation rule and spares only the body', () => {
    const { headings } = reconcileCopy(
      sections,
      all({
        offer: {
          heading: 'The offer: plainly put',
          note: 'Say it plainly - no hedging',
          cta: 'Buy now - today',
          support: 'the price claim: verified',
          body: 'Here is the offer: forty five days, no questions. A colon belongs here.',
        },
      }),
    )
    const written = headings.offer
    for (const label of [written.heading, written.note, written.cta, written.support]) {
      expect(label).not.toMatch(/[-–—;:]/)
    }
    // the body is prose and keeps its punctuation
    expect(written.body).toContain(':')
  })

  it('scrubs the punctuation rule out of headings and item headings', () => {
    const { headings } = reconcileCopy(
      sections,
      all({
        faq: {
          heading: 'Questions: the ones that matter',
          items: [{ heading: 'Is it heavy - really', body: 'Yes: it is. Genuinely heavy.' }],
        },
      }),
    )
    expect(headings.faq.heading).not.toMatch(/[-–—;:]/)
    expect(headings.faq.items[0].heading).not.toMatch(/[-–—;:]/)
    // and leaves the body alone, where a colon is sometimes the right mark
    expect(headings.faq.items[0].body).toContain(':')
  })

  it('drops an item with no heading, which would render as a blank H3', () => {
    const { headings } = reconcileCopy(
      sections,
      all({
        faq: {
          items: [
            { heading: 'One', body: 'a' },
            { heading: '   ', body: 'orphan' },
            { heading: 'Three', body: 'c' },
            { heading: 'Four', body: 'd' },
          ],
        },
      }),
    )
    expect(headings.faq.items.map((item) => item.heading)).toEqual(['One', 'Three', 'Four'])
  })

  it('leaves a section unwritten when it came back with no heading, rather than blanking it', () => {
    const { headings, corrections } = reconcileCopy(sections, all({ proof: { heading: '   ' } }))
    expect(headings.proof).toBeUndefined()
    expect(everySectionWritten(sections, headings)).toBe(false)
    expect(corrections.some((line) => line.includes('no heading'))).toBe(true)
  })

  it('ignores a section the outline does not have', () => {
    const { headings } = reconcileCopy(sections, [...all(), entry('ghost')])
    expect(headings.ghost).toBeUndefined()
  })

  it('keeps an eyebrow on the hero and nowhere else', () => {
    const { headings } = reconcileCopy(
      sections,
      all({ [sections[0].id]: { eyebrow: 'For renovators' }, proof: { eyebrow: 'For renovators' } }),
    )
    expect(headings[sections[0].id].eyebrow).toBe('For renovators')
    // proof does not take one, so it is discarded rather than rendered
    expect(headings.proof.eyebrow).toBe('')
  })

  it('empties a slot the section type does not take', () => {
    // proof takes heading and body, not cta
    const { headings } = reconcileCopy(sections, all({ proof: { cta: 'Buy now' } }))
    expect(headings.proof.cta).toBe('')
    // the offer does take one
    expect(reconcileCopy(sections, all({ offer: { cta: 'Buy now' } })).headings.offer.cta).toBe('Buy now')
  })
})
