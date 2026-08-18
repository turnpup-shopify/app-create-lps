import { z } from 'zod'
import { DEFAULT_AWARENESS, findStage, isAwarenessId, type AwarenessId } from './awareness'
import { DEFAULT_FRAMEWORK, type Framework } from './framework'
import { DEFAULT_GOAL, findGoal, isGoalId, type GoalId } from './goals'
import { findSectionType } from './section-types'
import { findSpine, isSpineId, type SpineId } from './spines'
import type { Assignments, Claim, Product, Repository, Section, Worry } from './types'

/**
 * What a saved outline stores. Ids, never labels, so a sheet edit flows through.
 */
export interface Brief {
  idea: string
  audience: string
  /** Product handles. */
  products: string[]
  /** Claim ids. First one selected is the lead claim. */
  claims: string[]
  /** Worry ids in play. */
  worries: string[]
  assignments: Assignments
  awareness: AwarenessId
  goal: GoalId
  /** Empty string means keep the spine the stage picked. */
  spineOverride: SpineId | ''
  /** Section ids in the order the writer wants. */
  order: string[]
}

export const BriefSchema = z.object({
  idea: z.string().default(''),
  audience: z.string().default(''),
  products: z.array(z.string()).default([]),
  claims: z.array(z.string()).default([]),
  worries: z.array(z.string()).default([]),
  assignments: z.record(z.string(), z.string()).default({}),
  awareness: z.string().default(DEFAULT_AWARENESS),
  goal: z.string().default(DEFAULT_GOAL),
  spineOverride: z.string().default(''),
  order: z.array(z.string()).default([]),
})

export function emptyBrief(): Brief {
  return {
    idea: '',
    audience: '',
    products: [],
    claims: [],
    worries: [],
    assignments: {},
    awareness: DEFAULT_AWARENESS,
    goal: DEFAULT_GOAL,
    spineOverride: '',
    order: [],
  }
}

/**
 * Coerce anything read out of the database into a usable brief.
 *
 * Stage, goal and spine ids are kept exactly as stored, even when they are not
 * in the framework currently in force. The framework can come from the sheet,
 * and the server has not read the sheet when this runs, so coercing here would
 * quietly rewrite a brief to the built in defaults every time it was saved.
 * The lookups fall back at render time instead, which is reversible.
 */
export function normalizeBrief(value: unknown): Brief {
  const parsed = BriefSchema.safeParse(value)
  if (!parsed.success) return emptyBrief()
  return parsed.data
}

/** The stage, goal and spine a brief resolves to under a given framework. */
export function resolveBrief(brief: Brief, framework: Framework = DEFAULT_FRAMEWORK) {
  return {
    stage: findStage(brief.awareness, framework.awareness),
    goal: findGoal(brief.goal, framework.goals),
    spine: findSpine(activeSpine(brief, framework), framework.spines),
    /** Empty when the stored override is not in this framework. */
    override: isSpineId(brief.spineOverride, framework.spines) ? brief.spineOverride : '',
  }
}

/**
 * The spine in force. The override never changes the lead, and an override
 * pointing at a spine the sheet no longer has falls back to the stage's own.
 */
export function activeSpine(
  brief: Pick<Brief, 'awareness' | 'spineOverride'>,
  framework: Framework = DEFAULT_FRAMEWORK,
): SpineId {
  if (brief.spineOverride && isSpineId(brief.spineOverride, framework.spines)) return brief.spineOverride
  return findStage(brief.awareness, framework.awareness).spine
}

export interface MissingIds {
  products: string[]
  claims: string[]
  worries: string[]
}

/**
 * Ids the brief references that the sheet no longer has. Shown as struck rows
 * rather than crashing or silently dropped.
 */
export function missingIds(brief: Brief, repository: Repository): MissingIds {
  const products = new Set(repository.products.map((product) => product.id))
  const claims = new Set(repository.claims.map((claim) => claim.id))
  const worries = new Set(repository.worries.map((worry) => worry.id))
  return {
    products: brief.products.filter((id) => !products.has(id)),
    claims: brief.claims.filter((id) => !claims.has(id)),
    worries: brief.worries.filter((id) => !worries.has(id)),
  }
}

/** Selected items, in selection order, skipping ids the sheet no longer has. */
export function selectedProducts(brief: Brief, repository: Repository): Product[] {
  const byId = new Map(repository.products.map((product) => [product.id, product]))
  return brief.products.map((id) => byId.get(id)).filter((product): product is Product => Boolean(product))
}

export function selectedClaims(brief: Brief, repository: Repository): Claim[] {
  const byId = new Map(repository.claims.map((claim) => [claim.id, claim]))
  return brief.claims.map((id) => byId.get(id)).filter((claim): claim is Claim => Boolean(claim))
}

export function selectedWorries(brief: Brief, repository: Repository): Worry[] {
  const byId = new Map(repository.worries.map((worry) => [worry.id, worry]))
  return brief.worries.map((id) => byId.get(id)).filter((worry): worry is Worry => Boolean(worry))
}

/** The JSON block the heading prompt receives. */
export interface HeadingBrief {
  pageIdea: string
  audience: string
  products: string[]
  awarenessStage: string
  leadInstruction: string
  spine: string
  pageGoal: string
  leadClaim: string | null
  claims: { claim: string; support: string }[]
  slots: {
    id: string
    level: 'H1' | 'H2'
    role: string
    job: string
    ownSection: boolean
    worries: { worry: string; answer: string }[]
    /** Which Shopify section renders this, so the copy fits the container. */
    sectionType: string
    /** Which slots to write. Anything not listed is discarded on the way back. */
    write: string[]
    /** How many H3 items to write. Zero means this section renders none. */
    items: { min: number; max: number }
  }[]
}

export function toHeadingBrief(
  brief: Brief,
  repository: Repository,
  sections: Section[],
  framework: Framework = DEFAULT_FRAMEWORK,
): HeadingBrief {
  const stage = findStage(brief.awareness, framework.awareness)
  const spine = findSpine(activeSpine(brief, framework), framework.spines)
  const claims = selectedClaims(brief, repository)

  return {
    pageIdea: brief.idea.trim() || 'not stated',
    audience: brief.audience.trim() || 'not stated',
    products: selectedProducts(brief, repository).map((product) => product.label),
    awarenessStage: stage.label,
    leadInstruction: stage.lead,
    spine: spine.name,
    pageGoal: findGoal(brief.goal, framework.goals).label,
    leadClaim: claims[0]?.label ?? null,
    claims: claims.map((claim) => ({ claim: claim.label, support: claim.detail })),
    slots: sections.map((section) => {
      const type = findSectionType(section.typeId)
      return {
        id: section.id,
        level: section.level === 1 ? ('H1' as const) : ('H2' as const),
        role: section.role,
        job: section.job,
        ownSection: section.kind === 'objection',
        worries: section.worries.map((worry) => ({ worry: worry.label, answer: worry.detail })),
        sectionType: type.label,
        write: type.slots,
        items: { min: type.minItems, max: type.maxItems },
      }
    }),
  }
}
