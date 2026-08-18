/**
 * The page's heading rule, in one place.
 *
 *   One H1, and it belongs to the hero.
 *   Every other section is exactly one H2, and it comes first in that section.
 *   H3s only ever come from a section type that repeats items.
 *   No level is skipped, so an H3 never appears without its H2 above it.
 *
 * This is checked rather than trusted. A model writing copy will happily return
 * six items for a section type that takes none, and a broken heading tree is
 * invisible in the interface but obvious to a crawler.
 */

import { findSectionType, takesItems, type SectionType } from './section-types'
import type { Heading, Headings, Section } from './types'

export interface HeadingProblem {
  sectionId: string
  message: string
}

export function checkHeadingRule(
  sections: Section[],
  headings: Headings,
  types?: SectionType[],
): HeadingProblem[] {
  const problems: HeadingProblem[] = []

  const ones = sections.filter((section) => section.level === 1)
  if (sections.length > 0 && ones.length !== 1) {
    problems.push({
      sectionId: ones[0]?.id ?? sections[0].id,
      message:
        ones.length === 0
          ? 'No section holds the H1, so the page has no title.'
          : `${ones.length} sections hold an H1. Only the hero may.`,
    })
  }
  if (ones.length === 1 && sections[0]?.id !== ones[0].id) {
    problems.push({ sectionId: ones[0].id, message: 'The H1 is not the first section on the page.' })
  }

  for (const section of sections) {
    if (section.level === 3) {
      problems.push({ sectionId: section.id, message: 'A section cannot be an H3. Only an item can.' })
    }

    const written: Heading | undefined = headings[section.id]
    if (!written) continue

    const type = findSectionType(section.typeId, types)
    const count = written.items.length

    if (count > 0 && !takesItems(type)) {
      problems.push({
        sectionId: section.id,
        message: `Has ${count} items but ${type.label} takes none, so those H3s have nowhere to render.`,
      })
      continue
    }

    if (takesItems(type) && count > 0 && (count < type.minItems || count > type.maxItems)) {
      problems.push({
        sectionId: section.id,
        message: `Has ${count} items. ${type.label} takes ${type.minItems} to ${type.maxItems}.`,
      })
    }

    if (count > 0 && !written.heading.trim()) {
      problems.push({
        sectionId: section.id,
        message: 'Has items but no heading of its own, which would leave an H3 with no H2 above it.',
      })
    }

    const blank = written.items.filter((item) => !item.heading.trim()).length
    if (blank > 0) {
      problems.push({
        sectionId: section.id,
        message: `${blank === 1 ? 'One item has' : `${blank} items have`} no heading.`,
      })
    }
  }

  return problems
}

/** True when the outline satisfies the rule. */
export function followsHeadingRule(sections: Section[], headings: Headings, types?: SectionType[]): boolean {
  return checkHeadingRule(sections, headings, types).length === 0
}
