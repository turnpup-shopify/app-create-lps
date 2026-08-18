import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { outlines } from './schema'
import { findDatabaseUrl, missingUrlReason } from './url'

export { outlines }
export type { OutlineRow } from './schema'
export { findDatabaseUrl, missingUrlReason, URL_NAMES } from './url'
export { describeDbError, logDbError } from './errors'

type Db = ReturnType<typeof drizzle<{ outlines: typeof outlines }>>

let cached: Db | null = null

export function hasDatabase(): boolean {
  return findDatabaseUrl() !== null
}

export class MissingDatabaseError extends Error {
  constructor(message: string = missingUrlReason()) {
    super(message)
    this.name = 'MissingDatabaseError'
  }
}

/**
 * One connection, reused across requests. `prepare: false` keeps this working
 * behind a pooler, which is how Vercel Postgres, Supabase and Neon are usually
 * reached, and is required by the Supabase transaction mode pooler.
 */
export function getDb(): Db {
  const found = findDatabaseUrl()
  if (!found) throw new MissingDatabaseError()
  if (cached) return cached
  const client = postgres(found.url, { max: 1, prepare: false })
  cached = drizzle(client, { schema: { outlines } })
  return cached
}
