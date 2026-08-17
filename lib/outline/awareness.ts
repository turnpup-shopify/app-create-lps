export type AwarenessId = string

export interface AwarenessStage {
  id: AwarenessId
  label: string
  /** What the H1 has to do. Follows from the traffic, never from the spine. */
  lead: string
  /** Why that lead, in one or two sentences. */
  why: string
  /** The id of the spine the stage picks by default. */
  spine: string
}

/** Built in default. An Awareness tab in the sheet overrides this. */
export const AWARENESS: AwarenessStage[] = [
  {
    id: 'unaware',
    label: 'Unaware',
    lead: 'Lead with the situation',
    why: 'They do not know they have a problem. A benefit means nothing yet. Open with a moment they recognize.',
    spine: 'story',
  },
  {
    id: 'problem',
    label: 'Problem aware',
    lead: 'Lead with the pain',
    why: 'They feel it and have not named a fix. Name the pain better than they can, then raise the cost of leaving it alone.',
    spine: 'pas',
  },
  {
    id: 'solution',
    label: 'Solution aware',
    lead: 'Lead with the approach',
    why: 'They are comparing categories of fix. Win on why your method beats the other methods, not on the pain.',
    spine: 'comparison',
  },
  {
    id: 'product',
    label: 'Product aware',
    lead: 'Lead with the benefit',
    why: 'They know the product exists and are weighing it. Benefit plus proof up top, worries handled fast.',
    spine: 'aida',
  },
  {
    id: 'most',
    label: 'Most aware',
    lead: 'Lead with the offer',
    why: 'They are ready. Extra persuasion adds friction. Price, terms, urgency, done.',
    spine: 'offer',
  },
]

export const DEFAULT_AWARENESS: AwarenessId = 'problem'

export function findStage(id: string, stages: AwarenessStage[] = AWARENESS): AwarenessStage {
  const found = stages.find((stage) => stage.id === id)
  if (found) return found
  return stages.find((stage) => stage.id === DEFAULT_AWARENESS) ?? stages[0] ?? AWARENESS[1]
}

export function isAwarenessId(value: unknown, stages: AwarenessStage[] = AWARENESS): value is AwarenessId {
  return typeof value === 'string' && stages.some((stage) => stage.id === value)
}
