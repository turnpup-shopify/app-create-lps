import { describe, expect, it } from 'vitest'
import { toMarkdown } from '@/lib/outline/markdown'
import { buildStructure } from '@/lib/outline/structure'
import { emptyHeading, type Headings } from '@/lib/outline/types'
import { worry } from './helpers'

const sections = buildStructure({
  spine: 'pas',
  goal: 'buy',
  worries: [worry('w1', { label: 'Feels expensive' })],
  assignments: { w1: 'proof' },
})

const headings: Headings = Object.fromEntries(
  sections.map((section) => [section.id, { ...emptyHeading(), heading: `Heading for ${section.role}`, note: `Note for ${section.role}` }]),
)

describe('toMarkdown', () => {
  it('keeps heading levels intact', () => {
    const markdown = toMarkdown({ sections, headings })
    const lines = markdown.split('\n').filter((line) => line.startsWith('#'))
    expect(lines[0].startsWith('# ')).toBe(true)
    expect(lines.slice(1).every((line) => line.startsWith('## '))).toBe(true)
    expect(lines).toHaveLength(sections.length)
  })

  it('includes the note and the worries a section handles', () => {
    const markdown = toMarkdown({ sections, headings })
    expect(markdown).toContain('Note for Proof')
    expect(markdown).toContain('Handles Feels expensive.')
  })

  it('falls back to the role and the job when no heading is written', () => {
    const markdown = toMarkdown({ sections, headings: {} })
    expect(markdown).toContain('[Problem]')
    expect(markdown).toContain('Name the pain in their words.')
  })

  it('emits nothing but headings in headings only mode', () => {
    const markdown = toMarkdown({ sections, headings, headingsOnly: true })
    const lines = markdown.split('\n').filter((line) => line.trim().length > 0)
    expect(lines).toHaveLength(sections.length)
    expect(lines.every((line) => line.startsWith('# ') || line.startsWith('## '))).toBe(true)
    expect(markdown).not.toContain('Note for Proof')
    expect(markdown).not.toContain('Handles')
  })
})
