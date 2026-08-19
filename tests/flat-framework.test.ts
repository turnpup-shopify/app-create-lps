import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_FRAMEWORK, DEFAULT_LATE_TAGS } from '@/lib/outline/framework'
import { buildStructure } from '@/lib/outline/structure'
import { readRows } from '@/lib/repository/csv'
import { frameworkRowsFromFlat, hasFrameworkRows, isFrameworkRow } from '@/lib/repository/flat-framework'
import { assembleFrameworkFromRows } from '@/lib/repository/framework-tabs'

const COLUMNS = ['type', 'id', 'spine', 'key', 'position', 'label', 'role', 'job', 'lead', 'why', 'note', 'value']

const q = (value: string) => (/[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value)
const line = (row: Record<string, string>) => COLUMNS.map((column) => q(row[column] ?? '')).join(',')

/** The built in framework as one flat table. Generated, never hand typed. */
function flatCsv(): string {
  const out = [COLUMNS.join(',')]
  for (const stage of DEFAULT_FRAMEWORK.awareness) {
    out.push(line({ type: 'awareness', id: stage.id, label: stage.label, lead: stage.lead, why: stage.why, spine: stage.spine }))
  }
  for (const spine of DEFAULT_FRAMEWORK.spines) {
    out.push(line({ type: 'spine', id: spine.id, label: spine.name, note: spine.note }))
  }
  for (const spine of DEFAULT_FRAMEWORK.spines) {
    spine.slots.forEach((slot, at) =>
      out.push(
        line({
          type: 'slot',
          spine: spine.id,
          key: slot.key,
          position: String(at + 1),
          role: slot.role,
          job: slot.job,
        }),
      ),
    )
  }
  for (const goal of DEFAULT_FRAMEWORK.goals) {
    out.push(line({ type: 'goal', id: goal.id, label: goal.label, job: goal.close }))
  }
  for (const section of DEFAULT_FRAMEWORK.sections) {
    out.push(line({ type: 'section', id: section.id, role: section.role, job: section.job }))
  }
  out.push(line({ type: 'setting', key: 'late tags', value: DEFAULT_LATE_TAGS.join(', ') }))
  return `${out.join('\n')}\n`
}

const FILE = path.join(process.cwd(), 'sample', 'Framework.csv')

describe('the flat framework table', () => {
  it('is written to sample/Framework.csv from the code, so it cannot drift', () => {
    const csv = flatCsv()
    fs.writeFileSync(FILE, csv)
    expect(csv.split('\n')[0]).toBe(COLUMNS.join(','))
  })

  it('reproduces the built in framework exactly when read back', () => {
    const rows = readRows(fs.readFileSync(FILE, 'utf8'))
    expect(hasFrameworkRows(rows)).toBe(true)
    const { framework, problems, sources } = assembleFrameworkFromRows(frameworkRowsFromFlat(rows))
    expect(problems).toEqual([])
    expect(framework.awareness).toEqual(DEFAULT_FRAMEWORK.awareness)
    expect(framework.spines).toEqual(DEFAULT_FRAMEWORK.spines)
    expect(framework.goals).toEqual(DEFAULT_FRAMEWORK.goals)
    expect(framework.sections).toEqual(DEFAULT_FRAMEWORK.sections)
    expect(framework.lateTags).toEqual(DEFAULT_LATE_TAGS)
    expect(Object.values(sources).every((source) => source === 'sheet')).toBe(true)
  })

  it('builds an identical outline to the built in framework', () => {
    const rows = readRows(fs.readFileSync(FILE, 'utf8'))
    const { framework } = assembleFrameworkFromRows(frameworkRowsFromFlat(rows))
    const input = { spine: 'pas', goal: 'buy', worries: [], assignments: {} }
    expect(buildStructure({ ...input, framework })).toEqual(buildStructure(input))
  })

  it('tells a framework row apart from a content row', () => {
    const rows = readRows('type,label\nproduct,A brass pull\nawareness,Problem aware\nclaim,Ages well\n')
    expect(rows.map(isFrameworkRow)).toEqual([false, true, false])
  })

  it('reads singular and plural type names', () => {
    const rows = readRows('type,id,label,lead,spine\nstage,a,A,Lead,pas\nstages,b,B,Lead,pas\nawareness,c,C,Lead,pas\n')
    expect(frameworkRowsFromFlat(rows).awareness).toHaveLength(3)
  })

  it('takes a spine name from label or from name', () => {
    const fromLabel = frameworkRowsFromFlat(readRows('type,id,label\nspine,x,By label\n')).spines
    const fromName = frameworkRowsFromFlat(readRows('type,id,name\nspine,x,By name\n')).spines
    expect(fromLabel?.[0].name).toBe('By label')
    expect(fromName?.[0].name).toBe('By name')
  })

  it('takes a goal close job from job or from close job', () => {
    const a = frameworkRowsFromFlat(readRows('type,id,label,job\ngoal,buy,Buy,Ask for it\n')).goals
    const b = frameworkRowsFromFlat(readRows('type,id,label,close job\ngoal,buy,Buy,Ask for it\n')).goals
    expect(a?.[0]['close job']).toBe('Ask for it')
    expect(b?.[0]['close job']).toBe('Ask for it')
  })

  it('ignores content rows entirely', () => {
    const rows = readRows('type,id,label\nproduct,p,A pull\nclaim,c,Ages well\nworry,w,Too dear\n')
    expect(hasFrameworkRows(rows)).toBe(false)
    const sets = frameworkRowsFromFlat(rows)
    expect(Object.values(sets).every((set) => set.length === 0)).toBe(true)
  })

  it('reports a bad framework row the same way a named tab would', () => {
    const rows = readRows('type,id,label,lead,spine\nawareness,,,Lead with proof,pas\n')
    const { problems } = assembleFrameworkFromRows(frameworkRowsFromFlat(rows))
    expect(problems.some((problem) => problem.tab === 'Awareness' && problem.message.includes('Row 2'))).toBe(true)
  })
})
