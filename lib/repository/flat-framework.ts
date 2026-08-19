/**
 * The whole framework in one flat tab, keyed by a `type` column.
 *
 * Six named tabs are correct and tedious. This reads the same six slices out of
 * a single table, the way the content rows already work, so a sheet can hold
 * everything in one place. Sparse columns are the cost, and a writer keeping one
 * tab rather than seven is the benefit.
 */

import type { Row } from './csv'
import { cell } from './csv'
import type { FrameworkRows } from './framework-tabs'

/** Which slice a row belongs to. Singular and plural both read. */
const TYPES: Record<string, keyof FrameworkRows> = {
  awareness: 'awareness',
  stage: 'awareness',
  stages: 'awareness',
  spine: 'spines',
  spines: 'spines',
  slot: 'slots',
  slots: 'slots',
  goal: 'goals',
  goals: 'goals',
  section: 'sections',
  sections: 'sections',
  setting: 'settings',
  settings: 'settings',
}

/** True when a row is framework rather than content. */
export function isFrameworkRow(row: Row): boolean {
  return TYPES[cell(row, 'type').toLowerCase()] !== undefined
}

/**
 * Regroup a flat table into the shape the tab parsers expect.
 *
 * Columns are shared where the meaning is the same, so `label` carries a stage
 * label, a spine name and a goal label, and `job` carries a slot job, a section
 * job and a close job. That keeps the table twelve columns wide rather than
 * twenty, and each slice still sees the names its own parser looks for.
 */
export function frameworkRowsFromFlat(rows: Row[]): FrameworkRows {
  const sets: Required<FrameworkRows> = {
    awareness: [],
    spines: [],
    slots: [],
    goals: [],
    sections: [],
    settings: [],
  }

  for (const row of rows) {
    const slice = TYPES[cell(row, 'type').toLowerCase()]
    if (!slice) continue

    const id = cell(row, 'id')
    const label = cell(row, 'label')
    const job = cell(row, 'job', 'close job')
    const role = cell(row, 'role')
    const note = cell(row, 'note')

    if (slice === 'awareness') {
      sets.awareness.push({ id, label, lead: cell(row, 'lead'), why: cell(row, 'why'), spine: cell(row, 'spine') })
    } else if (slice === 'spines') {
      // A spine's name lives in `label`, so one column serves every slice.
      sets.spines.push({ id, name: cell(row, 'name') || label, note })
    } else if (slice === 'slots') {
      sets.slots.push({
        spine: cell(row, 'spine'),
        key: cell(row, 'key'),
        position: cell(row, 'position'),
        role,
        job,
      })
    } else if (slice === 'goals') {
      sets.goals.push({ id, label, 'close job': job })
    } else if (slice === 'sections') {
      sets.sections.push({ id, role, job })
    } else {
      sets.settings.push({ key: cell(row, 'key') || id || label, value: cell(row, 'value') || job })
    }
  }

  return sets
}

/** True when a flat table carries any framework row at all. */
export function hasFrameworkRows(rows: Row[]): boolean {
  return rows.some(isFrameworkRow)
}
