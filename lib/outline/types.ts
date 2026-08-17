/**
 * Shared domain types. No React, no fetch.
 */

export type Level = 1 | 2

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
}

export interface Heading {
  heading: string
  note: string
}

/** sectionId to heading. */
export type Headings = Record<string, Heading>
