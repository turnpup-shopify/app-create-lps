import { z } from 'zod'
import { BriefSchema } from './brief'

/**
 * The new copy fields default rather than being required, so an outline saved
 * before the copy pass existed still reads back cleanly instead of failing
 * validation and looking like a corrupt row.
 */
export const HeadingsSchema = z
  .record(
    z.string(),
    z.object({
      heading: z.string(),
      note: z.string(),
      body: z.string().default(''),
      support: z.string().default(''),
      cta: z.string().default(''),
      items: z.array(z.object({ heading: z.string(), body: z.string().default('') })).default([]),
    }),
  )
  .default({})

/** The body both the create and the update route accept. */
export const SavedOutlineSchema = z.object({
  name: z.string().trim().min(1).max(200),
  brief: BriefSchema,
  headings: HeadingsSchema,
})

export type SavedOutlineInput = z.infer<typeof SavedOutlineSchema>
