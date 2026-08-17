import { describe, expect, it } from 'vitest'
import { moveSection, nudgeSection, reconcileOrder } from '@/lib/outline/order'

describe('reconcileOrder', () => {
  it('falls back to the base order when nothing is stored', () => {
    expect(reconcileOrder(['a', 'b', 'c'], undefined)).toEqual(['a', 'b', 'c'])
    expect(reconcileOrder(['a', 'b', 'c'], [])).toEqual(['a', 'b', 'c'])
  })

  it('keeps the stored order for sections that still exist', () => {
    expect(reconcileOrder(['a', 'b', 'c'], ['c', 'a', 'b'])).toEqual(['c', 'a', 'b'])
  })

  it('drops ids that no longer exist', () => {
    expect(reconcileOrder(['a', 'b'], ['b', 'gone', 'a'])).toEqual(['b', 'a'])
  })

  it('splices a new section in after the section it follows in the base order', () => {
    expect(reconcileOrder(['a', 'new', 'b'], ['b', 'a'])).toEqual(['b', 'a', 'new'])
    expect(reconcileOrder(['a', 'b', 'last'], ['b', 'a'])).toEqual(['b', 'last', 'a'])
  })

  it('puts a new section with nothing before it at the front', () => {
    expect(reconcileOrder(['first', 'a', 'b'], ['b', 'a'])).toEqual(['first', 'b', 'a'])
  })

  it('keeps a new section next to its neighbours after a reorder', () => {
    // The writer dragged the close to the top, then gave a worry its own
    // section. It belongs after the spine slots, not among them.
    const base = ['s1', 's2', 's3', 'own', 'proof', 'close']
    const stored = ['close', 's1', 's2', 's3', 'proof']
    expect(reconcileOrder(base, stored)).toEqual(['close', 's1', 's2', 's3', 'own', 'proof'])
  })

  it('keeps several new sections in their base order', () => {
    expect(reconcileOrder(['a', 'n1', 'n2', 'b'], ['b', 'a'])).toEqual(['b', 'a', 'n1', 'n2'])
  })

  it('ignores duplicates in the stored order', () => {
    expect(reconcileOrder(['a', 'b'], ['a', 'a', 'b'])).toEqual(['a', 'b'])
  })

  it('returns every base id exactly once', () => {
    const base = ['a', 'b', 'c', 'd', 'e']
    const result = reconcileOrder(base, ['e', 'zz', 'c'])
    expect([...result].sort()).toEqual([...base].sort())
  })
})

describe('moveSection', () => {
  it('moves a section to the requested position', () => {
    expect(moveSection(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b'])
    expect(moveSection(['a', 'b', 'c'], 'a', 2)).toEqual(['b', 'c', 'a'])
  })

  it('clamps out of range positions', () => {
    expect(moveSection(['a', 'b', 'c'], 'a', -5)).toEqual(['a', 'b', 'c'])
    expect(moveSection(['a', 'b', 'c'], 'a', 99)).toEqual(['b', 'c', 'a'])
  })

  it('leaves the order alone for an unknown id', () => {
    expect(moveSection(['a', 'b'], 'zz', 0)).toEqual(['a', 'b'])
  })
})

describe('nudgeSection', () => {
  it('moves one step at a time, which is the keyboard path', () => {
    expect(nudgeSection(['a', 'b', 'c'], 'b', -1)).toEqual(['b', 'a', 'c'])
    expect(nudgeSection(['a', 'b', 'c'], 'b', 1)).toEqual(['a', 'c', 'b'])
  })

  it('stops at the ends', () => {
    expect(nudgeSection(['a', 'b'], 'a', -1)).toEqual(['a', 'b'])
    expect(nudgeSection(['a', 'b'], 'b', 1)).toEqual(['a', 'b'])
  })
})
