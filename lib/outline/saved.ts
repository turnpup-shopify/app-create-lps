import { z } from 'zod'
import { BriefSchema } from './brief'

export const HeadingsSchema = z
  .record(z.string(), z.object({ heading: z.string(), note: z.string() }))
  .default({})

/** The body both the create and the update route accept. */
export const SavedOutlineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brief: BriefSchema,
  headings: HeadingsSchema,
})

export type SavedOutlineInput = z.infer<typeof SavedOutlineSchema>
