import { describe, expect, it } from 'vitest'
import { findDatabaseUrl, missingUrlReason } from '@/lib/db/url'

const PG = 'postgres://user:pass@host:5432/db'

describe('findDatabaseUrl', () => {
  it('prefers DATABASE_URL', () => {
    const found = findDatabaseUrl({ DATABASE_URL: PG, POSTGRES_URL: 'postgres://other/db' })
    expect(found).toEqual({ url: PG, name: 'DATABASE_URL' })
  })

  it('accepts POSTGRES_URL, which is what Vercel and Supabase actually set', () => {
    expect(findDatabaseUrl({ POSTGRES_URL: PG })).toEqual({ url: PG, name: 'POSTGRES_URL' })
  })

  it('accepts the prisma and non pooling variants', () => {
    expect(findDatabaseUrl({ POSTGRES_PRISMA_URL: PG })?.name).toBe('POSTGRES_PRISMA_URL')
    expect(findDatabaseUrl({ POSTGRES_URL_NON_POOLING: PG })?.name).toBe('POSTGRES_URL_NON_POOLING')
  })

  it('takes postgresql as well as postgres', () => {
    expect(findDatabaseUrl({ DATABASE_URL: 'postgresql://user@host/db' })?.name).toBe('DATABASE_URL')
  })

  it('never hands the driver the Supabase API endpoint', () => {
    // SUPABASE_URL is the REST endpoint, not a connection string. Passing it on
    // would fail somewhere far from the cause.
    expect(findDatabaseUrl({ SUPABASE_URL: 'https://abc.supabase.co' })).toBeNull()
  })

  it('skips a variable holding something that is not a postgres address', () => {
    expect(findDatabaseUrl({ DATABASE_URL: 'https://abc.supabase.co', POSTGRES_URL: PG })?.name).toBe('POSTGRES_URL')
  })

  it('ignores an empty or blank value', () => {
    expect(findDatabaseUrl({ DATABASE_URL: '   ', POSTGRES_URL: PG })?.name).toBe('POSTGRES_URL')
    expect(findDatabaseUrl({})).toBeNull()
  })

  it('trims a value that picked up whitespace on the way in', () => {
    expect(findDatabaseUrl({ DATABASE_URL: ` ${PG} ` })?.url).toBe(PG)
  })
})

describe('missingUrlReason', () => {
  it('names the variable that holds the wrong sort of value', () => {
    const reason = missingUrlReason('Saved outlines are unavailable', { DATABASE_URL: 'https://abc.supabase.co' })
    expect(reason).toContain('DATABASE_URL')
    expect(reason).toContain('postgres')
  })

  it('explains why SUPABASE_URL cannot stand in', () => {
    const reason = missingUrlReason('Saved outlines are unavailable', { SUPABASE_URL: 'https://abc.supabase.co' })
    expect(reason).toContain('API endpoint')
  })

  it('asks for DATABASE_URL when there is nothing to go on', () => {
    expect(missingUrlReason('Saved outlines are unavailable', {})).toContain('Add DATABASE_URL')
  })

  it('takes the lead from the caller so each screen reads right', () => {
    expect(missingUrlReason('This outline cannot be read', {})).toMatch(/^This outline cannot be read because/)
  })

  it('obeys the punctuation rule, like every other string a writer reads', () => {
    const envs = [{}, { SUPABASE_URL: 'https://abc.supabase.co' }, { DATABASE_URL: 'nonsense' }]
    for (const env of envs) {
      expect(missingUrlReason('Saved outlines are unavailable', env)).not.toMatch(/[-–—;:]/)
    }
  })
})
