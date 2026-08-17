import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { outlines } from './schema'

export { outlines }
export type { OutlineRow } from './schema'

type Db = ReturnType<typeof drizzle<{ outlines: typeof outlines }>>

let cached: Db | null = null

export function hasDatabase(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

export class MissingDatabaseError extends Error {
  constructor() {
    super('DATABASE_URL is not set, so saved outlines cannot be read or written. Add it to the environment and reload.')
    this.name = 'MissingDatabaseError'
  }
}

/**
 * One connection, reused across requests. `prepare: false` keeps this working
 * behind a pooler, which is how Vercel Postgres and Neon are usually reached.
 */
export function getDb(): Db {
  const url = process.env.DATABASE_URL
  if (!url) throw new MissingDatabaseError()
  if (cached) return cached
  const client = postgres(url, { max: 1, prepare: false })
  cached = drizzle(client, { schema: { outlines } })
  return cached
}
