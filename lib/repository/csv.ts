import Papa from 'papaparse'

export type Row = Record<string, string>

/**
 * One CSV text into trimmed rows with normalised header names. Header names are
 * lowercased and collapsed, so ` Close Job ` reads as `close job`.
 */
export function readRows(text: string): Row[] {
  const parsed = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, ' '),
  })

  const rows = Array.isArray(parsed.data) ? parsed.data : []
  return rows
    .filter((row): row is Record<string, unknown> => Boolean(row) && typeof row === 'object')
    .map((row) => {
      const clean: Row = {}
      for (const [key, value] of Object.entries(row)) {
        clean[key] = typeof value === 'string' ? value.trim() : value == null ? '' : String(value).trim()
      }
      return clean
    })
}

/** First non empty value among the given header names. */
export function cell(row: Row, ...names: string[]): string {
  for (const name of names) {
    const value = row[name]
    if (value) return value
  }
  return ''
}

/** A row with nothing in any cell. */
export function isBlank(row: Row): boolean {
  return Object.values(row).every((value) => value === '')
}

/**
 * Google returns an HTML error page or a JSONP wrapper rather than a 404 when a
 * tab name is wrong, so a body that is not CSV has to be caught by shape.
 */
export function looksLikeCsv(text: string): boolean {
  const head = text.trimStart().slice(0, 400).toLowerCase()
  if (head.startsWith('<')) return false
  if (head.includes('google.visualization.query.setresponse')) return false
  if (head.includes('<!doctype')) return false
  return text.trim().length > 0
}
