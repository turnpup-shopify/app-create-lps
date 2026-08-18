/**
 * Which Shopify section renders an outline section, and what it may hold.
 *
 * Keyed to metaobject definitions rather than to theme section files. A
 * definition is a stable contract of a handle and typed field keys, which is
 * exactly what the app needs to fill; a theme section file is a rendering
 * detail that moves whenever a designer touches it.
 */

/** A content slot a section type may take. */
export type Slot = 'heading' | 'body' | 'support' | 'cta' | 'eyebrow'

export interface SectionType {
  id: string
  /** The metaobject definition handle to write to. */
  metaobject: string
  label: string
  /** Which slots the section itself takes. `heading` is always present. */
  slots: Slot[]
  /** Zero means this type takes no items, so it emits no H3s. */
  minItems: number
  maxItems: number
  /** Which slots each item takes, when the type takes items. */
  itemSlots: Slot[]
}

/** The hero owns the page's only H1 and is pinned first. */
export const HERO_TYPE_ID = 'hero'

export const DEFAULT_SECTION_TYPES: SectionType[] = [
  {
    id: HERO_TYPE_ID,
    metaobject: 'lp_hero',
    label: 'Hero',
    slots: ['eyebrow', 'heading', 'body', 'cta'],
    minItems: 0,
    maxItems: 0,
    itemSlots: [],
  },
  {
    id: 'rich-text',
    metaobject: 'lp_rich_text',
    label: 'Text block',
    slots: ['heading', 'body', 'support'],
    minItems: 0,
    maxItems: 0,
    itemSlots: [],
  },
  {
    id: 'image-with-text',
    metaobject: 'lp_image_with_text',
    label: 'Image with text',
    slots: ['heading', 'body', 'support'],
    minItems: 0,
    maxItems: 0,
    itemSlots: [],
  },
  {
    id: 'feature-grid',
    metaobject: 'lp_feature_grid',
    label: 'Feature grid',
    slots: ['heading', 'body'],
    minItems: 3,
    maxItems: 6,
    itemSlots: ['heading', 'body'],
  },
  {
    id: 'proof',
    metaobject: 'lp_proof',
    label: 'Proof',
    slots: ['heading', 'body'],
    minItems: 2,
    maxItems: 4,
    itemSlots: ['heading', 'body'],
  },
  {
    id: 'faq',
    metaobject: 'lp_faq',
    label: 'Questions',
    slots: ['heading'],
    minItems: 3,
    maxItems: 8,
    itemSlots: ['heading', 'body'],
  },
  {
    id: 'offer',
    metaobject: 'lp_offer',
    label: 'The offer',
    slots: ['heading', 'body', 'support', 'cta'],
    minItems: 0,
    maxItems: 0,
    itemSlots: [],
  },
  {
    id: 'close',
    metaobject: 'lp_close',
    label: 'Close',
    slots: ['heading', 'body', 'cta'],
    minItems: 0,
    maxItems: 0,
    itemSlots: [],
  },
]

export const DEFAULT_TYPE_ID = 'rich-text'

/**
 * Which type a section defaults to, by the mechanic or spine slot it came from.
 * A writer can override it per section; this only picks a sensible start.
 */
export const TYPE_BY_ROLE: Record<string, string> = {
  proof: 'proof',
  offer: 'offer',
  faq: 'faq',
  close: 'close',
  'own.early': 'rich-text',
  'own.late': 'rich-text',
  how: 'feature-grid',
  solution: 'image-with-text',
  after: 'image-with-text',
}

export function findSectionType(id: string, types: SectionType[] = DEFAULT_SECTION_TYPES): SectionType {
  return types.find((type) => type.id === id) ?? types.find((type) => type.id === DEFAULT_TYPE_ID) ?? types[0]
}

/** True when this type repeats blocks, which is the only source of an H3. */
export function takesItems(type: SectionType): boolean {
  return type.maxItems > 0
}
