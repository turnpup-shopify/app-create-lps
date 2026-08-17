import type { Headings, Section } from './types'

/**
 * A heading is written for a section in a position, holding a set of worries.
 * Change any of those and the heading may no longer argue where it sits.
 */
export type Signatures = Record<string, string>

export function sectionSignature(section: Section, index: number): string {
  const worries = section.worries.map((worry) => worry.id).sort().join('|')
  return [index, section.level, section.role, worries].join('~')
}

export function signatures(sections: Section[]): Signatures {
  const map: Signatures = {}
  sections.forEach((section, index) => {
    map[section.id] = sectionSignature(section, index)
  })
  return map
}

/**
 * How many sections drifted since the last heading pass. Never rewrites on its
 * own, it only reports.
 */
export function driftCount(sections: Section[], pass: Signatures | null | undefined, headings: Headings): number {
  if (!pass) return 0
  let drifted = 0
  sections.forEach((section, index) => {
    const before = pass[section.id]
    if (before === undefined) {
      drifted += 1
      return
    }
    if (before !== sectionSignature(section, index)) drifted += 1
    else if (!headings[section.id]) drifted += 1
  })
  return drifted
}

export function missingHeadings(sections: Section[], headings: Headings): number {
  return sections.filter((section) => !headings[section.id]).length
}
