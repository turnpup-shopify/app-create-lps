import { NextResponse } from 'next/server'
import { extractReference, looksClientRendered, type ReferencePage } from '@/lib/references/extract'
import {
  parseReferenceUrls,
  parseReferencesTab,
  REFERENCE_LIMIT,
  type ReferenceEntry,
} from '@/lib/repository/references-tab'
import { looksLikeCsv } from '@/lib/repository/csv'
import { TAB_NAMES, sheetMode, tabUrl } from '@/lib/repository/sheet'

/**
 * Reads the pages the writer nominated and reduces each to its heading tree.
 *
 * A plain fetch, deliberately. A headless browser would see more, and Chromium
 * does not fit in a serverless function, so a page that renders in the browser
 * is reported as such rather than silently coming back empty.
 */

const REVALIDATE = 3600

/** Long enough for a slow marketing page, short enough not to hang the pass. */
const TIMEOUT = 8000

/** Identify ourselves rather than pretending to be a person. */
const AGENT = 'LandingPageOutlineBuilder (reads public pages for reference, respects robots)'

export interface ReferenceProblem {
  url: string
  message: string
}

async function readList(fresh: boolean): Promise<ReferenceEntry[]> {
  const fromEnv = parseReferenceUrls(process.env.REFERENCE_URLS)
  if (sheetMode() !== 'tabs') return fromEnv.slice(0, REFERENCE_LIMIT)

  try {
    const response = await fetch(tabUrl(process.env.SHEET_ID!, TAB_NAMES.references), {
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: REVALIDATE } }),
      headers: { 'user-agent': AGENT },
    })
    if (!response.ok) return fromEnv.slice(0, REFERENCE_LIMIT)
    const text = await response.text()
    const fromTab = looksLikeCsv(text) ? parseReferencesTab(text) : []
    // The tab wins when it has rows, and the environment is the fallback.
    return (fromTab.length > 0 ? fromTab : fromEnv).slice(0, REFERENCE_LIMIT)
  } catch {
    return fromEnv.slice(0, REFERENCE_LIMIT)
  }
}

async function readPage(
  entry: ReferenceEntry,
  fresh: boolean,
): Promise<{ page: ReferencePage | null; problem: ReferenceProblem | null }> {
  try {
    const response = await fetch(entry.url, {
      ...(fresh ? { cache: 'no-store' as const } : { next: { revalidate: REVALIDATE } }),
      headers: { 'user-agent': AGENT, accept: 'text/html' },
      signal: AbortSignal.timeout(TIMEOUT),
      redirect: 'follow',
    })

    if (!response.ok) {
      return {
        page: null,
        problem: { url: entry.url, message: `The page answered ${response.status}, so nothing was read from it.` },
      }
    }

    const type = response.headers.get('content-type') ?? ''
    if (!type.includes('html')) {
      return { page: null, problem: { url: entry.url, message: 'That address is not a web page.' } }
    }

    const page = extractReference(await response.text(), entry.url, entry.label)
    if (looksClientRendered(page)) {
      return {
        page: null,
        problem: {
          url: entry.url,
          message: 'The page held no headings, which usually means it builds itself in the browser. It was skipped.',
        },
      }
    }

    return { page, problem: null }
  } catch (error) {
    const timedOut = error instanceof Error && error.name === 'TimeoutError'
    return {
      page: null,
      problem: {
        url: entry.url,
        message: timedOut ? 'The page took too long to answer, so it was skipped.' : 'The page could not be reached.',
      },
    }
  }
}

/** Cached for an hour. `?fresh=1` bypasses it. */
export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get('fresh') === '1'
  const list = await readList(fresh)

  if (list.length === 0) {
    return NextResponse.json({ pages: [], problems: [], configured: false })
  }

  const read = await Promise.all(list.map((entry) => readPage(entry, fresh)))

  return NextResponse.json({
    configured: true,
    pages: read.map((result) => result.page).filter((page): page is ReferencePage => page !== null),
    problems: read.map((result) => result.problem).filter((problem): problem is ReferenceProblem => problem !== null),
  })
}
