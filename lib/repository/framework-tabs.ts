import type { AwarenessStage } from '@/lib/outline/awareness'
import {
  ALL_BUILT_IN,
  DEFAULT_FRAMEWORK,
  DEFAULT_LATE_TAGS,
  DEFAULT_SECTIONS,
  REQUIRED_MECHANIC_IDS,
  type Framework,
  type FrameworkSources,
  type MechanicSection,
} from '@/lib/outline/framework'
import type { Goal } from '@/lib/outline/goals'
import type { Slot, Spine } from '@/lib/outline/spines'
import { cell, isBlank, readRows, type Row } from './csv'
import { TAB_NAMES } from './sheet'

/** A problem worth showing the writer, tied to the tab it came from. */
export interface TabProblem {
  tab: string
  message: string
}

export interface FrameworkTabs {
  awareness?: string | null
  spines?: string | null
  slots?: string | null
  goals?: string | null
  sections?: string | null
  settings?: string | null
}

/** The same six slices, already read into rows. */
export interface FrameworkRows {
  awareness?: Row[]
  spines?: Row[]
  slots?: Row[]
  goals?: Row[]
  sections?: Row[]
  settings?: Row[]
}

export interface FrameworkResult {
  framework: Framework
  sources: FrameworkSources
  problems: TabProblem[]
}

const rowsOf = (text: string | null | undefined): Row[] =>
  text ? readRows(text).filter((row) => !isBlank(row)) : []

/**
 * Names the columns the tab actually has.
 *
 * Without this a wrong header name and an empty cell produce the same sentence,
 * and the reader has no way to tell which they are looking at. Naming what was
 * found turns the guess into a comparison.
 */
function found(row: Row | undefined): string {
  const names = Object.keys(row ?? {}).filter((name) => name.length > 0)
  if (names.length === 0) return ' The tab appears to have no header row.'
  return ` The columns found were ${names.join(', ')}.`
}

/* ------------------------------------------------------------------ */
/* Per tab                                                             */
/* ------------------------------------------------------------------ */

function parseAwareness(rows: Row[], problems: TabProblem[]): AwarenessStage[] | null {
  const stages: AwarenessStage[] = []
  rows.forEach((row, index) => {
    // When a flat framework table lands in the Awareness tab, non-awareness
    // rows (spine, slot, goal, ...) come along for the ride. Skip them
    // silently so only the real awareness rows are validated.
    const type = cell(row, 'type').toLowerCase()
    if (type && type !== 'awareness' && type !== 'stage' && type !== 'stages') return

    const id = cell(row, 'id')
    const label = cell(row, 'label')
    const lead = cell(row, 'lead')
    const spine = cell(row, 'spine')
    if (!id || !label || !lead || !spine) {
      problems.push({
        tab: TAB_NAMES.awareness,
        message: `Row ${index + 2} needs an id, a label, a lead and a spine.${found(row)}`,
      })
      return
    }
    stages.push({ id, label, lead, why: cell(row, 'why'), spine })
  })
  return stages.length > 0 ? stages : null
}

function parseSpines(spineRows: Row[], slotRows: Row[], problems: TabProblem[]): Spine[] | null {
  const slotsBySpine = new Map<string, { slot: Slot; position: number; index: number }[]>()

  slotRows.forEach((row, index) => {
    const spine = cell(row, 'spine')
    const key = cell(row, 'key')
    const role = cell(row, 'role')
    if (!spine || !key || !role) {
      problems.push({
        tab: TAB_NAMES.slots,
        message: `Row ${index + 2} needs a spine, a key and a role.${found(row)}`,
      })
      return
    }
    const raw = cell(row, 'position')
    const position = Number.parseFloat(raw)
    const list = slotsBySpine.get(spine) ?? []
    list.push({
      slot: { key, role, job: cell(row, 'job') },
      position: Number.isFinite(position) ? position : Number.POSITIVE_INFINITY,
      index,
    })
    slotsBySpine.set(spine, list)
  })

  const spines: Spine[] = []
  spineRows.forEach((row, index) => {
    const id = cell(row, 'id')
    const name = cell(row, 'name')
    if (!id || !name) {
      problems.push({
        tab: TAB_NAMES.spines,
        message: `Row ${index + 2} needs an id and a name.${found(row)}`,
      })
      return
    }
    // Position orders the slots. Rows with no position keep their sheet order,
    // which means sorting the tab by hand cannot silently rewrite a spine.
    const slots = (slotsBySpine.get(id) ?? [])
      .slice()
      .sort((a, b) => (a.position === b.position ? a.index - b.index : a.position - b.position))
      .map((entry) => entry.slot)
    spines.push({ id, name, note: cell(row, 'note'), slots })
  })

  return spines.length > 0 ? spines : null
}

function parseGoals(rows: Row[], problems: TabProblem[]): Goal[] | null {
  const goals: Goal[] = []
  rows.forEach((row, index) => {
    const id = cell(row, 'id')
    const label = cell(row, 'label')
    const close = cell(row, 'close job', 'close')
    if (!id || !label || !close) {
      problems.push({
        tab: TAB_NAMES.goals,
        message: `Row ${index + 2} needs an id, a label and a close job.${found(row)}`,
      })
      return
    }
    goals.push({ id, label, close })
  })
  return goals.length > 0 ? goals : null
}

function parseSections(rows: Row[], problems: TabProblem[]): MechanicSection[] | null {
  const sections: MechanicSection[] = []
  rows.forEach((row, index) => {
    const id = cell(row, 'id')
    const role = cell(row, 'role')
    if (!id || !role) {
      problems.push({
        tab: TAB_NAMES.sections,
        message: `Row ${index + 2} needs an id and a role.${found(row)}`,
      })
      return
    }
    sections.push({ id, role, job: cell(row, 'job') })
  })
  return sections.length > 0 ? sections : null
}

function parseSettings(rows: Row[]): { lateTags: string[] } | null {
  let lateTags: string[] | null = null
  for (const row of rows) {
    const key = cell(row, 'key').toLowerCase()
    const value = cell(row, 'value')
    if (!value) continue
    if (key === 'late tags' || key === 'latetags') {
      const tags = value
        .split(',')
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
      if (tags.length > 0) lateTags = tags
    }
  }
  return lateTags ? { lateTags } : null
}

/* ------------------------------------------------------------------ */
/* Cross checks                                                        */
/* ------------------------------------------------------------------ */

function duplicates(ids: string[]): string[] {
  const seen = new Set<string>()
  const twice = new Set<string>()
  for (const id of ids) {
    if (seen.has(id)) twice.add(id)
    seen.add(id)
  }
  return [...twice]
}

/**
 * TypeScript used to guarantee these. Once the framework comes from a sheet, a
 * single mistyped cell can produce an outline with no sections, so the checks
 * have to be real and the failure has to name the tab.
 */
export function crossCheck(framework: Framework): TabProblem[] {
  const problems: TabProblem[] = []

  if (framework.awareness.length === 0) {
    problems.push({ tab: TAB_NAMES.awareness, message: 'No usable stages, so no lead could be chosen.' })
  }
  if (framework.spines.length === 0) {
    problems.push({ tab: TAB_NAMES.spines, message: 'No usable spines, so no section stack could be built.' })
  }
  if (framework.goals.length === 0) {
    problems.push({ tab: TAB_NAMES.goals, message: 'No usable goals, so the close had no job.' })
  }

  const spineIds = new Set(framework.spines.map((spine) => spine.id))
  for (const stage of framework.awareness) {
    if (!spineIds.has(stage.spine)) {
      problems.push({
        tab: TAB_NAMES.awareness,
        message: `Stage ${stage.id} points at spine ${stage.spine}, which the Spines tab does not have.`,
      })
    }
  }

  for (const spine of framework.spines) {
    if (spine.slots.length === 0) {
      problems.push({
        tab: TAB_NAMES.slots,
        message: `Spine ${spine.id} has no slots, so it would build an outline with no spine sections.`,
      })
    }
    const clashes = duplicates(spine.slots.map((slot) => slot.key))
    if (clashes.length > 0) {
      problems.push({
        tab: TAB_NAMES.slots,
        message: `Spine ${spine.id} repeats the key ${clashes.join(' and ')}, which would collapse two sections into one.`,
      })
    }
  }

  const dupeChecks: [string, string[]][] = [
    [TAB_NAMES.awareness, framework.awareness.map((stage) => stage.id)],
    [TAB_NAMES.spines, framework.spines.map((spine) => spine.id)],
    [TAB_NAMES.goals, framework.goals.map((goal) => goal.id)],
    [TAB_NAMES.sections, framework.sections.map((section) => section.id)],
  ]
  for (const [tab, ids] of dupeChecks) {
    const clashes = duplicates(ids)
    if (clashes.length > 0) {
      problems.push({ tab, message: `Repeats the id ${clashes.join(' and ')}.` })
    }
  }

  const sectionIds = new Set(framework.sections.map((section) => section.id))
  const missing = REQUIRED_MECHANIC_IDS.filter((id) => !sectionIds.has(id))
  if (missing.length > 0) {
    problems.push({
      tab: TAB_NAMES.sections,
      message: `Missing the required ${missing.length === 1 ? 'id' : 'ids'} ${missing.join(', ')}.`,
    })
  }

  return problems
}

/* ------------------------------------------------------------------ */
/* Assembly                                                            */
/* ------------------------------------------------------------------ */

/**
 * Build the framework from whatever tabs came back. A missing or unusable tab
 * falls back to the built in slice for that tab alone. If the assembled result
 * fails a cross check, the whole framework falls back, because a half applied
 * framework is harder to reason about than a known one.
 */
export function assembleFramework(tabs: FrameworkTabs): FrameworkResult {
  return assembleFrameworkFromRows({
    awareness: rowsOf(tabs.awareness),
    spines: rowsOf(tabs.spines),
    slots: rowsOf(tabs.slots),
    goals: rowsOf(tabs.goals),
    sections: rowsOf(tabs.sections),
    settings: rowsOf(tabs.settings),
  })
}

/**
 * The same assembly from rows already read, so a single flat tab can supply the
 * framework as well as six named ones. The rules and the fallback are identical
 * either way, which is the point of the split.
 */
export function assembleFrameworkFromRows(sets: FrameworkRows): FrameworkResult {
  const problems: TabProblem[] = []
  const sources: FrameworkSources = { ...ALL_BUILT_IN }

  const awareness = parseAwareness(sets.awareness ?? [], problems)
  const spineRows = sets.spines ?? []
  const slotRows = sets.slots ?? []
  const spines = spineRows.length > 0 ? parseSpines(spineRows, slotRows, problems) : null
  const goals = parseGoals(sets.goals ?? [], problems)
  const sections = parseSections(sets.sections ?? [], problems)
  const settings = parseSettings(sets.settings ?? [])

  if (awareness) sources.awareness = 'sheet'
  if (spines) sources.spines = 'sheet'
  if (goals) sources.goals = 'sheet'
  if (sections) sources.sections = 'sheet'
  if (settings) sources.settings = 'sheet'

  const framework: Framework = {
    awareness: awareness ?? DEFAULT_FRAMEWORK.awareness,
    spines: spines ?? DEFAULT_FRAMEWORK.spines,
    goals: goals ?? DEFAULT_FRAMEWORK.goals,
    sections: sections ?? DEFAULT_SECTIONS,
    lateTags: settings?.lateTags ?? DEFAULT_LATE_TAGS,
  }

  const failures = crossCheck(framework)
  if (failures.length > 0) {
    return {
      framework: DEFAULT_FRAMEWORK,
      sources: { ...ALL_BUILT_IN },
      problems: [...problems, ...failures],
    }
  }

  return { framework, sources, problems }
}

/** True when any slice came from the sheet. */
export function usesSheetFramework(sources: FrameworkSources): boolean {
  return Object.values(sources).some((source) => source === 'sheet')
}
