export type SpineId = string

export interface Slot {
  key: string
  role: string
  /** An instruction to the writer. */
  job: string
}

export interface Spine {
  id: SpineId
  name: string
  note: string
  slots: Slot[]
}

/** Spine slot ids are namespaced so they never collide with a fixed slot. */
export const spineSlotId = (key: string) => `spine-${key}`

/** Built in default. Spines and Slots tabs in the sheet override this. */
export const SPINES: Record<string, Spine> = {
  pas: {
    id: 'pas',
    name: 'Problem Agitate Solution',
    note: 'Strongest when the pain is already felt.',
    slots: [
      { key: 'problem', role: 'Problem', job: 'Name the pain in their words. No product yet.' },
      { key: 'agitate', role: 'Agitate', job: 'Show the cost of leaving it alone. Make the stakes concrete.' },
      { key: 'solution', role: 'Solution', job: 'Introduce the product as the release. Lead claim goes here.' },
      { key: 'how', role: 'How it works', job: 'Make the mechanism believable in three steps or fewer.' },
    ],
  },
  aida: {
    id: 'aida',
    name: 'Attention Interest Desire Action',
    note: 'Strongest when they already know the product exists.',
    slots: [
      { key: 'attention', role: 'Attention', job: 'The single benefit, stated as a claim they can picture.' },
      { key: 'interest', role: 'Interest', job: 'Widen the benefit. What changes in their day.' },
      { key: 'desire', role: 'Desire', job: 'Proof plus specifics. Make wanting it feel safe.' },
      { key: 'how', role: 'How it works', job: 'Short mechanism so the benefit holds up.' },
    ],
  },
  comparison: {
    id: 'comparison',
    name: 'Old way against new way',
    note: 'Strongest in a crowded category where they are shopping methods.',
    slots: [
      { key: 'oldway', role: 'Why the usual fix fails', job: 'Retire the alternative without naming a brand.' },
      { key: 'newway', role: 'The different approach', job: 'Name your method. One sentence a reader could repeat.' },
      { key: 'how', role: 'How it works', job: 'The mechanism. This is the whole argument, so give it room.' },
      { key: 'sidebyside', role: 'Side by side', job: 'A table or split that makes the gap obvious.' },
    ],
  },
  bab: {
    id: 'bab',
    name: 'Before After Bridge',
    note: 'Strongest when the sale is a transformation.',
    slots: [
      { key: 'before', role: 'Before', job: 'Their world today, in detail, without judgment.' },
      { key: 'after', role: 'After', job: 'Their world with it. Sensory, specific, not adjectives.' },
      { key: 'bridge', role: 'Bridge', job: 'The product as the crossing. Lead claim goes here.' },
      { key: 'how', role: 'How it works', job: 'Make the crossing believable.' },
    ],
  },
  story: {
    id: 'story',
    name: 'Story led',
    note: 'Strongest when they do not yet know a problem exists.',
    slots: [
      { key: 'hook', role: 'Hook', job: 'A moment or a fact that stops them. No pitch.' },
      { key: 'reveal', role: 'The hidden problem', job: 'Turn the moment into a problem they now recognize.' },
      { key: 'stakes', role: 'What it costs', job: 'Why it matters more than they assumed.' },
      { key: 'solution', role: 'The fix', job: 'First mention of the product. Lead claim goes here.' },
    ],
  },
  offer: {
    id: 'offer',
    name: 'Offer led',
    note: 'Strongest for the ready to buy. Keep it short.',
    slots: [
      { key: 'offer', role: 'The offer', job: 'What they get and what it costs. Nothing else.' },
      { key: 'whynow', role: 'Why now', job: 'One real reason to act today.' },
    ],
  },
}

export const SPINE_LIST: Spine[] = Object.values(SPINES)

export function findSpine(id: string, spines: Spine[] = SPINE_LIST): Spine {
  return spines.find((spine) => spine.id === id) ?? spines[0] ?? SPINE_LIST[0]
}

export function isSpineId(value: unknown, spines: Spine[] = SPINE_LIST): value is SpineId {
  return typeof value === 'string' && spines.some((spine) => spine.id === value)
}
