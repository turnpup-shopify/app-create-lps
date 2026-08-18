/**
 * Reconciling written copy against the section types that have to render it.
 *
 * A model writing a page will sometimes return six items for a type that takes
 * none, or four for a type capped at three, and a page built from that breaks in
 * the theme rather than in the app. So the reply is clamped here, in a pure
 * function, rather than trusted.
 *
 * The punctuation rule divides on one line: body copy is prose and keeps its
 * normal punctuation, because a colon there is sometimes simply the right mark.
 * Everything else on a section is a label that gets scanned rather than read, so
 * the heading, the note, the eyebrow, the call to action, the support line and
 * every item heading are all held to the rule.
 */

import { findSectionType, takesItems, type SectionType } from './section-types'
import { scrub } from './scrub'
import type { Heading, HeadingItem, Headings, Section } from './types'

/** One section as the model returns it. Every field present, some empty. */
export interface WrittenCopy {
  id: string
  heading: string
  note: string
  eyebrow: string
  body: string
  support: string
  cta: string
  items: HeadingItem[]
}

export interface CopyResult {
  headings: Headings
  /** What had to be corrected, worth showing rather than swallowing. */
  corrections: string[]
}

const clean = (value: string): string => scrub(value ?? '')
const prose = (value: string): string => (value ?? '').trim()

/**
 * Turn a reply into headings, keeping only sections the outline has and holding
 * every section to what its type can render.
 */
export function reconcileCopy(
  sections: Section[],
  written: WrittenCopy[],
  types?: SectionType[],
): CopyResult {
  const byId = new Map(written.map((entry) => [entry.id, entry]))
  const headings: Headings = {}
  const corrections: string[] = []

  for (const section of sections) {
    const entry = byId.get(section.id)
    if (!entry) continue

    const type = findSectionType(section.typeId, types)
    const heading = clean(entry.heading)
    if (!heading) {
      corrections.push(`${section.role} came back with no heading, so it kept its placeholder.`)
      continue
    }

    let items: HeadingItem[] = (entry.items ?? [])
      .map((item) => ({ heading: clean(item.heading), body: prose(item.body) }))
      .filter((item) => item.heading.length > 0)

    if (!takesItems(type)) {
      if (items.length > 0) {
        corrections.push(`${section.role} came back with items, and ${type.label} renders none, so they were dropped.`)
      }
      items = []
    } else if (items.length > type.maxItems) {
      corrections.push(
        `${section.role} came back with ${items.length} items, and ${type.label} takes ${type.maxItems}, so the last ${
          items.length - type.maxItems
        } were dropped.`,
      )
      items = items.slice(0, type.maxItems)
    } else if (items.length > 0 && items.length < type.minItems) {
      corrections.push(
        `${section.role} came back with ${items.length} items and ${type.label} wants at least ${type.minItems}.`,
      )
    }

    const slot = (name: Parameters<typeof type.slots.includes>[0], value: string) =>
      type.slots.includes(name) ? prose(value) : ''

    const result: Heading = {
      heading,
      note: clean(entry.note),
      eyebrow: clean(slot('eyebrow', entry.eyebrow)),
      // The only prose on a section, and the only field the rule spares.
      body: slot('body', entry.body),
      support: clean(slot('support', entry.support)),
      cta: clean(slot('cta', entry.cta)),
      items,
    }

    headings[section.id] = result
  }

  return { headings, corrections }
}

/** True when every section in the outline got a heading. */
export function everySectionWritten(sections: Section[], headings: Headings): boolean {
  return sections.every((section) => Boolean(headings[section.id]?.heading))
}
