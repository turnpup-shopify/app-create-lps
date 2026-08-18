/**
 * Shared domain types. No React, no fetch.
 */

/** H1, H2 or H3. One H1 per page, in the hero. H3 only ever comes from an item. */
export type Level = 1 | 2 | 3

export type SectionKind = 'spine' | 'objection' | 'mechanic'

/** A spine slot id such as `spine-problem`, or one of the fixed placements. */
export type SlotId = string

export const FIXED_SLOTS = ['proof', 'offer', 'close', 'faq', 'own'] as const
export type FixedSlot = (typeof FIXED_SLOTS)[number]

export interface Product {
  /** The handle. Acts as the id. */
  id: string
  label: string
  detail: string
}

export interface Claim {
  id: string
  /** Product handle this belongs to, or `*` for every product. */
  product: string
  label: string
  detail: string
}

export interface Worry {
  id: string
  /** Product handle this belongs to, or `*` for every product. */
  product: string
  /** The worry in customer voice. */
  label: string
  /** The reassurance we own. */
  detail: string
  /** Comma separated. Only used to pick a default insert position. */
  tags: string
}

export interface Repository {
  products: Product[]
  claims: Claim[]
  worries: Worry[]
}

export const emptyRepository = (): Repository => ({ products: [], claims: [], worries: [] })

/** worryId to slotId. A worry belongs to exactly one section. */
export type Assignments = Record<string, SlotId>

export interface Section {
  id: string
  level: Level
  kind: SectionKind
  role: string
  job: string
  worries: Worry[]
  /** Which section type renders this. See `section-types.ts`. */
  typeId: string
}

/** One repeated block inside a section. This is where an H3 comes from. */
export interface HeadingItem {
  heading: string
  body: string
}

/**
 * What has been written for one section. Kept separate from `Section` because a
 * section is derived from the spine on every render while this is stored.
 *
 * `heading` is the section's single H2, or the page's only H1 in the hero.
 * `items` are its H3s, and a section type that takes no items never has any.
 */
export interface Heading {
  heading: string
  note: string
  /** The paragraph under the heading. Empty until the copy pass runs. */
  body: string
  /** The claim this section leans on, when its type takes one. */
  support: string
  /** Call to action, when its type takes one. */
  cta: string
  items: HeadingItem[]
}

export function emptyHeading(): Heading {
  return { heading: '', note: '', body: '', support: '', cta: '', items: [] }
}

/** sectionId to heading. */
export type Headings = Record<string, Heading>
