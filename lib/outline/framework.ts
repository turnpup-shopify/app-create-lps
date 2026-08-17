import { AWARENESS, type AwarenessStage } from './awareness'
import { GOALS, type Goal } from './goals'
import { SPINE_LIST, type Spine } from './spines'

/**
 * The editorial layer. Every string in here is a judgement a writer may want to
 * argue with, so all of it can come from the sheet. The mechanism that consumes
 * it stays in code.
 */

/** A section the assembly adds itself, rather than one the spine supplies. */
export interface MechanicSection {
  id: string
  role: string
  job: string
}

export interface Framework {
  awareness: AwarenessStage[]
  spines: Spine[]
  goals: Goal[]
  sections: MechanicSection[]
  /** Substrings that push a worry's own section after the offer. */
  lateTags: string[]
}

/**
 * Ids the assembly looks up by name. `close` carries only a role because the
 * page goal supplies its job.
 */
export const MECHANIC_IDS = {
  proof: 'proof',
  offer: 'offer',
  faq: 'faq',
  close: 'close',
  ownEarly: 'own.early',
  ownLate: 'own.late',
} as const

export const REQUIRED_MECHANIC_IDS: string[] = Object.values(MECHANIC_IDS)

/** Built in default. A Sections tab in the sheet overrides this. */
export const DEFAULT_SECTIONS: MechanicSection[] = [
  {
    id: MECHANIC_IDS.proof,
    role: 'Proof',
    job: 'Evidence a skeptic would accept. Numbers, names, or a demonstration.',
  },
  {
    id: MECHANIC_IDS.offer,
    role: 'The offer',
    job: 'What they get, what it costs, what happens next.',
  },
  {
    id: MECHANIC_IDS.faq,
    role: 'Questions',
    job: 'On the record without stealing a section.',
  },
  {
    id: MECHANIC_IDS.close,
    role: 'Close',
    job: '',
  },
  {
    id: MECHANIC_IDS.ownEarly,
    role: 'Clears a worry',
    job: 'Answer it before they scroll past.',
  },
  {
    id: MECHANIC_IDS.ownLate,
    role: 'Removes risk',
    job: 'Sits after the price so the worry never leaves the page.',
  },
]

/**
 * Money and risk worries sit after the price. Everything else sits before it.
 * Matched on substring, case insensitive.
 */
export const DEFAULT_LATE_TAGS = ['price', 'risk', 'money', 'guarantee', 'refund', 'shipping', 'warranty']

export const DEFAULT_FRAMEWORK: Framework = {
  awareness: AWARENESS,
  spines: SPINE_LIST,
  goals: GOALS,
  sections: DEFAULT_SECTIONS,
  lateTags: DEFAULT_LATE_TAGS,
}

/** Which slice of the framework came from the sheet and which fell back. */
export type FrameworkSlice = 'awareness' | 'spines' | 'goals' | 'sections' | 'settings'
export type FrameworkSource = 'sheet' | 'built in'
export type FrameworkSources = Record<FrameworkSlice, FrameworkSource>

export const ALL_BUILT_IN: FrameworkSources = {
  awareness: 'built in',
  spines: 'built in',
  goals: 'built in',
  sections: 'built in',
  settings: 'built in',
}

/**
 * A mechanic section by id. Falls back to the built in entry, then to a plain
 * one, so a thin Sections tab can never crash the assembly.
 */
export function findMechanic(id: string, framework: Framework = DEFAULT_FRAMEWORK): MechanicSection {
  return (
    framework.sections.find((section) => section.id === id) ??
    DEFAULT_SECTIONS.find((section) => section.id === id) ?? { id, role: id, job: '' }
  )
}
