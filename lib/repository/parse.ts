import Papa from 'papaparse'
import { z } from 'zod'
import type { Claim, Product, Repository, Worry } from '@/lib/outline/types'

/**
 * The sheet is one flat table. Extra columns are ignored. Rows whose type is
 * empty or unrecognised are ignored.
 */
const RowSchema = z.object({
  type: z.string(),
  product: z.string().optional().default(''),
  label: z.string(),
  detail: z.string().optional().default(''),
  tags: z.string().optional().default(''),
})

export type RowType = 'product' | 'claim' | 'worry'

/**
 * `objection` is accepted as an alias for `worry` so a sheet written against
 * the older wording still loads.
 */
function rowType(value: string): RowType | null {
  const type = value.trim().toLowerCase()
  if (type === 'product') return 'product'
  if (type === 'claim') return 'claim'
  if (type === 'worry' || type === 'objection') return 'worry'
  return null
}

function slug(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '')
      .slice(0, 60) || 'row'
  )
}

/**
 * Ids are derived from type, scope and label rather than row position, so
 * inserting a row in the sheet does not orphan every saved outline below it.
 */
function makeId(type: RowType, scope: string, label: string, taken: Set<string>): string {
  const base = `${type}.${slug(scope)}.${slug(label)}`
  let id = base
  let n = 2
  while (taken.has(id)) {
    id = `${base}.${n}`
    n += 1
  }
  taken.add(id)
  return id
}

function cell(row: Record<string, unknown>, key: string): string {
  const value = row[key]
  return typeof value === 'string' ? value.trim() : ''
}

export interface ParseResult extends Repository {
  /** Rows read from the file, including the ones that were ignored. */
  rowCount: number
  /** Rows ignored because the type was empty or unrecognised. */
  ignored: number
}

/** Turn raw CSV text into the shape the app works with. */
export function parseRepositoryCsv(text: string): ParseResult {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase(),
  })

  const rows = Array.isArray(parsed.data) ? parsed.data : []
  const products: Product[] = []
  const claims: Claim[] = []
  const worries: Worry[] = []
  const taken = new Set<string>()
  let ignored = 0

  for (const raw of rows) {
    if (!raw || typeof raw !== 'object') {
      ignored += 1
      continue
    }

    const candidate = RowSchema.safeParse({
      type: cell(raw, 'type'),
      product: cell(raw, 'product'),
      label: cell(raw, 'label'),
      detail: cell(raw, 'detail'),
      tags: cell(raw, 'tags'),
    })

    if (!candidate.success) {
      ignored += 1
      continue
    }

    const row = candidate.data
    const type = rowType(row.type)
    if (!type || !row.label) {
      ignored += 1
      continue
    }

    if (type === 'product') {
      // On a product row the handle is the id.
      const handle = row.product
      if (!handle || handle === '*') {
        ignored += 1
        continue
      }
      if (products.some((product) => product.id === handle)) {
        ignored += 1
        continue
      }
      products.push({ id: handle, label: row.label, detail: row.detail })
      continue
    }

    // Blank or `*` means it applies to every product.
    const scope = row.product === '' ? '*' : row.product

    if (type === 'claim') {
      claims.push({
        id: makeId('claim', scope, row.label, taken),
        product: scope,
        label: row.label,
        detail: row.detail,
      })
      continue
    }

    worries.push({
      id: makeId('worry', scope, row.label, taken),
      product: scope,
      label: row.label,
      detail: row.detail,
      tags: row.tags,
    })
  }

  return { products, claims, worries, rowCount: rows.length, ignored }
}

/** Claims and worries narrow to the selected products plus anything marked `*`. */
export function inScope(item: { product: string }, selected: string[]): boolean {
  if (!item.product || item.product === '*') return true
  return selected.includes(item.product)
}

export function claimsInScope(repository: Repository, selected: string[]): Claim[] {
  return repository.claims.filter((claim) => inScope(claim, selected))
}

export function worriesInScope(repository: Repository, selected: string[]): Worry[] {
  return repository.worries.filter((worry) => inScope(worry, selected))
}
