/**
 * Where the sheet lives and how each tab is addressed.
 *
 * Nine tabs must not become nine environment variables, so one SHEET_ID
 * addresses tabs by name. SHEET_CSV_URL stays supported for the single tab
 * layout that shipped first.
 */

export const TAB_NAMES = {
  products: 'Products',
  claims: 'Claims',
  worries: 'Worries',
  awareness: 'Awareness',
  spines: 'Spines',
  slots: 'Slots',
  goals: 'Goals',
  sections: 'Sections',
  settings: 'Settings',
  references: 'References',
} as const

export type TabKey = keyof typeof TAB_NAMES

export const CONTENT_TABS: TabKey[] = ['products', 'claims', 'worries']
/** Neither content nor framework. Pages to learn from, and always optional. */
export const REFERENCE_TABS: TabKey[] = ['references']
export const FRAMEWORK_TABS: TabKey[] = ['awareness', 'spines', 'slots', 'goals', 'sections', 'settings']

/** `tabs` reads a nine tab sheet. `single` reads the original flat table. */
export type SheetMode = 'tabs' | 'single' | 'none'

export function sheetMode(env: NodeJS.ProcessEnv = process.env): SheetMode {
  if (env.SHEET_ID) return 'tabs'
  if (env.SHEET_CSV_URL) return 'single'
  return 'none'
}

/** Accepts a bare id or any Google Sheets address it can be pulled out of. */
export function readSheetId(value: string): string {
  const fromUrl = value.match(/\/d\/(?:e\/)?([a-zA-Z0-9_-]{16,})/)
  if (fromUrl) return fromUrl[1]
  return value.trim()
}

export const SHEETS_HOST = 'https://docs.google.com'

/**
 * Where the tab requests go. Google in every real deployment, but overridable
 * so the nine tab path can be driven against a stand in sheet in a test.
 */
export function sheetsHost(env: NodeJS.ProcessEnv = process.env): string {
  return (env.SHEET_BASE_URL || SHEETS_HOST).replace(/\/+$/, '')
}

/**
 * Publishing to the web mints a separate id, the `2PACX-` one. It is a real id
 * and it does serve CSV, but only per tab by `gid` number, never by tab name,
 * so the gviz address tabs are read from cannot use it. Catching that here turns
 * an obscure unreachable sheet into a sentence naming the actual mistake.
 */
export function isPublishId(value: string): boolean {
  return /^2PACX-/i.test(readSheetId(value))
}

export function tabUrl(sheetId: string, tab: string, env: NodeJS.ProcessEnv = process.env): string {
  const id = readSheetId(sheetId)
  return `${sheetsHost(env)}/spreadsheets/d/${id}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(tab)}`
}
