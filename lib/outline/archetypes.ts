/**
 * Archetype manifests grounded in the two real Firstday templates.
 *
 * Every slot key is a real metafield key from 07-section-audit.md.
 * Every section_type is a real Liquid section type in the theme.
 * Nothing here is invented.
 *
 * The builder does not compose pages. The template already did that.
 * The builder assigns content to slots. That is the whole job.
 */

export type ArchetypeId = 'listicle_a' | 'standard'

export type SlotKind = 'native' | 'single' | 'numbered' | 'repeater' | 'fixed'

/**
 * What content binds to this slot.
 *
 * - `top_claim`: the strongest selected claim
 * - `claim`: one claim from the pool (consumed in rank order)
 * - `claims`: all remaining claims (repeater)
 * - `objections`: all selected objections (repeater)
 * - `controlling_idea`: the controlling idea sentence
 * - `close`: the close, restates the hero claim
 * - `none`: chrome or structural, nothing to assign
 */
export type SlotContent =
  | 'top_claim'
  | 'claim'
  | 'claims'
  | 'objections'
  | 'controlling_idea'
  | 'close'
  | 'none'

export interface ArchetypeSlot {
  /** The metafield key, or `page.title` / `page.content` for native slots. */
  key: string
  kind: SlotKind
  /** The Liquid section type that renders this. */
  sectionType: string
  /** Human readable role label. */
  role: string
  /** Instruction to the copywriter. */
  roleIntent: string
  /** What content binds to this slot. */
  content: SlotContent
  /** Whether the slot needs an image or video. */
  needsMedia: boolean
  /** For numbered slots, which number in the sequence. */
  number?: number
  /** For numbered stats, the parent key they belong to. */
  group?: string
  /** Metafield subfields this slot holds. */
  fields: string[]
  /** Whether this slot can be left empty. */
  optional?: boolean
}

export interface Archetype {
  id: ArchetypeId
  name: string
  description: string
  /**
   * Max claims the archetype accepts. Null means no hard limit because
   * overflow goes to a repeater (standard). A number means numbered slots
   * are the only claim container (listicle_a).
   */
  maxClaims: number | null
  /**
   * When true, only claims with scope === 'reason' are eligible.
   * Listicle items sit next to each other and a spec wearing a benefit
   * costume is obvious at a glance.
   */
  reasonOnly: boolean
  slots: ArchetypeSlot[]
}

export const ARCHETYPES: Record<ArchetypeId, Archetype> = {
  listicle_a: {
    id: 'listicle_a',
    name: 'Listicle advertorial',
    description: 'The advertorial with five numbered listicle blocks. Opens with page.title as H1.',
    maxClaims: 5,
    reasonOnly: true,
    slots: [
      {
        key: 'page.title', kind: 'native', sectionType: 'rich-text',
        role: 'Hook', roleIntent: 'Headline must contain the number of reasons. The page opens as an article.',
        content: 'controlling_idea', needsMedia: false,
        fields: ['title'],
      },
      {
        key: 'page.content', kind: 'native', sectionType: 'rich-text',
        role: 'Setup', roleIntent: 'The setup. Say why this matters now, in two sentences. No claims.',
        content: 'none', needsMedia: false,
        fields: ['content'],
      },
      {
        key: 'custom.note', kind: 'single', sectionType: 'rich-text',
        role: 'Callout', roleIntent: 'A short callout or note. Optional.',
        content: 'none', needsMedia: false, optional: true,
        fields: ['note'],
      },
      {
        key: 'metabject_author', kind: 'single', sectionType: 'temp-author',
        role: 'Byline', roleIntent: 'Author image, name, and date. Not claims.',
        content: 'none', needsMedia: false,
        fields: ['author_image', 'author_name', 'date_updated'],
      },
      {
        key: 'listicle_a_listicle_block_1', kind: 'numbered', sectionType: 'temp-listicle-img-txt-block',
        role: 'List item 1', roleIntent: 'One numbered reason, self contained, no forward references.',
        content: 'claim', needsMedia: true, number: 1,
        fields: ['badge_text', 'heading', 'body_text', 'cta_label', 'cta_link', 'image'],
      },
      {
        key: 'listicle_a_listicle_block_2', kind: 'numbered', sectionType: 'temp-listicle-img-txt-block',
        role: 'List item 2', roleIntent: 'One numbered reason, self contained, no forward references.',
        content: 'claim', needsMedia: true, number: 2,
        fields: ['badge_text', 'heading', 'body_text', 'cta_label', 'cta_link', 'image'],
      },
      {
        key: 'listicle_a_listicle_block_3', kind: 'numbered', sectionType: 'temp-listicle-img-txt-block',
        role: 'List item 3', roleIntent: 'One numbered reason, self contained, no forward references.',
        content: 'claim', needsMedia: true, number: 3,
        fields: ['badge_text', 'heading', 'body_text', 'cta_label', 'cta_link', 'image'],
      },
      {
        key: 'listicle_a_listicle_block_4', kind: 'numbered', sectionType: 'temp-listicle-img-txt-block',
        role: 'List item 4', roleIntent: 'One numbered reason, self contained, no forward references.',
        content: 'claim', needsMedia: true, number: 4,
        fields: ['badge_text', 'heading', 'body_text', 'cta_label', 'cta_link', 'image'],
      },
      {
        key: 'listicle_a_listicle_block_5', kind: 'numbered', sectionType: 'temp-listicle-img-txt-block',
        role: 'List item 5', roleIntent: 'One numbered reason, self contained, no forward references.',
        content: 'claim', needsMedia: true, number: 5,
        fields: ['badge_text', 'heading', 'body_text', 'cta_label', 'cta_link', 'image'],
      },
      {
        key: 'section_2_bts_2_accordtion', kind: 'repeater', sectionType: 'accordion-block',
        role: 'Handle objections', roleIntent: 'Name the doubt in their words, then answer it plainly.',
        content: 'objections', needsMedia: false,
        fields: ['header', 'subheader', 'image', 'nutrient_deficiencies[]'],
      },
      {
        key: 'timeline', kind: 'single', sectionType: 'timeline-section',
        role: 'Mechanism', roleIntent: 'Three steps showing how it works over time.',
        content: 'none', needsMedia: true,
        fields: ['heading_line_1', 'heading_line_2', 'timeline_1', 'timeline_2', 'timeline_3'],
      },
      {
        key: 'last_module', kind: 'single', sectionType: 'temp-replo-hero',
        role: 'Close', roleIntent: 'Restate the single idea and ask for the order.',
        content: 'close', needsMedia: true,
        fields: ['header', 'body', 'cta_copy', 'image'],
      },
      {
        key: 'main_product_for_purchase', kind: 'fixed', sectionType: 'standalone-product',
        role: 'Purchase', roleIntent: 'Product reference. Set once.',
        content: 'none', needsMedia: false,
        fields: ['product'],
      },
    ],
  },
  standard: {
    id: 'standard',
    name: 'Standard lander',
    description: 'The temp-replo-hero lander. Opens with the hero section bound to the strongest claim.',
    maxClaims: null,
    reasonOnly: false,
    slots: [
      {
        key: 'section_temp_replo_hero', kind: 'single', sectionType: 'temp-replo-hero',
        role: 'Hero', roleIntent: 'Open with the strongest claim. Say the pain in their words before naming the product.',
        content: 'top_claim', needsMedia: true,
        fields: ['header', 'body', 'cta_copy', 'image', 'mobile_image', 'rotating_badges', 'creator_image', 'creator_handle', 'creator_quote'],
      },
      {
        key: 'rotating_marquee', kind: 'single', sectionType: 'temp-marquee',
        role: 'Marquee', roleIntent: 'Rotating announcement ticker. Chrome, rarely varies.',
        content: 'none', needsMedia: false,
        fields: ['marquee_text_one', 'marquee_text_two', 'marquee_text_three', 'section_enabled'],
      },
      {
        key: 'section_statistics.stat_1', kind: 'numbered', sectionType: 'temp-stats',
        role: 'Stat 1', roleIntent: 'One proof point with a number, a percentage, or a concrete fact.',
        content: 'claim', needsMedia: false, number: 1, group: 'section_statistics',
        fields: ['icon', 'percentage', 'gray_subtext', 'black_text'],
      },
      {
        key: 'section_statistics.stat_2', kind: 'numbered', sectionType: 'temp-stats',
        role: 'Stat 2', roleIntent: 'One proof point with a number, a percentage, or a concrete fact.',
        content: 'claim', needsMedia: false, number: 2, group: 'section_statistics',
        fields: ['icon', 'percentage', 'gray_subtext', 'black_text'],
      },
      {
        key: 'section_statistics.stat_3', kind: 'numbered', sectionType: 'temp-stats',
        role: 'Stat 3', roleIntent: 'One proof point with a number, a percentage, or a concrete fact.',
        content: 'claim', needsMedia: false, number: 3, group: 'section_statistics',
        fields: ['icon', 'percentage', 'gray_subtext', 'black_text'],
      },
      {
        key: 'section_2_bts_2_accordtion', kind: 'repeater', sectionType: 'accordion-block',
        role: 'Agitate', roleIntent: 'Frame the problem set. Make the cost of ignoring it concrete.',
        content: 'objections', needsMedia: false,
        fields: ['header', 'subheader', 'image', 'nutrient_deficiencies[]'],
      },
      {
        key: 'section_science_tabs', kind: 'repeater', sectionType: 'temp-science-module',
        role: 'Mechanism', roleIntent: 'Explain why the fix works, once, in plain terms. One tab per angle.',
        content: 'claims', needsMedia: true,
        fields: ['header', 'tabs[]'],
      },
      {
        key: 'section_image_with_text', kind: 'single', sectionType: 'image-with-text',
        role: 'Prove the benefit', roleIntent: 'One reason to believe, driven all the way home.',
        content: 'claim', needsMedia: true,
        fields: ['header', 'body', 'cta_text', 'image'],
      },
      {
        key: 'section_benefits', kind: 'repeater', sectionType: 'temp-benefits-split',
        role: 'Benefits', roleIntent: 'Remaining claims as a list of benefits.',
        content: 'claims', needsMedia: false,
        fields: ['header', 'body', 'button_label', 'button_cta', 'benefits[]'],
      },
      {
        key: 'section_bts_3_accodtion', kind: 'repeater', sectionType: 'accordion-block',
        role: 'Handle objections', roleIntent: 'Name the doubt in their words, then answer it plainly.',
        content: 'objections', needsMedia: false,
        fields: ['header', 'subheader', 'image', 'nutrient_deficiencies[]'],
      },
      {
        key: 'section_faq', kind: 'repeater', sectionType: 'faq',
        role: 'FAQ', roleIntent: 'Common questions from people who almost bought but did not.',
        content: 'objections', needsMedia: false,
        fields: ['list_of_faq_blocks[]'],
      },
      {
        key: 'last_module', kind: 'single', sectionType: 'temp-replo-hero',
        role: 'Close', roleIntent: 'Restate the single idea and ask for the order. H2, not H1.',
        content: 'close', needsMedia: true,
        fields: ['header', 'body', 'cta_copy', 'image'],
      },
      {
        key: 'main_product_for_purchase', kind: 'fixed', sectionType: 'standalone-product',
        role: 'Purchase', roleIntent: 'Product reference. Set once.',
        content: 'none', needsMedia: false,
        fields: ['product'],
      },
    ],
  },
}

export const ARCHETYPE_LIST: Archetype[] = Object.values(ARCHETYPES)

export function findArchetype(id: string): Archetype {
  return ARCHETYPES[id as ArchetypeId] ?? ARCHETYPES.listicle_a
}

export function isArchetypeId(value: unknown): value is ArchetypeId {
  return value === 'listicle_a' || value === 'standard'
}

/** Count of numbered slots that take claims. */
export function numberedClaimSlots(archetype: Archetype): number {
  return archetype.slots.filter(
    (s) => s.kind === 'numbered' && s.content === 'claim',
  ).length
}

/** All slots that are visible in the outline (not fixed). */
export function visibleSlots(archetype: Archetype): ArchetypeSlot[] {
  return archetype.slots.filter((s) => s.kind !== 'fixed')
}
