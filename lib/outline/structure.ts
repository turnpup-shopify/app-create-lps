import { DEFAULT_FRAMEWORK, MECHANIC_IDS, findMechanic, type Framework } from './framework'
import { closeJob } from './goals'
import { reconcileOrder } from './order'
import { isLate, ownSectionId, placementOf, validSlotIds } from './placement'
import { findSpine, spineSlotId } from './spines'
import type { Assignments, Level, Section, SlotId, Worry } from './types'

export interface BuildInput {
  spine: string
  goal: string
  /** The worries in play. Selection happens in the brief, placement happens here. */
  worries: Worry[]
  assignments: Assignments
  /** Manual order as an array of section ids. Optional. */
  order?: string[] | null
  /** The editorial layer. Defaults to the built in one. */
  framework?: Framework
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
 * The sequence is code. Every role and job in it comes from the framework.
 * Levels are not set here. They follow from the final position.
 */
export function baseSections({
  spine,
  goal,
  worries,
  assignments,
  framework = DEFAULT_FRAMEWORK,
}: Omit<BuildInput, 'order'>): Section[] {
  const resolved = findSpine(spine, framework.spines)
  const valid = validSlotIds({ spine: resolved.id, goal, framework })

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

  const early = findMechanic(MECHANIC_IDS.ownEarly, framework)
  for (const worry of own.filter((candidate) => !isLate(candidate, framework.lateTags))) {
    sections.push({
      id: ownSectionId(worry.id),
      level: 2,
      kind: 'objection',
      role: early.role,
      job: early.job,
      worries: [worry],
    })
  }

  const proof = findMechanic(MECHANIC_IDS.proof, framework)
  sections.push({
    id: MECHANIC_IDS.proof,
    level: 2,
    kind: 'mechanic',
    role: proof.role,
    job: proof.job,
    worries: placed(MECHANIC_IDS.proof),
  })

  if (resolved.id !== 'offer') {
    const offer = findMechanic(MECHANIC_IDS.offer, framework)
    sections.push({
      id: MECHANIC_IDS.offer,
      level: 2,
      kind: 'mechanic',
      role: offer.role,
      job: offer.job,
      worries: placed(MECHANIC_IDS.offer),
    })
  }

  const late = findMechanic(MECHANIC_IDS.ownLate, framework)
  for (const worry of own.filter((candidate) => isLate(candidate, framework.lateTags))) {
    sections.push({
      id: ownSectionId(worry.id),
      level: 2,
      kind: 'objection',
      role: late.role,
      job: late.job,
      worries: [worry],
    })
  }

  const questions = placed(MECHANIC_IDS.faq)
  if (questions.length > 0) {
    const faq = findMechanic(MECHANIC_IDS.faq, framework)
    sections.push({
      id: MECHANIC_IDS.faq,
      level: 2,
      kind: 'mechanic',
      role: faq.role,
      job: faq.job,
      worries: questions,
    })
  }

  const close = findMechanic(MECHANIC_IDS.close, framework)
  sections.push({
    id: MECHANIC_IDS.close,
    level: 2,
    kind: 'mechanic',
    role: close.role,
    // The page goal owns the close job. A Sections tab cannot override it.
    job: closeJob(goal, framework.goals),
    worries: placed(MECHANIC_IDS.close),
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
