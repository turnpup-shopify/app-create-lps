import { findSpine, spineSlotId, type SpineId } from './spines'
import type { Assignments, SlotId, Worry } from './types'

/**
 * Money and risk worries sit after the price. Everything else sits before it.
 * Matched on substring, case insensitive.
 */
export const LATE_TAGS = ['price', 'risk', 'money', 'guarantee', 'refund', 'shipping', 'warranty']

export function isLate(worry: Pick<Worry, 'tags'>): boolean {
  const tags = (worry.tags ?? '').toLowerCase()
  return LATE_TAGS.some((tag) => tags.includes(tag))
}

export const ownSectionId = (worryId: string) => `own-${worryId}`

/**
 * Every slot a worry can legally sit in for this spine and goal.
 * A worry pointing anywhere else is unplaced, which happens when the writer
 * overrides the spine after placing worries.
 */
export function validSlotIds({ spine, goal }: { spine: SpineId | string; goal?: string }): Set<SlotId> {
  void goal
  const resolved = findSpine(spine)
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
