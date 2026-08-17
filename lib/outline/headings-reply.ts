import { z } from 'zod'
import { scrub } from './scrub'

export interface WrittenHeading {
  id: string
  heading: string
  note: string
}

const ReplySchema = z
  .array(
    z.object({
      id: z.string().min(1),
      heading: z.string().min(1),
      note: z.string().min(1),
    }),
  )
  .min(1)

/**
 * Models sometimes wrap the array in fences or prose. Take the outermost array
 * and nothing else.
 */
export function extractArray(text: string): string {
  const stripped = text
    .replace(/```json/gi, '')
    .replace(/```/g, '')
    .trim()
  const open = stripped.indexOf('[')
  const close = stripped.lastIndexOf(']')
  if (open === -1 || close <= open) return stripped
  return stripped.slice(open, close + 1)
}

/**
 * Turn a model reply into headings, or null when it cannot be used so the
 * caller can retry. Ids the structure does not have are dropped, and the
 * punctuation rule is enforced rather than trusted.
 */
export function parseHeadingsReply(text: string, known: Set<string>): WrittenHeading[] | null {
  let raw: unknown
  try {
    raw = JSON.parse(extractArray(text))
  } catch {
    return null
  }

  const candidate = ReplySchema.safeParse(raw)
  if (!candidate.success) return null

  const seen = new Set<string>()
  const headings: WrittenHeading[] = []

  for (const entry of candidate.data) {
    if (!known.has(entry.id) || seen.has(entry.id)) continue
    const heading = scrub(entry.heading)
    const note = scrub(entry.note)
    if (!heading || !note) continue
    seen.add(entry.id)
    headings.push({ id: entry.id, heading, note })
  }

  return headings.length > 0 ? headings : null
}
