import { NextResponse } from 'next/server'
import { parseRepositoryCsv } from '@/lib/repository/parse'

const NOT_CONFIGURED =
  'No sheet address is set, so there is nothing to read. Add SHEET_CSV_URL to the environment and reload, or paste the rows below.'

const UNREACHABLE =
  'The sheet could not be read. The likely cause is that it is not published to the web as CSV. Publish it, then refresh. You can also paste the rows below.'

const EMPTY =
  'The sheet loaded but held no usable rows. Check that the header row reads type, product, label, detail, tags.'

/**
 * Reads the sheet. Never writes to it.
 * Cached for five minutes. `?fresh=1` bypasses the cache.
 */
export async function GET(request: Request) {
  const sheet = process.env.SHEET_CSV_URL
  if (!sheet) {
    return NextResponse.json({ error: NOT_CONFIGURED, sheet: null }, { status: 502 })
  }

  const fresh = new URL(request.url).searchParams.get('fresh') === '1'

  let text: string
  try {
    const response = await fetch(sheet, fresh ? { cache: 'no-store' } : { next: { revalidate: 300 } })
    if (!response.ok) {
      return NextResponse.json({ error: UNREACHABLE, sheet, status: response.status }, { status: 502 })
    }
    text = await response.text()
  } catch {
    return NextResponse.json({ error: UNREACHABLE, sheet }, { status: 502 })
  }

  const parsed = parseRepositoryCsv(text)
  const total = parsed.products.length + parsed.claims.length + parsed.worries.length
  if (total === 0) {
    return NextResponse.json({ error: EMPTY, sheet }, { status: 502 })
  }

  return NextResponse.json({
    source: 'sheet',
    sheet,
    products: parsed.products,
    claims: parsed.claims,
    worries: parsed.worries,
    rowCount: parsed.rowCount,
    ignored: parsed.ignored,
  })
}
