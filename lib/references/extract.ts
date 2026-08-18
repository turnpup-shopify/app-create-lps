/**
 * Turning a fetched landing page into something worth putting in a prompt.
 *
 * Not the raw body HTML. A real landing page body is hundreds of kilobytes of
 * nested divs, inline scripts and tracking pixels, and none of that teaches a
 * model anything about how the page argues. What does is the heading tree and
 * the copy sitting under each heading, which is a couple of kilobytes.
 */

import { parse, type HTMLElement } from 'node-html-parser'

export interface ReferenceHeading {
  level: 1 | 2 | 3
  heading: string
  /** The copy between this heading and the next one, trimmed. */
  body: string
}

export interface ReferencePage {
  url: string
  label: string
  title: string
  headings: ReferenceHeading[]
}

/** Nothing here is worth reading, and much of it is noisy. */
const STRIP = 'script, style, noscript, template, svg, iframe, nav, header, footer, form'

/** How much copy to keep under one heading. Enough to show voice, not the page. */
const BODY_LIMIT = 320

/** How many headings to keep. A long page would otherwise dominate the prompt. */
const HEADING_LIMIT = 40

const tidy = (value: string): string =>
  value
    .replace(/\s+/g, ' ')
    .replace(/ /g, ' ')
    .trim()

function levelOf(tag: string): 1 | 2 | 3 | null {
  if (tag === 'H1') return 1
  if (tag === 'H2') return 2
  if (tag === 'H3') return 3
  return null
}

/**
 * The copy under a heading, gathered by walking forward through siblings until
 * the next heading. Reads the page the way a reader does rather than guessing at
 * a container, which no two themes agree on.
 */
function bodyAfter(node: HTMLElement): string {
  const parts: string[] = []
  let current = node.nextElementSibling

  while (current) {
    if (levelOf(current.tagName ?? '')) break
    const text = tidy(current.text ?? '')
    if (text) parts.push(text)
    if (parts.join(' ').length > BODY_LIMIT) break
    current = current.nextElementSibling
  }

  const joined = tidy(parts.join(' '))
  return joined.length > BODY_LIMIT ? `${joined.slice(0, BODY_LIMIT).trimEnd()}…` : joined
}

/**
 * Pull the heading tree out of a page.
 *
 * An empty result is the signal that the page rendered its content in the
 * browser rather than on the server, which a plain fetch cannot see. The caller
 * says so rather than pretending the page had nothing to say.
 */
export function extractReference(html: string, url: string, label = ''): ReferencePage {
  const root = parse(html, { blockTextElements: { script: false, style: false, noscript: false } })

  for (const node of root.querySelectorAll(STRIP)) node.remove()

  const title = tidy(root.querySelector('title')?.text ?? '')

  const headings: ReferenceHeading[] = []
  for (const node of root.querySelectorAll('h1, h2, h3')) {
    const level = levelOf(node.tagName ?? '')
    if (!level) continue
    const heading = tidy(node.text ?? '')
    if (!heading) continue
    headings.push({ level, heading, body: bodyAfter(node) })
    if (headings.length >= HEADING_LIMIT) break
  }

  return { url, label: label || title || url, title, headings }
}

/** True when a fetch came back with no headings, so a browser is likely needed. */
export function looksClientRendered(page: ReferencePage): boolean {
  return page.headings.length === 0
}

/** The compact form handed to the prompt. */
export function toPromptShape(page: ReferencePage): {
  page: string
  outline: { level: string; heading: string; copy: string }[]
} {
  return {
    page: page.label,
    outline: page.headings.map((entry) => ({
      level: `H${entry.level}`,
      heading: entry.heading,
      copy: entry.body,
    })),
  }
}
