import { ALL_BUILT_IN, DEFAULT_FRAMEWORK } from '@/lib/outline/framework'
import { looksLikeCsv } from '@/lib/repository/csv'
import { assembleFramework, type FrameworkTabs, type TabProblem } from '@/lib/repository/framework-tabs'
import {
  parseClaimsTab,
  parseProductsTab,
  parseRepositoryCsv,
  parseWorriesTab,
} from '@/lib/repository/parse'
import { CONTENT_TABS, TAB_NAMES, isPublishId, sheetMode, tabUrl, type TabKey } from '@/lib/repository/sheet'
import { NextResponse } from 'next/server'

const NOT_CONFIGURED =
  'No sheet is set, so there is nothing to read. Add SHEET_ID to the environment and reload, or paste the rows below. The built in framework is in force meanwhile.'

const UNREACHABLE =
  'The sheet could not be read. The likely cause is that it is not shared or published. Fix the sharing, then refresh. You can also paste the rows below.'

const NO_CONTENT =
  'The sheet loaded but held no products, claims or worries. Check the tab names and the header rows.'

const PUBLISH_ID =
  'SHEET_ID holds a published id rather than the id of the sheet. Publishing mints a separate one, and it can only address tabs by number rather than by name. Copy the id out of the address bar of the sheet, the part between d and edit, then reload.'

const REVALIDATE = 300

async function fetchText(url: string, fresh: boolean): Promise<string | null> {
  try {
    const response = await fetch(url, fresh ? { cache: 'no-store' } : { next: { revalidate: REVALIDATE } })
    if (!response.ok) return null
    const text = await response.text()
    return looksLikeCsv(text) ? text : null
  } catch {
    return null
  }
}

/**
 * Reads the sheet. Never writes to it.
 * Cached for five minutes. `?fresh=1` bypasses the cache.
 */
export async function GET(request: Request) {
  const fresh = new URL(request.url).searchParams.get('fresh') === '1'
  const mode = sheetMode()

  /* ---------------- nothing configured ---------------- */
  if (mode === 'none') {
    return NextResponse.json(
      {
        error: NOT_CONFIGURED,
        sheet: null,
        framework: DEFAULT_FRAMEWORK,
        sources: ALL_BUILT_IN,
        problems: [],
      },
      { status: 502 },
    )
  }

  /* ---------------- the original single tab ---------------- */
  if (mode === 'single') {
    const sheet = process.env.SHEET_CSV_URL!
    const text = await fetchText(sheet, fresh)
    if (!text) {
      return NextResponse.json(
        {
          error: UNREACHABLE,
          sheet,
          framework: DEFAULT_FRAMEWORK,
          sources: ALL_BUILT_IN,
          problems: [],
        },
        { status: 502 },
      )
    }

    const parsed = parseRepositoryCsv(text)
    const total = parsed.products.length + parsed.claims.length + parsed.worries.length
    if (total === 0) {
      return NextResponse.json(
        { error: NO_CONTENT, sheet, framework: DEFAULT_FRAMEWORK, sources: ALL_BUILT_IN, problems: [] },
        { status: 502 },
      )
    }

    return NextResponse.json({
      source: 'sheet',
      layout: 'single',
      sheet,
      products: parsed.products,
      claims: parsed.claims,
      worries: parsed.worries,
      framework: DEFAULT_FRAMEWORK,
      sources: ALL_BUILT_IN,
      problems: [],
      rowCount: parsed.rowCount,
      ignored: parsed.ignored,
    })
  }

  /* ---------------- the nine tab layout ---------------- */
  const sheetId = process.env.SHEET_ID!

  // Fail on the actual mistake rather than making ten doomed requests and
  // blaming the sharing settings.
  if (isPublishId(sheetId)) {
    return NextResponse.json(
      { error: PUBLISH_ID, sheet: sheetId, framework: DEFAULT_FRAMEWORK, sources: ALL_BUILT_IN, problems: [] },
      { status: 502 },
    )
  }
  const keys = Object.keys(TAB_NAMES) as TabKey[]

  const fetched = await Promise.all(
    keys.map(async (key) => [key, await fetchText(tabUrl(sheetId, TAB_NAMES[key]), fresh)] as const),
  )
  const texts = Object.fromEntries(fetched) as Record<TabKey, string | null>

  const products = parseProductsTab(texts.products)
  const claims = parseClaimsTab(texts.claims)
  const worries = parseWorriesTab(texts.worries)

  const tabs: FrameworkTabs = {
    awareness: texts.awareness,
    spines: texts.spines,
    slots: texts.slots,
    goals: texts.goals,
    sections: texts.sections,
    settings: texts.settings,
  }
  const { framework, sources, problems } = assembleFramework(tabs)

  // A missing content tab is worth naming, so a wrong tab name does not look
  // like an empty sheet. A missing framework tab is not a fault at all, because
  // those tabs are optional and the status line already says the built in
  // framework is in force. Naming them would head a list of five things the
  // writer did nothing wrong to cause.
  const missing: TabProblem[] = CONTENT_TABS.filter((key) => texts[key] === null).map((key) => ({
    tab: TAB_NAMES[key],
    message: 'Not found in the sheet, so nothing was read from it.',
  }))

  const reachedAnyTab = keys.some((key) => texts[key] !== null)
  if (!reachedAnyTab) {
    return NextResponse.json(
      {
        error: UNREACHABLE,
        sheet: sheetId,
        framework: DEFAULT_FRAMEWORK,
        sources: ALL_BUILT_IN,
        problems: [],
      },
      { status: 502 },
    )
  }

  if (products.length + claims.length + worries.length === 0) {
    return NextResponse.json(
      {
        error: NO_CONTENT,
        sheet: sheetId,
        framework,
        sources,
        problems: [...missing, ...problems],
      },
      { status: 502 },
    )
  }

  return NextResponse.json({
    source: 'sheet',
    layout: 'tabs',
    sheet: sheetId,
    products,
    claims,
    worries,
    framework,
    sources,
    problems: [...missing, ...problems],
  })
}
