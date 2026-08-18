import { describe, expect, it } from 'vitest'
import { checkHeadingRule, followsHeadingRule } from '@/lib/outline/heading-rule'
import { toMarkdown } from '@/lib/outline/markdown'
import { buildStructure } from '@/lib/outline/structure'
import { emptyHeading, type Headings } from '@/lib/outline/types'
import { worry } from './helpers'

const sections = buildStructure({
  spine: 'pas',
  goal: 'buy',
  worries: [worry('w1', { tags: 'price' })],
  assignments: { w1: 'own' },
})

/** Every section written, with no items anywhere. */
const written = (): Headings =>
  Object.fromEntries(
    sections.map((section) => [
      section.id,
      { ...emptyHeading(), heading: `Heading for ${section.role}`, note: 'note', body: 'A paragraph.' },
    ]),
  )

describe('the heading rule', () => {
  it('passes a page with one H1 in the hero and an H2 everywhere else', () => {
    expect(checkHeadingRule(sections, written())).toEqual([])
    expect(followsHeadingRule(sections, written())).toBe(true)
  })

  it('accepts items on a type that repeats them', () => {
    const faq = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1'), worry('w2'), worry('w3')],
      assignments: { w1: 'faq', w2: 'faq', w3: 'faq' },
    })
    const headings = Object.fromEntries(
      faq.map((section) => [section.id, { ...emptyHeading(), heading: 'H', note: 'n' }]),
    ) as Headings
    headings.faq = {
      ...emptyHeading(),
      heading: 'Questions people ask',
      note: 'n',
      items: [
        { heading: 'Is it heavy', body: 'Yes.' },
        { heading: 'Will it fit', body: 'Usually.' },
        { heading: 'What if it breaks', body: 'We replace it.' },
      ],
    }
    expect(checkHeadingRule(faq, headings)).toEqual([])
  })

  it('rejects items on a type that takes none', () => {
    const headings = written()
    headings.close = { ...headings.close, items: [{ heading: 'Nope', body: '' }] }
    const problems = checkHeadingRule(sections, headings)
    expect(problems.some((problem) => problem.message.includes('takes none'))).toBe(true)
  })

  it('rejects too few or too many items for the type', () => {
    const faq = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1')],
      assignments: { w1: 'faq' },
    })
    const headings = Object.fromEntries(
      faq.map((section) => [section.id, { ...emptyHeading(), heading: 'H', note: 'n' }]),
    ) as Headings
    headings.faq = { ...emptyHeading(), heading: 'Q', note: 'n', items: [{ heading: 'One', body: '' }] }
    expect(checkHeadingRule(faq, headings).some((problem) => problem.message.includes('takes 3 to 8'))).toBe(true)
  })

  it('rejects an item with no heading, which would be a blank H3', () => {
    const faq = buildStructure({ spine: 'pas', goal: 'buy', worries: [worry('w1')], assignments: { w1: 'faq' } })
    const headings = Object.fromEntries(
      faq.map((section) => [section.id, { ...emptyHeading(), heading: 'H', note: 'n' }]),
    ) as Headings
    headings.faq = {
      ...emptyHeading(),
      heading: 'Q',
      note: 'n',
      items: [
        { heading: 'One', body: '' },
        { heading: '  ', body: 'orphan' },
        { heading: 'Three', body: '' },
      ],
    }
    expect(checkHeadingRule(faq, headings).some((problem) => problem.message.includes('no heading'))).toBe(true)
  })

  it('rejects an H3 that would have no H2 above it', () => {
    const faq = buildStructure({ spine: 'pas', goal: 'buy', worries: [worry('w1')], assignments: { w1: 'faq' } })
    const headings = Object.fromEntries(
      faq.map((section) => [section.id, { ...emptyHeading(), heading: 'H', note: 'n' }]),
    ) as Headings
    headings.faq = {
      ...emptyHeading(),
      heading: '',
      note: 'n',
      items: [
        { heading: 'One', body: '' },
        { heading: 'Two', body: '' },
        { heading: 'Three', body: '' },
      ],
    }
    expect(checkHeadingRule(faq, headings).some((problem) => problem.message.includes('no H2 above'))).toBe(true)
  })

  it('rejects a second H1', () => {
    const twoOnes = sections.map((section) => ({ ...section, level: 1 as const }))
    expect(checkHeadingRule(twoOnes, written()).some((problem) => problem.message.includes('Only the hero'))).toBe(true)
  })

  it('rejects a page with no H1 at all', () => {
    const noneOne = sections.map((section) => ({ ...section, level: 2 as const }))
    expect(checkHeadingRule(noneOne, written()).some((problem) => problem.message.includes('no title'))).toBe(true)
  })

  it('says nothing about an empty page', () => {
    expect(checkHeadingRule([], {})).toEqual([])
  })
})

describe('the markdown it produces', () => {
  it('has exactly one H1 and no skipped level', () => {
    const faq = buildStructure({
      spine: 'pas',
      goal: 'buy',
      worries: [worry('w1'), worry('w2'), worry('w3')],
      assignments: { w1: 'faq', w2: 'faq', w3: 'faq' },
    })
    const headings = Object.fromEntries(
      faq.map((section) => [section.id, { ...emptyHeading(), heading: `H for ${section.role}`, note: 'n' }]),
    ) as Headings
    headings.faq = {
      ...emptyHeading(),
      heading: 'Questions people ask',
      note: 'n',
      items: [
        { heading: 'Is it heavy', body: 'Yes.' },
        { heading: 'Will it fit', body: 'Usually.' },
        { heading: 'What if it breaks', body: 'We replace it.' },
      ],
    }

    const levels = toMarkdown({ sections: faq, headings })
      .split('\n')
      .filter((line) => /^#{1,6} /.test(line))
      .map((line) => line.match(/^#+/)![0].length)

    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels[0]).toBe(1)
    // never jump more than one level deeper than the line before
    for (let at = 1; at < levels.length; at += 1) {
      expect(levels[at] - levels[at - 1]).toBeLessThanOrEqual(1)
    }
    expect(levels.filter((level) => level === 3)).toHaveLength(3)
  })

  it('puts the items under their own section, not at the end', () => {
    const faq = buildStructure({ spine: 'pas', goal: 'buy', worries: [worry('w1')], assignments: { w1: 'faq' } })
    const headings = Object.fromEntries(
      faq.map((section) => [section.id, { ...emptyHeading(), heading: `H for ${section.id}`, note: 'n' }]),
    ) as Headings
    headings.faq = { ...emptyHeading(), heading: 'Questions', note: 'n', items: [{ heading: 'Is it heavy', body: 'Yes.' }] }

    const markdown = toMarkdown({ sections: faq, headings })
    const at = markdown.indexOf('### Is it heavy')
    expect(at).toBeGreaterThan(markdown.indexOf('## Questions'))
    expect(at).toBeLessThan(markdown.indexOf('H for close'))
  })
})
