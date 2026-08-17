export type GoalId = string

export interface Goal {
  id: GoalId
  label: string
  /** What the close has to do when this is the page goal. */
  close: string
}

/** Built in default. A Goals tab in the sheet overrides this. */
export const GOALS: Goal[] = [
  { id: 'buy', label: 'Buy now', close: 'Restate the benefit and the guarantee. One button.' },
  { id: 'email', label: 'Capture email', close: 'One field and one reason to hand it over.' },
  { id: 'book', label: 'Book a call', close: 'Show what happens on the call so booking feels small.' },
  { id: 'quote', label: 'Request a quote', close: 'Say what you need from them and how fast you reply.' },
]

export const DEFAULT_GOAL: GoalId = 'buy'

export function findGoal(id: string, goals: Goal[] = GOALS): Goal {
  return goals.find((goal) => goal.id === id) ?? goals[0] ?? GOALS[0]
}

export function isGoalId(value: unknown, goals: Goal[] = GOALS): value is GoalId {
  return typeof value === 'string' && goals.some((goal) => goal.id === value)
}

/** The job of the close depends on what the page is asking for. */
export function closeJob(goal: string, goals: Goal[] = GOALS): string {
  return findGoal(goal, goals).close
}
