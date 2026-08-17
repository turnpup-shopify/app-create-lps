import { DEFAULT_FRAMEWORK, DEFAULT_LATE_TAGS, type Framework } from './framework'
import { findSpine, spineSlotId } from './spines'
import type { Assignments, SlotId, Worry } from './types'

/** Kept as a named export so the built in list stays greppable. */
export const LATE_TAGS = DEFAULT_LATE_TAGS

export function isLate(worry: Pick<Worry, 'tags'>, lateTags: string[] = DEFAULT_LATE_TAGS): boolean {
  const tags = (worry.tags ?? '').toLowerCase()
  return lateTags.some((tag) => tags.includes(tag.toLowerCase()))
}

export const ownSectionId = (worryId: string) => `own-${worryId}`

/**
 * Every slot a worry can legally sit in for this spine and goal.
 * A worry pointing anywhere else is unplaced, which happens when the writer
 * overrides the spine after placing worries.
 */
export function validSlotIds({
  spine,
  goal,
  framework = DEFAULT_FRAMEWORK,
}: {
  spine: string
  goal?: string
  framework?: Framework
}): Set<SlotId> {
  void goal
  const resolved = findSpine(spine, framework.spines)
  const ids = new Set<SlotId>(resolved.slots.map((slot) => spineSlotId(slot.key)))
  ids.add('proof')
  ids.add('close')
  ids.add('faq')
  ids.add('own')
  // The offer is already spine slot zero when the spine is offer led.
  if (resolved.id !== 'offer') ids.add('offer')
  return ids
}

/** The slot a worry actually resolves to, or null when it is unplaced. */
export function placementOf(worryId: string, assignments: Assignments, valid: Set<SlotId>): SlotId | null {
  const slot = assignments[worryId]
  if (!slot) return null
  return valid.has(slot) ? slot : null
}

export function unplacedWorries(worries: Worry[], assignments: Assignments, valid: Set<SlotId>): Worry[] {
  return worries.filter((worry) => placementOf(worry.id, assignments, valid) === null)
}

export function placedCount(worries: Worry[], assignments: Assignments, valid: Set<SlotId>): number {
  return worries.filter((worry) => placementOf(worry.id, assignments, valid) !== null).length
}

/**
 * Assigning a worry to the section it already sits in removes it.
 * Assigning it somewhere new moves it.
 */
export function assignWorry(assignments: Assignments, worryId: string, slotId: SlotId): Assignments {
  const next = { ...assignments }
  if (next[worryId] === slotId) delete next[worryId]
  else next[worryId] = slotId
  return next
}

export function unassignWorry(assignments: Assignments, worryId: string): Assignments {
  const next = { ...assignments }
  delete next[worryId]
  return next
}

/** Drop assignments for worries that are no longer in play. */
export function pruneAssignments(assignments: Assignments, worryIds: string[]): Assignments {
  const live = new Set(worryIds)
  const next: Assignments = {}
  for (const [worryId, slotId] of Object.entries(assignments)) {
    if (live.has(worryId)) next[worryId] = slotId
  }
  return next
}
