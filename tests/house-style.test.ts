import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { AWARENESS } from '@/lib/outline/awareness'
import { GOALS, closeJob } from '@/lib/outline/goals'
import { hasForbidden } from '@/lib/outline/scrub'
import { SPINE_LIST } from '@/lib/outline/spines'
import { baseSections } from '@/lib/outline/structure'
import { worry } from './helpers'

/**
 * No hyphens, dashes, semicolons or colons anywhere the writer reads. These are
 * the strings the domain owns, so they are checkable.
 */
describe('house style', () => {
  it('keeps awareness stages clean', () => {
    for (const stage of AWARENESS) {
      for (const text of [stage.label, stage.lead, stage.why]) {
        expect(hasForbidden(text), text).toBe(false)
      }
    }
  })

  it('keeps spine names, notes and jobs clean', () => {
    for (const spine of SPINE_LIST) {
      for (const text of [spine.name, spine.note]) {
        expect(hasForbidden(text), text).toBe(false)
      }
      for (const slot of spine.slots) {
        expect(hasForbidden(slot.role), slot.role).toBe(false)
        expect(hasForbidden(slot.job), slot.job).toBe(false)
      }
    }
  })

  it('keeps goal labels and close jobs clean', () => {
    for (const goal of GOALS) {
      expect(hasForbidden(goal.label), goal.label).toBe(false)
      expect(hasForbidden(closeJob(goal.id)), closeJob(goal.id)).toBe(false)
    }
  })

  it('keeps every assembled section role and job clean', () => {
    for (const spine of SPINE_LIST) {
      const sections = baseSections({
        spine: spine.id,
        goal: 'buy',
        worries: [worry('early', { tags: 'trust' }), worry('late', { tags: 'price' }), worry('asked')],
        assignments: { early: 'own', late: 'own', asked: 'faq' },
      })
      for (const section of sections) {
        expect(hasForbidden(section.role), section.role).toBe(false)
        expect(hasForbidden(section.job), section.job).toBe(false)
      }
    }
  })

  it('states the punctuation rule in the copy prompt', () => {
    const prompt = fs.readFileSync(path.join(process.cwd(), 'lib', 'prompts', 'copy.md'), 'utf8')
    expect(prompt).toContain('Never use hyphens, dashes, semicolons or colons')
  })

  it('says the punctuation rule stops at the body, so nobody reinstates it by accident', () => {
    // The rule is deliberately not applied to prose, where a colon is sometimes
    // the right mark. `reconcileCopy` matches this, and both should move together.
    const prompt = fs.readFileSync(path.join(process.cwd(), 'lib', 'prompts', 'copy.md'), 'utf8')
    expect(prompt).toContain('does not extend to the body')
  })

  it('tells the model that items are siblings rather than new sections', () => {
    const prompt = fs.readFileSync(path.join(process.cwd(), 'lib', 'prompts', 'copy.md'), 'utf8')
    expect(prompt).toContain('not a second layer of sections')
  })
})
