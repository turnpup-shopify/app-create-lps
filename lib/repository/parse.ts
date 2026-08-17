import { z } from 'zod'
import type { Claim, Product, Repository, Worry } from '@/lib/outline/types'
import { cell, isBlank, readRows, type Row } from './csv'

/**
 * Two layouts are supported.
 *
 * `parseRepositoryCsv` reads the original single tab, where a `type` column
 * says what each row is. `parseProductsTab` and friends read the nine tab
 * layout, where the tab says it instead and an optional `id` column supplies a
 * stable identifier.
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
 * An id column wins when it is filled in, because then renaming a label is
 * safe. With it blank the id is derived from type, scope and label, which
 * survives a row being inserted but not the label being reworded.
 */
function makeId(
  type: RowType,
  scope: string,
  label: string,
  given: string,
  taken: Set<string>,
): string {
  const base = given || `${type}.${slug(scope)}.${slug(label)}`
  let id = base
  let n = 2
  while (taken.has(id)) {
    id = `${base}.${n}`
    n += 1
  }
  taken.add(id)
  return id
}

export interface ParseResult extends Repository {
  /** Rows read from the file, including the ones that were ignored. */
  rowCount: number
  /** Rows ignored because the type was empty or unrecognised. */
  ignored: number
}

/* ------------------------------------------------------------------ */
/* The single tab layout                                               */
/* ------------------------------------------------------------------ */

/** Turn one flat CSV, with a `type` column, into the shape the app works with. */
export function parseRepositoryCsv(text: string): ParseResult {
  const rows = readRows(text)
  const products: Product[] = []
  const claims: Claim[] = []
  const worries: Worry[] = []
  const taken = new Set<string>()
  let ignored = 0

  for (const raw of rows) {
    const candidate = RowSchema.safeParse({
      type: cell(raw, 'type'),
      product: cell(raw, 'product'),
      label: cell(raw, 'label'),
      detail: cell(raw, 'detail', 'answer'),
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
      if (!handle || handle === '*' || products.some((product) => product.id === handle)) {
        ignored += 1
        continue
      }
      products.push({ id: handle, label: row.label, detail: row.detail })
      continue
    }

    // Blank or `*` means it applies to every product.
    const scope = row.product === '' ? '*' : row.product
    const id = makeId(type, scope, row.label, cell(raw, 'id'), taken)

    if (type === 'claim') {
      claims.push({ id, product: scope, label: row.label, detail: row.detail })
      continue
    }

    worries.push({ id, product: scope, label: row.label, detail: row.detail, tags: row.tags })
  }

  return { products, claims, worries, rowCount: rows.length, ignored }
}

/* ------------------------------------------------------------------ */
/* The nine tab layout                                                 */
/* ------------------------------------------------------------------ */

const usable = (text: string | null | undefined): Row[] =>
  text ? readRows(text).filter((row) => !isBlank(row)) : []

/** Products tab. Columns handle, label, detail. */
export function parseProductsTab(text: string | null | undefined): Product[] {
  const products: Product[] = []
  for (const row of usable(text)) {
    const handle = cell(row, 'handle', 'product', 'id')
    const label = cell(row, 'label', 'name')
    if (!handle || !label || handle === '*') continue
    if (products.some((product) => product.id === handle)) continue
    products.push({ id: handle, label, detail: cell(row, 'detail') })
  }
  return products
}

/** Claims tab. Columns id, product, label, detail. */
export function parseClaimsTab(text: string | null | undefined): Claim[] {
  const claims: Claim[] = []
  const taken = new Set<string>()
  for (const row of usable(text)) {
    const label = cell(row, 'label', 'claim')
    if (!label) continue
    const scope = cell(row, 'product') || '*'
    claims.push({
      id: makeId('claim', scope, label, cell(row, 'id'), taken),
      product: scope,
      label,
      detail: cell(row, 'detail', 'support'),
    })
  }
  return claims
}

/** Worries tab. Columns id, product, label, answer, tags. */
export function parseWorriesTab(text: string | null | undefined): Worry[] {
  const worries: Worry[] = []
  const taken = new Set<string>()
  for (const row of usable(text)) {
    const label = cell(row, 'label', 'worry')
    if (!label) continue
    const scope = cell(row, 'product') || '*'
    worries.push({
      id: makeId('worry', scope, label, cell(row, 'id'), taken),
      product: scope,
      label,
      // The column is named answer now. detail is still read so an older sheet works.
      detail: cell(row, 'answer', 'detail'),
      tags: cell(row, 'tags'),
    })
  }
  return worries
}

/* ------------------------------------------------------------------ */
/* Scope                                                               */
/* ------------------------------------------------------------------ */

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
