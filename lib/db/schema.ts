import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import type { Brief } from '@/lib/outline/brief'
import type { Headings } from '@/lib/outline/types'

export const outlines = pgTable('outlines', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  brief: jsonb('brief').$type<Brief>().notNull(),
  headings: jsonb('headings').$type<Headings>().notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export type OutlineRow = typeof outlines.$inferSelect
