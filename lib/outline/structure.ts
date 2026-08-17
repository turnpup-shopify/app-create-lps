import { closeJob } from './goals'
import { reconcileOrder } from './order'
import { isLate, ownSectionId, placementOf, validSlotIds } from './placement'
import { findSpine, spineSlotId, type SpineId } from './spines'
import type { Assignments, Level, Section, SlotId, Worry } from './types'

export interface BuildInput {
  spine: SpineId | string
  goal: string
  /** The worries in play. Selection happens in the brief, placement happens here. */
  worries: Worry[]
  assignments: Assignments
  /** Manual order as an array of section ids. Optional. */
  order?: string[] | null
}

/**
 * The base order, before any manual reordering.
 *
 *  1. Every spine slot in order.
 *  2. Own section worries whose tags do not match the late list.
 *  3. Proof.
 *  4. The offer, unless the spine is offer led.
 *  5. Own section worries whose tags match the late list.
 *  6. Questions, only when at least one worry is assigned to it.
 *  7. Close.
 *
 * Levels are not set here. They follow from the final position.
 */
export function baseSections({ spine, goal, worries, assignments }: Omit<BuildInput, 'order'>): Section[] {
  const resolved = findSpine(spine)
  const valid = validSlotIds({ spine: resolved.id, goal })

  const placed = (slotId: SlotId) =>
    worries.filter((worry) => placementOf(worry.id, assignments, valid) === slotId)

  const own = placed('own')
  const sections: Section[] = []

  for (const slot of resolved.slots) {
    const id = spineSlotId(slot.key)
    sections.push({
      id,
      level: 2,
      kind: 'spine',
      role: slot.role,
      job: slot.job,
      worries: placed(id),
    })
  }

  for (const worry of own.filter((candidate) => !isLate(candidate))) {
    sections.push({
      id: ownSectionId(worry.id),
      level: 2,
      kind: 'objection',
      role: 'Clears a worry',
      job: 'Answer it before they scroll past.',
      worries: [worry],
    })
  }

  sections.push({
    id: 'proof',
    level: 2,
    kind: 'mechanic',
    role: 'Proof',
    job: 'Evidence a skeptic would accept. Numbers, names, or a demonstration.',
    worries: placed('proof'),
  })

  if (resolved.id !== 'offer') {
    sections.push({
      id: 'offer',
      level: 2,
      kind: 'mechanic',
      role: 'The offer',
      job: 'What they get, what it costs, what happens next.',
      worries: placed('offer'),
    })
  }

  for (const worry of own.filter(isLate)) {
    sections.push({
      id: ownSectionId(worry.id),
      level: 2,
      kind: 'objection',
      role: 'Removes risk',
      job: 'Sits after the price so the worry never leaves the page.',
      worries: [worry],
    })
  }

  const questions = placed('faq')
  if (questions.length > 0) {
    sections.push({
      id: 'faq',
      level: 2,
      kind: 'mechanic',
      role: 'Questions',
      job: 'On the record without stealing a section.',
      worries: questions,
    })
  }

  sections.push({
    id: 'close',
    level: 2,
    kind: 'mechanic',
    role: 'Close',
    job: closeJob(goal),
    worries: placed('close'),
  })

  return sections
}

/**
 * The assembled outline. Index zero is the H1, everything after is an H2.
 */
export function buildStructure(input: BuildInput): Section[] {
  const base = baseSections(input)
  const byId = new Map(base.map((section) => [section.id, section]))
  const order = reconcileOrder(
    base.map((section) => section.id),
    input.order,
  )

  return order.map((id, index) => {
    const section = byId.get(id)!
    const level: Level = index === 0 ? 1 : 2
    return { ...section, level }
  })
}

export function sectionIds(sections: Section[]): string[] {
  return sections.map((section) => section.id)
}
