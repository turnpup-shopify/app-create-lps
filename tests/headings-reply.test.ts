import { describe, expect, it } from 'vitest'
import { extractArray, parseHeadingsReply } from '@/lib/outline/headings-reply'
import { hasForbidden } from '@/lib/outline/scrub'

const known = new Set(['spine-problem', 'proof', 'close'])

const reply = (entries: unknown) => JSON.stringify(entries)

describe('extractArray', () => {
  it('takes a bare array', () => {
    expect(extractArray('[1,2]')).toBe('[1,2]')
  })

  it('strips markdown fences', () => {
    expect(extractArray('```json\n[1,2]\n```')).toBe('[1,2]')
  })

  it('ignores prose either side', () => {
    expect(extractArray('Here you go:\n[1,2]\nHope that helps.')).toBe('[1,2]')
  })

  it('leaves text with no array alone', () => {
    expect(extractArray('I cannot do that')).toBe('I cannot do that')
  })
})

describe('parseHeadingsReply', () => {
  it('reads a clean reply', () => {
    const text = reply([{ id: 'proof', heading: 'Brass that outlives the cabinet', note: 'Show the load test.' }])
    expect(parseHeadingsReply(text, known)).toEqual([
      { id: 'proof', heading: 'Brass that outlives the cabinet', note: 'Show the load test.' },
    ])
  })

  it('reads a reply wrapped in fences and prose', () => {
    const text = '```json\n' + reply([{ id: 'proof', heading: 'A heading', note: 'A note' }]) + '\n```'
    expect(parseHeadingsReply(text, known)).toHaveLength(1)
  })

  it('enforces the punctuation rule rather than trusting it', () => {
    const text = reply([
      { id: 'proof', heading: 'Forty-five days; no questions', note: 'Say this: it is covered' },
    ])
    const headings = parseHeadingsReply(text, known)!
    expect(hasForbidden(headings[0].heading)).toBe(false)
    expect(hasForbidden(headings[0].note)).toBe(false)
    expect(headings[0].heading).toBe('Forty five days no questions')
    expect(headings[0].note).toBe('Say this it is covered')
  })

  it('drops ids the structure does not have', () => {
    const text = reply([
      { id: 'proof', heading: 'A heading', note: 'A note' },
      { id: 'invented', heading: 'A heading', note: 'A note' },
    ])
    expect(parseHeadingsReply(text, known)!.map((entry) => entry.id)).toEqual(['proof'])
  })

  it('keeps the first of a duplicated id', () => {
    const text = reply([
      { id: 'proof', heading: 'First', note: 'A note' },
      { id: 'proof', heading: 'Second', note: 'A note' },
    ])
    const headings = parseHeadingsReply(text, known)!
    expect(headings).toHaveLength(1)
    expect(headings[0].heading).toBe('First')
  })

  it('returns null on invalid JSON so the caller can retry', () => {
    expect(parseHeadingsReply('not json at all', known)).toBeNull()
    expect(parseHeadingsReply('[{"id":', known)).toBeNull()
  })

  it('returns null when the shape is wrong', () => {
    expect(parseHeadingsReply(reply([{ id: 'proof' }]), known)).toBeNull()
    expect(parseHeadingsReply(reply({ proof: 'a heading' }), known)).toBeNull()
    expect(parseHeadingsReply(reply([]), known)).toBeNull()
  })

  it('returns null when nothing usable survives', () => {
    expect(parseHeadingsReply(reply([{ id: 'invented', heading: 'A', note: 'B' }]), known)).toBeNull()
    // A heading made only of forbidden marks scrubs away to nothing.
    expect(parseHeadingsReply(reply([{ id: 'proof', heading: '---', note: 'B' }]), known)).toBeNull()
  })
})
