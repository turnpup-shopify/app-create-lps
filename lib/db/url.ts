/**
 * Which environment variable holds the database address.
 *
 * DATABASE_URL is the name this app documents, but nothing sets it by itself.
 * The Vercel Postgres and Supabase integrations both write POSTGRES_URL, and
 * the Prisma and non pooling variants come along with it, so a deployment that
 * looks correctly configured in the Vercel dashboard would otherwise report no
 * database at all.
 */
export const URL_NAMES = [
  'DATABASE_URL',
  'POSTGRES_URL',
  'POSTGRES_PRISMA_URL',
  'POSTGRES_URL_NON_POOLING',
] as const

/** Schemes postgres.js can actually dial. */
const POSTGRES_SCHEME = /^postgres(ql)?:\/\//i

/** Just the shape this reads, so a test can pass a few names. */
export type Env = Record<string, string | undefined>

export interface DatabaseUrl {
  url: string
  /** The variable it came from, so the interface can say which one is in force. */
  name: string
}

/**
 * The first usable address, and the name it came from.
 *
 * A value that is not a postgres address is skipped rather than handed to the
 * driver. SUPABASE_URL is the common case: it holds the REST endpoint
 * (https://<project>.supabase.co), not a connection string, and passing it on
 * would fail somewhere far from the cause.
 */
export function findDatabaseUrl(env: Env = process.env): DatabaseUrl | null {
  for (const name of URL_NAMES) {
    const value = env[name]?.trim()
    if (value && POSTGRES_SCHEME.test(value)) return { url: value, name }
  }
  return null
}

/**
 * Why there is no address, in a sentence a reader can act on. Names the wrong
 * looking value when there is one, because "no database address is set" is
 * misleading when the writer can see a database address in their dashboard.
 */
export function missingUrlReason(
  lead = 'Saved outlines are unavailable',
  env: Env = process.env,
): string {
  const wrong = URL_NAMES.map((name) => [name, env[name]?.trim()] as const).find(
    ([, value]) => value && !POSTGRES_SCHEME.test(value),
  )
  if (wrong) {
    return `${lead} because ${wrong[0]} does not hold a postgres address. Set it to a connection string starting postgres and reload.`
  }
  if (env.SUPABASE_URL) {
    return `${lead} because no database address is set. SUPABASE_URL holds the API endpoint rather than a connection string, so it cannot be used here. Copy the Supabase connection string into DATABASE_URL and reload.`
  }
  return `${lead} because no database address is set. Add DATABASE_URL to the environment and reload.`
}
