import { describe, expect, it } from 'vitest'
import {
  assignWorry,
  isLate,
  placedCount,
  placementOf,
  pruneAssignments,
  unassignWorry,
  unplacedWorries,
  validSlotIds,
} from '@/lib/outline/placement'
import { worry } from './helpers'

describe('isLate', () => {
  it('matches the late list on substring, case insensitive', () => {
    expect(isLate({ tags: 'price' })).toBe(true)
    expect(isLate({ tags: 'Money back' })).toBe(true)
    expect(isLate({ tags: 'WARRANTY, fit' })).toBe(true)
    expect(isLate({ tags: 'trust' })).toBe(false)
    expect(isLate({ tags: '' })).toBe(false)
  })
})

describe('validSlotIds', () => {
  it('includes every spine slot plus the fixed placements', () => {
    const valid = validSlotIds({ spine: 'pas' })
    for (const id of ['spine-problem', 'spine-agitate', 'spine-solution', 'spine-how']) {
      expect(valid.has(id)).toBe(true)
    }
    for (const id of ['proof', 'offer', 'close', 'faq', 'own']) {
      expect(valid.has(id)).toBe(true)
    }
  })

  it('drops the offer slot when the spine is offer led', () => {
    expect(validSlotIds({ spine: 'offer' }).has('offer')).toBe(false)
    expect(validSlotIds({ spine: 'offer' }).has('spine-offer')).toBe(true)
  })
})

describe('assignWorry', () => {
  it('moves a worry when the target is new', () => {
    expect(assignWorry({ w1: 'proof' }, 'w1', 'own')).toEqual({ w1: 'own' })
  })

  it('removes the worry when it is assigned where it already sits', () => {
    expect(assignWorry({ w1: 'proof' }, 'w1', 'proof')).toEqual({})
  })

  it('does not mutate the input', () => {
    const before = { w1: 'proof' }
    assignWorry(before, 'w2', 'own')
    expect(before).toEqual({ w1: 'proof' })
  })
})

describe('unassignWorry', () => {
  it('removes one entry and leaves the rest', () => {
    expect(unassignWorry({ w1: 'proof', w2: 'own' }, 'w1')).toEqual({ w2: 'own' })
  })
})

describe('placementOf', () => {
  const valid = validSlotIds({ spine: 'pas' })

  it('returns null for a worry with no entry', () => {
    expect(placementOf('w1', {}, valid)).toBeNull()
  })

  it('returns null for a worry pointing at a slot this spine does not have', () => {
    expect(placementOf('w1', { w1: 'spine-hook' }, valid)).toBeNull()
  })

  it('returns the slot for a live placement', () => {
    expect(placementOf('w1', { w1: 'proof' }, valid)).toBe('proof')
  })
})

describe('unplacedWorries and placedCount', () => {
  const valid = validSlotIds({ spine: 'pas' })
  const worries = [worry('w1'), worry('w2'), worry('w3')]
  const assignments = { w1: 'own', w2: 'spine-hook' }

  it('lists worries with nowhere to go, including stranded ones', () => {
    expect(unplacedWorries(worries, assignments, valid).map((item) => item.id)).toEqual(['w2', 'w3'])
  })

  it('counts only live placements', () => {
    expect(placedCount(worries, assignments, valid)).toBe(1)
  })
})

describe('pruneAssignments', () => {
  it('drops assignments for worries no longer in play', () => {
    expect(pruneAssignments({ w1: 'own', w2: 'proof' }, ['w2'])).toEqual({ w2: 'proof' })
  })
})
