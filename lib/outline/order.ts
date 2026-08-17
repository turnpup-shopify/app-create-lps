/**
 * The base order is a starting point, not a rule. The writer can drag any
 * section to any position and the stored order survives a save and reload.
 */

/**
 * Keep the stored order for sections that still exist, drop ids that no longer
 * exist, and splice new sections in at their base position.
 *
 * Base position means "immediately after the section it follows in the base
 * order", not an absolute index. That matters once the writer has reordered:
 * give a worry its own section after dragging the close to the top, and the new
 * section lands where it belongs relative to its neighbours rather than in the
 * middle of the spine slots.
 */
export function reconcileOrder(baseIds: string[], stored: string[] | undefined | null): string[] {
  const base = new Set(baseIds)
  const seen = new Set<string>()
  const result: string[] = []

  for (const id of stored ?? []) {
    if (!base.has(id) || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }

  // Walk the base order, tracking where the previous base section ended up.
  let cursor = 0
  for (const id of baseIds) {
    const at = result.indexOf(id)
    if (at !== -1) {
      cursor = at + 1
      continue
    }
    result.splice(cursor, 0, id)
    cursor += 1
  }

  return result
}

/**
 * Move one section to a new position. Position zero is always the H1, so
 * dragging a section to the top makes it the H1 and demotes the previous one.
 */
export function moveSection(order: string[], id: string, toIndex: number): string[] {
  const from = order.indexOf(id)
  if (from === -1) return [...order]
  const next = [...order]
  next.splice(from, 1)
  const target = Math.max(0, Math.min(toIndex, next.length))
  next.splice(target, 0, id)
  return next
}

/** Move a section one step up or down. This is the keyboard path. */
export function nudgeSection(order: string[], id: string, direction: -1 | 1): string[] {
  const from = order.indexOf(id)
  if (from === -1) return [...order]
  return moveSection(order, id, from + direction)
}
