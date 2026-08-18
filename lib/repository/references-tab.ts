/**
 * Which pages to learn from.
 *
 * A `References` tab in a nine tab sheet, or `REFERENCE_URLS` in the environment
 * for the single tab layout, which cannot carry extra tabs.
 */

import { cell, isBlank, readRows } from './csv'

export interface ReferenceEntry {
  url: string
  label: string
  note: string
}

/** Only addresses we are willing to fetch. */
const HTTP = /^https?:\/\//i

export function parseReferencesTab(text: string | null | undefined): ReferenceEntry[] {
  if (!text) return []
  const entries: ReferenceEntry[] = []
  const seen = new Set<string>()

  for (const row of readRows(text)) {
    if (isBlank(row)) continue
    const url = cell(row, 'url', 'address', 'link')
    if (!HTTP.test(url) || seen.has(url)) continue
    // A row can be parked without deleting it.
    const use = cell(row, 'use', 'active').toLowerCase()
    if (use === 'no' || use === 'false' || use === 'off') continue
    seen.add(url)
    entries.push({ url, label: cell(row, 'label', 'name'), note: cell(row, 'note') })
  }

  return entries
}

/** The single tab fallback. Comma or newline separated addresses. */
export function parseReferenceUrls(value: string | undefined): ReferenceEntry[] {
  if (!value) return []
  const seen = new Set<string>()
  return value
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter((part) => HTTP.test(part) && !seen.has(part) && seen.add(part))
    .map((url) => ({ url, label: '', note: '' }))
}

/** How many pages to read. More than this crowds the prompt and slows the pass. */
export const REFERENCE_LIMIT = 4
