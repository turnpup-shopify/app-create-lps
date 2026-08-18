/**
 * Turning a driver failure into a sentence a reader can act on.
 *
 * "Check the database address" is the wrong advice for most of these. The
 * address is usually fine and the table is missing, or the password is wrong,
 * or TLS is refusing. Each of those has a different next step, and the driver
 * already knows which one it hit.
 */

/**
 * Drizzle wraps the driver error, so what arrives here is a `Failed query`
 * Error carrying no code, with the real postgres error on `cause`. Reading only
 * the outer one sends every failure to the generic sentence.
 */
function chain(error: unknown): unknown[] {
  const seen: unknown[] = []
  let current = error
  while (current && typeof current === 'object' && seen.length < 5) {
    seen.push(current)
    current = (current as { cause?: unknown }).cause
  }
  return seen.length > 0 ? seen : [error]
}

/** Postgres sends a five character SQLSTATE. postgres.js puts it on `code`. */
function codeOf(error: unknown): string {
  for (const link of chain(error)) {
    if (link && typeof link === 'object' && 'code' in link) {
      const code = (link as { code?: unknown }).code
      if (typeof code === 'string') return code
    }
  }
  return ''
}

function messageOf(error: unknown): string {
  if (typeof error === 'string') return error
  return chain(error)
    .map((link) => (link instanceof Error ? link.message : ''))
    .filter(Boolean)
    .join(' ')
}

const MIGRATION = 'Run npm run db:push against it, or apply drizzle/0000_outlines.sql, then reload.'

/**
 * What went wrong and what to do about it. `lead` names the thing that failed,
 * so each screen reads right.
 */
export function describeDbError(error: unknown, lead = 'The saved outlines could not be read'): string {
  const code = codeOf(error)
  const message = messageOf(error).toLowerCase()

  // The table is missing. Overwhelmingly the common case on a fresh database,
  // because creating one and migrating it are separate steps.
  if (code === '42P01' || message.includes('does not exist" relation') || message.includes('relation "outlines"')) {
    return `${lead} because the outlines table is not in the database. ${MIGRATION}`
  }

  if (code === '3D000') {
    return `${lead} because the address names a database that does not exist. Check the database name at the end of the connection string, then reload.`
  }

  if (code === '28P01' || code === '28000') {
    return `${lead} because the database refused the user or password in the address. Copy the connection string again from your database dashboard, then reload.`
  }

  if (code === '42501') {
    return `${lead} because the database user may not read the outlines table. Grant it access, then reload.`
  }

  if (code === '53300') {
    return `${lead} because the database has no connection slots left. Use the pooled connection string rather than the direct one, then reload.`
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return `${lead} because the host in the address could not be found. Check the host part of the connection string, then reload.`
  }

  if (code === 'ECONNREFUSED') {
    return `${lead} because the database refused the connection. Check the host and port in the address and that the database is running, then reload.`
  }

  if (code === 'ETIMEDOUT' || code === 'CONNECT_TIMEOUT' || message.includes('timeout')) {
    return `${lead} because the database did not answer in time. Check that it is running and reachable from here, then reload.`
  }

  if (
    code === 'SELF_SIGNED_CERT_IN_CHAIN' ||
    code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' ||
    message.includes('self signed certificate') ||
    message.includes('self-signed certificate')
  ) {
    return `${lead} because the database certificate could not be verified. Add sslmode=require to the connection string, then reload.`
  }

  if (message.includes('does not support ssl') || message.includes('server does not support ssl')) {
    return `${lead} because the database does not accept TLS on that port. Remove sslmode from the connection string, then reload.`
  }

  return `${lead}. Check the database address, then reload.`
}

/**
 * The real error goes to the server log. Without it the deployment log says
 * nothing and the reader is left guessing at whatever the sentence above
 * could not narrow down.
 */
export function logDbError(where: string, error: unknown): void {
  console.error(`[db] ${where} failed`, error)
}
