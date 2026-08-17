export type GoalId = 'buy' | 'email' | 'book' | 'quote'

export interface Goal {
  id: GoalId
  label: string
}

export const GOALS: Goal[] = [
  { id: 'buy', label: 'Buy now' },
  { id: 'email', label: 'Capture email' },
  { id: 'book', label: 'Book a call' },
  { id: 'quote', label: 'Request a quote' },
]

export const DEFAULT_GOAL: GoalId = 'buy'

export function findGoal(id: string): Goal {
  return GOALS.find((goal) => goal.id === id) ?? GOALS[0]
}

export function isGoalId(value: unknown): value is GoalId {
  return GOALS.some((goal) => goal.id === value)
}

/** The job of the close depends on what the page is asking for. */
export function closeJob(goal: string): string {
  if (goal === 'email') return 'One field and one reason to hand it over.'
  if (goal === 'book') return 'Show what happens on the call so booking feels small.'
  if (goal === 'quote') return 'Say what you need from them and how fast you reply.'
  return 'Restate the benefit and the guarantee. One button.'
}
