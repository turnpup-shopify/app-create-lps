import { describe, expect, it } from 'vitest'
import { hasForbidden, scrub } from '@/lib/outline/scrub'

describe('hasForbidden', () => {
  it('catches hyphens, dashes, semicolons and colons', () => {
    expect(hasForbidden('forty-five days')).toBe(true)
    expect(hasForbidden('one thing — another')).toBe(true)
    expect(hasForbidden('one thing – another')).toBe(true)
    expect(hasForbidden('here it is: brass')).toBe(true)
    expect(hasForbidden('brass ages; zinc chips')).toBe(true)
    expect(hasForbidden('Solid brass that outlives the cabinet')).toBe(false)
  })
})

describe('scrub', () => {
  it('removes every forbidden mark', () => {
    const cleaned = scrub('Forty-five days; no questions: really — none')
    expect(hasForbidden(cleaned)).toBe(false)
  })

  it('leaves clean text alone', () => {
    const clean = 'Solid brass that outlives the cabinet'
    expect(scrub(clean)).toBe(clean)
  })

  it('collapses the gap a removed mark leaves behind', () => {
    expect(scrub('brass — zinc')).toBe('brass zinc')
    expect(scrub('Forty-five day guarantee')).toBe('Forty five day guarantee')
  })

  it('does not leave a space before sentence punctuation', () => {
    expect(scrub('It ages instead of chipping-.')).toBe('It ages instead of chipping.')
  })

  it('trims the result', () => {
    expect(scrub('  brass  ')).toBe('brass')
  })
})
