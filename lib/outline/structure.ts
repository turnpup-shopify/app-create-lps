import { DEFAULT_FRAMEWORK, MECHANIC_IDS, findMechanic, type Framework } from './framework'
import { closeJob } from './goals'
import { reconcileOrder } from './order'
import { isLate, ownSectionId, placementOf, validSlotIds } from './placement'
import { HERO_TYPE_ID, TYPE_BY_ROLE, DEFAULT_TYPE_ID } from './section-types'
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
 * Levels are not set here. The hero gets them in `buildStructure`.
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
      typeId: TYPE_BY_ROLE[slot.key] ?? DEFAULT_TYPE_ID,
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
      typeId: TYPE_BY_ROLE[MECHANIC_IDS.ownEarly] ?? DEFAULT_TYPE_ID,
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
    typeId: TYPE_BY_ROLE[MECHANIC_IDS.proof] ?? DEFAULT_TYPE_ID,
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
      typeId: TYPE_BY_ROLE[MECHANIC_IDS.offer] ?? DEFAULT_TYPE_ID,
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
      typeId: TYPE_BY_ROLE[MECHANIC_IDS.ownLate] ?? DEFAULT_TYPE_ID,
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
      typeId: TYPE_BY_ROLE[MECHANIC_IDS.faq] ?? DEFAULT_TYPE_ID,
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
    typeId: TYPE_BY_ROLE[MECHANIC_IDS.close] ?? DEFAULT_TYPE_ID,
  })

  return sections
}

/**
 * The assembled outline.
 *
 * Exactly one H1, and it belongs to the hero rather than to whatever sits at
 * position zero. The hero is the first spine slot and is pinned there, so a
 * reorder can never hand the H1 to the close. Every other section is a single
 * H2. H3s are not sections at all; they come from a section type that repeats
 * items, and `heading-rule.ts` holds the whole invariant.
 */
export function buildStructure(input: BuildInput): Section[] {
  const base = baseSections(input)
  const byId = new Map(base.map((section) => [section.id, section]))
  const hero = base[0]?.id ?? ''
  const order = reconcileOrder(
    base.map((section) => section.id),
    input.order,
    hero,
  )

  return order.map((id) => {
    const section = byId.get(id)!
    const level: Level = id === hero ? 1 : 2
    const typeId = id === hero ? HERO_TYPE_ID : section.typeId
    return { ...section, level, typeId }
  })
}

/** The id of the section that owns the page's H1, or empty when there is none. */
export function heroId(sections: Section[]): string {
  return sections.find((section) => section.level === 1)?.id ?? ''
}

export function sectionIds(sections: Section[]): string[] {
  return sections.map((section) => section.id)
}
